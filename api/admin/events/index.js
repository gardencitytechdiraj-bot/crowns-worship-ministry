import { endpoint, handleOptions, json, readJson, requireMethod, pick } from '../../_lib/http.js';
import { requireAdmin } from '../../_lib/admin.js';
import { normalizeEventInput, EVENT_FIELDS } from '../../_lib/events.js';
import { insert, select } from '../../_lib/supabase.js';

export default function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  if (!['GET', 'POST'].includes(req.method)) return requireMethod(req, res, 'GET');
  return endpoint(req, res, async () => {
    if (!await requireAdmin(req, res)) return undefined;
    if (req.method === 'GET') {
      const status = req.query?.status;
      const filter = status ? `&status=eq.${encodeURIComponent(pick(Array.isArray(status) ? status[0] : status, ['draft', 'published', 'closed', 'archived'], 'status'))}` : '';
      const rows = await select('events', `?select=${encodeURIComponent(EVENT_FIELDS)}${filter}&order=starts_at.asc`);
      return json(req, res, 200, { events: rows || [] });
    }
    const event = normalizeEventInput(await readJson(req));
    const rows = await insert('events', event);
    return json(req, res, 201, { event: rows?.[0] || rows });
  });
}
