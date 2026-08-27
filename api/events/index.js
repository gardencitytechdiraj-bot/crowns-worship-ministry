import { endpoint, handleOptions, json, readJson, requireMethod, assert, cookies, sessionToken, uuid } from '../_lib/http.js';
import { requireAdmin } from '../_lib/admin.js';
import { publicEvent, EVENT_FIELDS } from '../_lib/events.js';
import { insert, select, update } from '../_lib/supabase.js';
import { normalizeEventInput } from '../_lib/events.js';

export default function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  if (!['GET', 'POST', 'PATCH'].includes(req.method)) return requireMethod(req, res, 'GET');
  return endpoint(req, res, async () => {
    const hasPresentedAdminCredential = Boolean(sessionToken(req) || cookies(req).cwm_admin_session || req.headers?.authorization);
    const requiresAdmin = req.method !== 'GET' || hasPresentedAdminCredential;
    if (requiresAdmin && !await requireAdmin(req, res)) return undefined;
    if (req.method === 'POST') {
      const rows = await insert('events', normalizeEventInput(await readJson(req)));
      return json(req, res, 201, { event: rows?.[0] || rows });
    }
    if (req.method === 'PATCH') {
      const body = await readJson(req);
      const id = uuid(body.id, 'event_id');
      const currentRows = await select('events', `?select=${encodeURIComponent(EVENT_FIELDS)}&id=eq.${encodeURIComponent(id)}&limit=1`);
      const current = currentRows?.[0];
      assert(current, 404, 'EVENT_NOT_FOUND', 'Event not found.');
      const merged = { ...current, ...body };
      if (body.registration_type === 'free' && !Object.prototype.hasOwnProperty.call(body, 'fee_amount')) merged.fee_amount = 0;
      const event = normalizeEventInput(merged);
      assert(event.capacity >= current.registered_count, 400, 'INVALID_INPUT', 'capacity cannot be below the current registration count.');
      const rows = await update('events', `?id=eq.${encodeURIComponent(id)}`, event);
      return json(req, res, 200, { event: rows?.[0] || rows });
    }
    const rows = await select('events', `?select=${encodeURIComponent(EVENT_FIELDS)}${hasPresentedAdminCredential ? '' : '&status=eq.published'}&order=starts_at.asc`);
    const events = Array.isArray(rows) ? rows : [];
    return json(req, res, 200, { events: hasPresentedAdminCredential ? events : events.map(publicEvent) });
  });
}
