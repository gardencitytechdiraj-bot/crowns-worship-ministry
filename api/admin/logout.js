import { endpoint, handleOptions, json, requireMethod, sessionToken, clearSessionCookie } from '../_lib/http.js';
import { rpc } from '../_lib/supabase.js';

export default function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  if (!requireMethod(req, res, 'POST')) return undefined;
  return endpoint(req, res, async () => {
    const token = sessionToken(req);
    if (token) await rpc('admin_logout', { p_session_token: token });
    clearSessionCookie(req, res);
    return json(req, res, 200, { ok: true });
  });
}
