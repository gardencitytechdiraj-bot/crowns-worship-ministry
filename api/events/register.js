import { endpoint, handleOptions, json, readJson, requireMethod, assert, uuid } from '../_lib/http.js';
import { rpc, select } from '../_lib/supabase.js';
import { normalizeSlug, registrationInput as normalizeRegistration } from '../_lib/events.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveEventId(value) {
  if (UUID_PATTERN.test(value || '')) return uuid(value, 'event_id');
  if (typeof value !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(value)) return uuid(value, 'event_id');

  const slug = normalizeSlug(value);
  const rows = await select('events', `?select=id&slug=eq.${encodeURIComponent(slug)}&limit=1`);
  const eventId = rows?.[0]?.id;
  assert(eventId, 404, 'EVENT_NOT_FOUND', 'Event not found.');
  return uuid(eventId, 'event_id');
}

export default function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  if (!requireMethod(req, res, 'POST')) return undefined;
  return endpoint(req, res, async () => {
    const body = await readJson(req);
    const args = normalizeRegistration(body);
    args.p_event_id = await resolveEventId(body.event_id);
    const result = await rpc('register_for_event', args);
    const registration = Array.isArray(result) ? result[0] : result;
    if (!registration) throw new Error('Registration RPC returned no result.');
    return json(req, res, 201, { registration });
  });
}
