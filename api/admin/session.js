import { endpoint, handleOptions, json, readJson, requireMethod, setSessionCookie } from '../_lib/http.js';
import { clientIdentifier, loginInput, requireAdmin, setupInput } from '../_lib/admin.js';
import { rpc } from '../_lib/supabase.js';

export default function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  if (!['GET', 'POST'].includes(req.method)) return requireMethod(req, res, 'GET');
  return endpoint(req, res, async () => {
    if (req.method === 'POST') {
      const body = await readJson(req);
      if (body.action === 'setup') {
        const result = await rpc('admin_bootstrap', setupInput(body));
        const success = Array.isArray(result) ? result[0] : result;
        if (success !== true) return json(req, res, 400, { error: { code: 'BOOTSTRAP_INVALID', message: 'Setup code is invalid or bootstrap is already complete.' } });
        return json(req, res, 200, { ok: true, setup_complete: true });
      }
      const result = await rpc('admin_login', { p_password: loginInput(body), p_client_identifier: body.client_identifier || clientIdentifier(req) });
      const row = Array.isArray(result) ? result[0] : result;
      if (!row?.session_token) {
        const code = row?.error_code || 'INVALID_PASSWORD';
        const status = code === 'TOO_MANY_ATTEMPTS' ? 429 : code === 'SETUP_REQUIRED' ? 409 : 401;
        return json(req, res, status, { error: { code, message: code === 'SETUP_REQUIRED' ? 'Admin bootstrap is required.' : code === 'TOO_MANY_ATTEMPTS' ? 'Too many login attempts. Try again later.' : 'Invalid password.' } });
      }
      setSessionCookie(req, res, row.session_token);
      return json(req, res, 200, { ok: true, session_token: row.session_token, expires_at: row.session_expires_at });
    }
    const token = await requireAdmin(req, res);
    if (!token) return undefined;
    return json(req, res, 200, { authenticated: true });
  });
}
