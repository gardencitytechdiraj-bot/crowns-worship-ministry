import { endpoint, handleOptions, json, readJson, requireMethod, uuid } from '../_lib/http.js';
import { rpc } from '../_lib/supabase.js';
import { registrationInput as normalizeRegistration } from '../_lib/events.js';

export default function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  if (!requireMethod(req, res, 'POST')) return undefined;
  return endpoint(req, res, async () => {
    const body = await readJson(req);
    const args = normalizeRegistration(body);
    args.p_event_id = uuid(body.event_id, 'event_id');
    const result = await rpc('register_for_event', args);
    const registration = Array.isArray(result) ? result[0] : result;
    if (!registration) throw new Error('Registration RPC returned no result.');
    return json(req, res, 201, { registration });
  });
}
