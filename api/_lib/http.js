export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';

function header(req, name) {
  const value = req?.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function originForRequest(req) {
  const origin = header(req, 'origin');
  if (!origin) return null;

  const configured = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (configured.includes(origin)) return origin;

  const forwardedProto = header(req, 'x-forwarded-proto') || (isProduction ? 'https' : 'http');
  const host = header(req, 'x-forwarded-host') || header(req, 'host');
  return host && `${forwardedProto}://${host}` === origin ? origin : null;
}

export function applyHeaders(req, res, extra = {}) {
  const origin = originForRequest(req);
  const headers = {
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Vary': 'Origin',
    ...extra,
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
  return origin;
}

export function handleOptions(req, res) {
  applyHeaders(req, res, {
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
    'Access-Control-Max-Age': '600',
  });
  res.status(204).end();
}

export function json(req, res, status, payload, extraHeaders = {}) {
  applyHeaders(req, res, { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders });
  res.status(status).json(payload);
}

export function noContent(req, res, status = 204, extraHeaders = {}) {
  applyHeaders(req, res, extraHeaders);
  res.status(status).end();
}

export function methodNotAllowed(req, res, methods) {
  json(req, res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' } }, {
    Allow: methods.join(', '),
  });
}

export function requireMethod(req, res, method) {
  if (req.method === 'OPTIONS') {
    handleOptions(req, res);
    return false;
  }
  if (req.method !== method) {
    methodNotAllowed(req, res, [method, 'OPTIONS']);
    return false;
  }
  return true;
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
    }
  }

  const raw = await readBuffer(req, 1024 * 1024);
  if (!raw.length) return {};
  try {
    return JSON.parse(raw.toString('utf8'));
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
  }
}

export async function readBuffer(req, maxBytes) {
  if (Buffer.isBuffer(req.body)) {
    if (req.body.length > maxBytes) throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Upload is too large.');
    return req.body;
  }
  if (typeof req.body === 'string') {
    const buffer = Buffer.from(req.body);
    if (buffer.length > maxBytes) throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Upload is too large.');
    return buffer;
  }

  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Upload is too large.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export function cookies(req) {
  const value = header(req, 'cookie') || '';
  return Object.fromEntries(value.split(';').map((part) => {
    const index = part.indexOf('=');
    if (index < 0) return ['', ''];
    let decoded = part.slice(index + 1).trim();
    try { decoded = decodeURIComponent(decoded); } catch { return ['', '']; }
    return [part.slice(0, index).trim(), decoded];
  }).filter(([key]) => key));
}

export function setSessionCookie(req, res, token, maxAge = 60 * 60 * 12) {
  const secure = isProduction || header(req, 'x-forwarded-proto') === 'https';
  res.setHeader('Set-Cookie', `cwm_admin_session=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`);
}

export function clearSessionCookie(req, res) {
  const secure = isProduction || header(req, 'x-forwarded-proto') === 'https';
  res.setHeader('Set-Cookie', `cwm_admin_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`);
}

export function sessionToken(req) {
  const authorization = header(req, 'authorization');
  const bearer = typeof authorization === 'string' && /^Bearer\s+(.+)$/i.exec(authorization)?.[1];
  const token = cookies(req).cwm_admin_session || bearer;
  return typeof token === 'string' && /^[a-f0-9]{64}$/i.test(token) ? token : null;
}

export function clientIdentifier(req) {
  const forwarded = header(req, 'x-forwarded-for') || header(req, 'x-real-ip') || 'unknown';
  const ip = String(forwarded).split(',')[0].trim().slice(0, 80) || 'unknown';
  const userAgent = String(header(req, 'user-agent') || '').slice(0, 160);
  return `${ip}|${userAgent}`;
}

export async function endpoint(req, res, handler) {
  try {
    return await handler(req, res);
  } catch (error) {
    if (error instanceof ApiError) {
      const body = { error: { code: error.code, message: error.message } };
      if (error.details !== undefined) body.error.details = error.details;
      return json(req, res, error.status, body);
    }
    console.error('Unhandled API error', error);
    return json(req, res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } });
  }
}

export function assert(condition, status, code, message, details) {
  if (!condition) throw new ApiError(status, code, message, details);
}

export function stringField(value, name, { min = 0, max = 500, required = false } = {}) {
  assert(typeof value === 'string' || (!required && (value === null || value === undefined)), 400, 'INVALID_INPUT', `${name} must be text.`);
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  assert(trimmed.length >= min && trimmed.length <= max, 400, 'INVALID_INPUT', `${name} must be between ${min} and ${max} characters.`);
  return trimmed;
}

export function optionalString(value, name, options = {}) {
  return stringField(value, name, options);
}

export function uuid(value, name = 'id') {
  assert(typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value), 400, 'INVALID_INPUT', `${name} must be a valid UUID.`);
  return value;
}

export function isoDate(value, name, { required = false } = {}) {
  if (value === null || value === undefined || value === '') {
    assert(!required, 400, 'INVALID_INPUT', `${name} is required.`);
    return null;
  }
  assert(typeof value === 'string' && !Number.isNaN(Date.parse(value)), 400, 'INVALID_INPUT', `${name} must be a valid date.`);
  return new Date(value).toISOString();
}

export function positiveInteger(value, name) {
  assert(Number.isInteger(value) && value > 0, 400, 'INVALID_INPUT', `${name} must be a positive integer.`);
  return value;
}

export function nonNegativeNumber(value, name) {
  const number = typeof value === 'number' ? value : Number(value);
  assert(Number.isFinite(number) && number >= 0, 400, 'INVALID_INPUT', `${name} must be a non-negative number.`);
  return Math.round(number * 100) / 100;
}

export function email(value) {
  if (value === null || value === undefined || value === '') return null;
  const normalized = stringField(value, 'email', { min: 3, max: 254, required: true }).toLowerCase();
  assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized), 400, 'INVALID_INPUT', 'email must be valid.');
  return normalized;
}

export function phone(value) {
  const normalized = stringField(value, 'phone', { min: 7, max: 30, required: true });
  const digits = normalized.replace(/[^0-9]/g, '');
  assert(digits.length >= 7 && digits.length <= 15, 400, 'INVALID_INPUT', 'phone must contain between 7 and 15 digits.');
  return normalized;
}

export function pick(value, allowed, name) {
  assert(allowed.includes(value), 400, 'INVALID_INPUT', `${name} is invalid.`);
  return value;
}

export function routeParam(req, name) {
  const value = req.query?.[name];
  return Array.isArray(value) ? value[0] : value;
}
