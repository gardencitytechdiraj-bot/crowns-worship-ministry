import { randomUUID } from 'node:crypto';
import { endpoint, handleOptions, json, readBuffer, requireMethod } from '../_lib/http.js';
import { requireAdmin } from '../_lib/admin.js';
import { storagePublicUrl, uploadObject } from '../_lib/supabase.js';
import { parseImageMultipart } from '../_lib/multipart.js';

export default function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  if (!requireMethod(req, res, 'POST')) return undefined;
  return endpoint(req, res, async () => {
    if (!await requireAdmin(req, res)) return undefined;
    const file = parseImageMultipart(req.headers?.['content-type'], await readBuffer(req, 5.5 * 1024 * 1024));
    const path = `draft/${randomUUID()}.${file.extension}`;
    await uploadObject(path, file.data, file.contentType);
    return json(req, res, 201, { image_url: storagePublicUrl(path) });
  });
}
