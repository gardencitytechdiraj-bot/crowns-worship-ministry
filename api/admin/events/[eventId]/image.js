import { randomUUID } from 'node:crypto';
import { endpoint, handleOptions, json, readBuffer, requireMethod, routeParam, uuid, assert } from '../../../_lib/http.js';
import { requireAdmin } from '../../../_lib/admin.js';
import { select, storagePublicUrl, update, uploadObject } from '../../../_lib/supabase.js';
import { parseImageMultipart } from '../../../_lib/multipart.js';

export default function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  if (!requireMethod(req, res, 'POST')) return undefined;
  return endpoint(req, res, async () => {
    if (!await requireAdmin(req, res)) return undefined;
    const eventId = uuid(routeParam(req, 'eventId'), 'event_id');
    const exists = await select('events', `?select=id&id=eq.${encodeURIComponent(eventId)}&limit=1`);
    assert(exists?.[0], 404, 'EVENT_NOT_FOUND', 'Event not found.');
    const file = parseImageMultipart(req.headers?.['content-type'], await readBuffer(req, 5.5 * 1024 * 1024));
    const path = `${eventId}/${randomUUID()}.${file.extension}`;
    await uploadObject(path, file.data, file.contentType);
    const imageUrl = storagePublicUrl(path);
    const rows = await update('events', `?id=eq.${encodeURIComponent(eventId)}`, { image_url: imageUrl });
    return json(req, res, 200, { image_url: imageUrl, event: rows?.[0] || rows });
  });
}
