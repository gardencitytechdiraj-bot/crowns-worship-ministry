import { endpoint, handleOptions, json, readJson, requireMethod, uuid, assert, optionalString, pick } from '../../_lib/http.js';
import { requireAdmin } from '../../_lib/admin.js';
import { rpc, select, update } from '../../_lib/supabase.js';

const REGISTRATION_FIELDS = 'id,event_id,full_name,phone,email,church_name,district_city,age_group,gender,language,payment_reference,payment_status,ticket_code,status,registered_at,checked_in,checked_in_at,updated_at';

export default function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  if (!['GET', 'PATCH'].includes(req.method)) return requireMethod(req, res, 'GET');
  return endpoint(req, res, async () => {
    if (!await requireAdmin(req, res)) return undefined;
    if (req.method === 'PATCH') {
      const body = await readJson(req);
      const id = uuid(body.id, 'registration_id');
      const currentRows = await select('registrations', `?select=${encodeURIComponent(REGISTRATION_FIELDS)}&id=eq.${encodeURIComponent(id)}&limit=1`);
      const current = currentRows?.[0];
      assert(current, 404, 'REGISTRATION_NOT_FOUND', 'Registration not found.');
      if (body.status === 'cancelled') {
        const result = await rpc('admin_cancel_registration', { p_registration_id: id });
        const cancelled = Array.isArray(result) ? result[0] : result;
        if (cancelled !== true) return json(req, res, 409, { error: { code: 'REGISTRATION_NOT_ACTIVE', message: 'Registration is already cancelled.' } });
        return json(req, res, 200, { ok: true, status: 'cancelled' });
      }
      assert(current.status === 'confirmed', 409, 'REGISTRATION_NOT_ACTIVE', 'Cancelled registrations cannot be updated.');
      if (body.payment_status !== undefined) {
        const paymentStatus = pick(body.payment_status, ['not_required', 'pending', 'verified'], 'payment_status');
        const eventRows = await select('events', `?select=registration_type&id=eq.${encodeURIComponent(current.event_id)}&limit=1`);
        assert(eventRows?.[0], 404, 'EVENT_NOT_FOUND', 'Event not found.');
        const isPaid = eventRows[0].registration_type === 'paid';
        assert(isPaid ? paymentStatus !== 'not_required' : paymentStatus === 'not_required', 400, 'INVALID_INPUT', isPaid ? 'Paid registrations must be pending or verified.' : 'Free registrations cannot have a payment status.');
        const paymentReference = body.payment_reference === undefined ? current.payment_reference : optionalString(body.payment_reference, 'payment_reference', { max: 160 });
        const rows = await update('registrations', `?id=eq.${encodeURIComponent(id)}&status=eq.confirmed`, { payment_status: paymentStatus, payment_reference: paymentReference });
        assert(rows?.[0], 409, 'REGISTRATION_NOT_ACTIVE', 'Registration is no longer active.');
        return json(req, res, 200, { registration: rows[0] });
      }
      if (body.checked_in !== undefined) {
        assert(typeof body.checked_in === 'boolean', 400, 'INVALID_INPUT', 'checked_in must be boolean.');
        const eventRows = await select('events', `?select=registration_type&id=eq.${encodeURIComponent(current.event_id)}&limit=1`);
        assert(eventRows?.[0], 404, 'EVENT_NOT_FOUND', 'Event not found.');
        if (body.checked_in && eventRows[0].registration_type === 'paid') assert(current.payment_status === 'verified', 409, 'PAYMENT_NOT_VERIFIED', 'Paid registrations must be verified before check-in.');
        const rows = await update('registrations', `?id=eq.${encodeURIComponent(id)}&status=eq.confirmed`, { checked_in: body.checked_in, checked_in_at: body.checked_in ? new Date().toISOString() : null });
        assert(rows?.[0], 409, 'REGISTRATION_NOT_ACTIVE', 'Registration is no longer active.');
        return json(req, res, 200, { registration: rows[0] });
      }
      assert(false, 400, 'INVALID_INPUT', 'Provide status, payment_status, or checked_in.');
    }
    const eventId = req.query?.event_id;
    const status = req.query?.status;
    const limitValue = Number(req.query?.limit || 100);
    const offsetValue = Number(req.query?.offset || 0);
    assert(Number.isInteger(limitValue) && limitValue >= 1 && limitValue <= 200, 400, 'INVALID_INPUT', 'limit must be between 1 and 200.');
    assert(Number.isInteger(offsetValue) && offsetValue >= 0 && offsetValue <= 100000, 400, 'INVALID_INPUT', 'offset must be non-negative.');
    let query = `?select=${encodeURIComponent(REGISTRATION_FIELDS)}&order=registered_at.desc&limit=${limitValue}&offset=${offsetValue}`;
    if (eventId) query += `&event_id=eq.${encodeURIComponent(uuid(Array.isArray(eventId) ? eventId[0] : eventId, 'event_id'))}`;
    if (status) query += `&status=eq.${encodeURIComponent(pick(Array.isArray(status) ? status[0] : status, ['confirmed', 'cancelled'], 'status'))}`;
    const rows = await select('registrations', query);
    return json(req, res, 200, { registrations: rows || [], limit: limitValue, offset: offsetValue });
  });
}
