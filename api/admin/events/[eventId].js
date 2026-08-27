import { endpoint, handleOptions, json, readJson, requireMethod, routeParam, uuid, assert } from '../../_lib/http.js';
import { requireAdmin } from '../../_lib/admin.js';
import { normalizeEventInput, EVENT_FIELDS } from '../../_lib/events.js';
import { select, update } from '../../_lib/supabase.js';

async function findEvent(id) {
  const rows = await select('events', `?select=${encodeURIComponent(EVENT_FIELDS)}&id=eq.${encodeURIComponent(id)}&limit=1`);
  return rows?.[0] || null;
}

export default function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  if (!['PATCH', 'DELETE'].includes(req.method)) return requireMethod(req, res, 'PATCH');
  return endpoint(req, res, async () => {
    if (!await requireAdmin(req, res)) return undefined;
    const id = uuid(routeParam(req, 'eventId'), 'event_id');
    const current = await findEvent(id);
    assert(current, 404, 'EVENT_NOT_FOUND', 'Event not found.');

    if (req.method === 'DELETE') {
      const rows = await update('events', `?id=eq.${encodeURIComponent(id)}`, { status: 'archived' });
      return json(req, res, 200, { event: rows?.[0] || rows });
    }

    const patch = await readJson(req);
    const merged = { ...current, ...patch };
    if (patch.registration_type === 'free' && !Object.prototype.hasOwnProperty.call(patch, 'fee_amount')) merged.fee_amount = 0;
    const event = normalizeEventInput(merged);
    assert(event.capacity >= current.registered_count, 400, 'INVALID_INPUT', 'capacity cannot be below the current registration count.');
    const rows = await update('events', `?id=eq.${encodeURIComponent(id)}`, event);
    return json(req, res, 200, { event: rows?.[0] || rows });
  });
}
