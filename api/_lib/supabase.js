import { ApiError } from './http.js';

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new ApiError(500, 'CONFIG_ERROR', 'Supabase server configuration is missing.');
  return { url, key };
}

async function request(path, { method = 'GET', body, headers = '', accept = 'application/json' } = {}) {
  const { url, key } = config();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${url}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        ...(accept ? { Accept: accept } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(headers ? Object.fromEntries(headers.split('\n').map((line) => line.split(':'))) : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let parsed = null;
    if (text) {
      try { parsed = JSON.parse(text); } catch { parsed = text; }
    }
    if (!response.ok) {
      const rawMessage = typeof parsed === 'object' && parsed ? (parsed.message || parsed.details || parsed.hint) : parsed;
      const message = String(rawMessage || 'Supabase request failed.');
      const known = /^(EVENT_NOT_FOUND|REGISTRATION_CLOSED|EVENT_FULL|INVALID_PHONE|ALREADY_REGISTERED|PASSWORD_TOO_SHORT|TOO_MANY_ATTEMPTS|SETUP_REQUIRED|INVALID_PASSWORD)$/.exec(message);
      throw new ApiError(known ? 400 : response.status >= 500 ? 502 : 400, known ? known[1] : 'DATABASE_ERROR', known ? message.replaceAll('_', ' ').toLowerCase() : 'Unable to complete the request.', { upstreamStatus: response.status });
    }
    return parsed;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.name === 'AbortError') throw new ApiError(504, 'UPSTREAM_TIMEOUT', 'Supabase did not respond in time.');
    throw new ApiError(502, 'UPSTREAM_ERROR', 'Unable to reach Supabase.');
  } finally {
    clearTimeout(timeout);
  }
}

export function rpc(name, args) {
  return request(`/rest/v1/rpc/${encodeURIComponent(name)}`, { method: 'POST', body: args });
}

export function table(name, query = '', options = {}) {
  return request(`/rest/v1/${name}${query}`, options);
}

export function select(tableName, query) {
  return table(tableName, query);
}

export function insert(tableName, row) {
  return table(tableName, '', { method: 'POST', body: [row], headers: 'Prefer:return=representation' });
}

export function update(tableName, query, row) {
  return table(tableName, query, { method: 'PATCH', body: row, headers: 'Prefer:return=representation' });
}

export function remove(tableName, query) {
  return table(tableName, query, { method: 'DELETE', headers: 'Prefer:return=representation' });
}

export function storagePublicUrl(path) {
  return `${config().url}/storage/v1/object/public/event-images/${path.split('/').map(encodeURIComponent).join('/')}`;
}

export async function uploadObject(path, buffer, contentType) {
  const { url, key } = config();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${url}/storage/v1/object/event-images/${path.split('/').map(encodeURIComponent).join('/')}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: buffer,
    });
    if (!response.ok) throw new ApiError(response.status >= 500 ? 502 : 400, 'UPLOAD_FAILED', 'Unable to store the event image.');
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.name === 'AbortError') throw new ApiError(504, 'UPSTREAM_TIMEOUT', 'Image storage did not respond in time.');
    throw new ApiError(502, 'UPSTREAM_ERROR', 'Unable to reach image storage.');
  } finally {
    clearTimeout(timeout);
  }
}
