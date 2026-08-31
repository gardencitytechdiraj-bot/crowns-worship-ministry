import { endpoint, handleOptions, json, readJson, requireMethod, setSessionCookie } from '../_lib/http.js';
import { clientIdentifier, loginInput } from '../_lib/admin.js';
import { rpc } from '../_lib/supabase.js';

export default function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  if (!requireMethod(req, res, 'POST')) return undefined;
  return endpoint(req, res, async () => {
    const result = await rpc('admin_login', {
      p_password: loginInput(await readJson(req)),
      p_client_identifier: clientIdentifier(req),
    });
    const row = Array.isArray(result) ? result[0] : result;
    if (!row?.session_token) {
      const code = row?.error_code || 'INVALID_PASSWORD';
      const status = code === 'TOO_MANY_ATTEMPTS' ? 429 : code === 'SETUP_REQUIRED' ? 409 : 401;
      return json(req, res, status, { error: { code, message: code === 'SETUP_REQUIRED' ? 'Admin bootstrap is required.' : code === 'TOO_MANY_ATTEMPTS' ? 'Too many login attempts. Try again later.' : 'Invalid password.' } });
    }
    setSessionCookie(req, res, row.session_token);
    return json(req, res, 200, { ok: true, expires_at: row.session_expires_at });
  });
}
