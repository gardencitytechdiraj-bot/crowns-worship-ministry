import { randomUUID } from 'node:crypto';
import { endpoint, handleOptions, json, readBuffer, requireMethod } from '../_lib/http.js';
import { requireAdmin } from '../_lib/admin.js';
import { storagePublicUrl, uploadObject } from '../_lib/supabase.js';
import { MAX_OPTIMIZED_IMAGE_BYTES, parseImageMultipart } from '../_lib/multipart.js';

export const config = { api: { bodyParser: false } };

const MAX_MULTIPART_BODY_BYTES = MAX_OPTIMIZED_IMAGE_BYTES + 256 * 1024;

export default function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  if (!requireMethod(req, res, 'POST')) return undefined;
  return endpoint(req, res, async () => {
    if (!await requireAdmin(req, res)) return undefined;
    const file = parseImageMultipart(req.headers?.['content-type'], await readBuffer(req, MAX_MULTIPART_BODY_BYTES));
    const path = `draft/${randomUUID()}.${file.extension}`;
    await uploadObject(path, file.data, file.contentType);
    return json(req, res, 201, { image_url: storagePublicUrl(path) });
  });
}
