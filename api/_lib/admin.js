import { ApiError, assert, cookies, json, sessionToken, clientIdentifier } from './http.js';
import { rpc } from './supabase.js';

export async function requireAdmin(req, res) {
  const token = sessionToken(req);
  if (!token) {
    json(req, res, 401, { error: { code: 'AUTH_REQUIRED', message: 'Admin session required.' } });
    return null;
  }
  const result = await rpc('admin_validate_session', { p_session_token: token });
  const valid = Array.isArray(result) ? result[0] : result;
  if (valid !== true) {
    json(req, res, 401, { error: { code: 'SESSION_INVALID', message: 'Admin session is invalid or expired.' } });
    return null;
  }
  return token;
}

export function loginInput(body) {
  assert(body && typeof body === 'object' && !Array.isArray(body), 400, 'INVALID_INPUT', 'Login data must be an object.');
  assert(typeof body.password === 'string' && body.password.length >= 1 && body.password.length <= 256, 400, 'INVALID_INPUT', 'password is required.');
  return body.password;
}

export function setupInput(body) {
  assert(body && typeof body === 'object' && !Array.isArray(body), 400, 'INVALID_INPUT', 'Bootstrap data must be an object.');
  assert(typeof body.setup_code === 'string' && body.setup_code.length >= 1 && body.setup_code.length <= 256, 400, 'INVALID_INPUT', 'setup_code is required.');
  assert(typeof body.new_password === 'string' && body.new_password.length >= 12 && body.new_password.length <= 256, 400, 'PASSWORD_TOO_SHORT', 'new_password must be at least 12 characters.');
  return { p_setup_code: body.setup_code, p_new_password: body.new_password };
}

export { clientIdentifier };
