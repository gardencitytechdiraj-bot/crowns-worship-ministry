import { endpoint, handleOptions, json, readJson, requireMethod } from '../_lib/http.js';
import { setupInput } from '../_lib/admin.js';
import { rpc } from '../_lib/supabase.js';

export default function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  if (!requireMethod(req, res, 'POST')) return undefined;
  return endpoint(req, res, async () => {
    const result = await rpc('admin_bootstrap', setupInput(await readJson(req)));
    const success = Array.isArray(result) ? result[0] : result;
    if (success !== true) return json(req, res, 400, { error: { code: 'BOOTSTRAP_INVALID', message: 'Setup code is invalid or bootstrap is already complete.' } });
    return json(req, res, 200, { ok: true });
  });
}
