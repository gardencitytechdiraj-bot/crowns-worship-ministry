import { endpoint, handleOptions, json, readJson, requireMethod, routeParam, uuid, assert, optionalString, pick } from '../../_lib/http.js';
import { requireAdmin } from '../../_lib/admin.js';
import { rpc, select, update } from '../../_lib/supabase.js';

const REGISTRATION_FIELDS = 'id,event_id,full_name,phone,email,church_name,district_city,age_group,gender,language,payment_reference,payment_status,ticket_code,status,registered_at,checked_in,checked_in_at,updated_at';

async function findRegistration(id) {
  const rows = await select('registrations', `?select=${encodeURIComponent(REGISTRATION_FIELDS)}&id=eq.${encodeURIComponent(id)}&limit=1`);
  return rows?.[0] || null;
}

export default function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  if (!requireMethod(req, res, 'PATCH')) return undefined;
  return endpoint(req, res, async () => {
    if (!await requireAdmin(req, res)) return undefined;
    const id = uuid(routeParam(req, 'registrationId'), 'registration_id');
    const current = await findRegistration(id);
    assert(current, 404, 'REGISTRATION_NOT_FOUND', 'Registration not found.');
    const body = await readJson(req);
    assert(body && typeof body === 'object' && !Array.isArray(body), 400, 'INVALID_INPUT', 'Registration action must be an object.');

    if (body.action === 'cancel') {
      const result = await rpc('admin_cancel_registration', { p_registration_id: id });
      const cancelled = Array.isArray(result) ? result[0] : result;
      if (cancelled !== true) return json(req, res, 409, { error: { code: 'REGISTRATION_NOT_ACTIVE', message: 'Registration is already cancelled.' } });
      return json(req, res, 200, { ok: true, status: 'cancelled' });
    }

    if (body.action === 'payment') {
      assert(current.status === 'confirmed', 409, 'REGISTRATION_NOT_ACTIVE', 'Cancelled registrations cannot be updated.');
      const paymentStatus = pick(body.payment_status, ['not_required', 'pending', 'verified'], 'payment_status');
      const eventRows = await select('events', `?select=registration_type&id=eq.${encodeURIComponent(current.event_id)}&limit=1`);
      assert(eventRows?.[0], 404, 'EVENT_NOT_FOUND', 'Event not found.');
      const isPaid = eventRows[0].registration_type === 'paid';
      assert(isPaid ? paymentStatus !== 'not_required' : paymentStatus === 'not_required', 400, 'INVALID_INPUT', isPaid ? 'Paid registrations must be pending or verified.' : 'Free registrations cannot have a payment status.');
      const paymentReference = body.payment_reference === undefined ? current.payment_reference : optionalString(body.payment_reference, 'payment_reference', { max: 160 });
      const rows = await update('registrations', `?id=eq.${encodeURIComponent(id)}&status=eq.confirmed`, { payment_status: paymentStatus, payment_reference: paymentReference });
      assert(rows?.[0], 409, 'REGISTRATION_NOT_ACTIVE', 'Registration is no longer active.');
      return json(req, res, 200, { registration: rows?.[0] || rows });
    }

    if (body.action === 'check_in') {
      assert(current.status === 'confirmed', 409, 'REGISTRATION_NOT_ACTIVE', 'Cancelled registrations cannot be checked in.');
      const checkedIn = body.checked_in === undefined ? true : body.checked_in;
      assert(typeof checkedIn === 'boolean', 400, 'INVALID_INPUT', 'checked_in must be boolean.');
      const eventRows = await select('events', `?select=registration_type&id=eq.${encodeURIComponent(current.event_id)}&limit=1`);
      assert(eventRows?.[0], 404, 'EVENT_NOT_FOUND', 'Event not found.');
      if (checkedIn && eventRows[0].registration_type === 'paid') {
        assert(current.payment_status === 'verified', 409, 'PAYMENT_NOT_VERIFIED', 'Paid registrations must be verified before check-in.');
      }
      const rows = await update('registrations', `?id=eq.${encodeURIComponent(id)}&status=eq.confirmed`, { checked_in: checkedIn, checked_in_at: checkedIn ? new Date().toISOString() : null });
      assert(rows?.[0], 409, 'REGISTRATION_NOT_ACTIVE', 'Registration is no longer active.');
      return json(req, res, 200, { registration: rows?.[0] || rows });
    }

    assert(false, 400, 'INVALID_INPUT', 'action must be check_in, payment, or cancel.');
  });
}
