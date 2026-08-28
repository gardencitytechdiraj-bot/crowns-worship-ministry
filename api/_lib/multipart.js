import { ApiError, assert } from './http.js';

export const MAX_OPTIMIZED_IMAGE_BYTES = 3.5 * 1024 * 1024;

export function parseImageMultipart(contentType, buffer) {
  const match = /^multipart\/form-data;\s*boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
  if (!match) throw new ApiError(400, 'INVALID_UPLOAD', 'Upload must use multipart/form-data.');
  const boundary = Buffer.from(`--${match[1] || match[2]}`);
  const parts = [];
  let cursor = 0;
  while (cursor < buffer.length) {
    const start = buffer.indexOf(boundary, cursor);
    if (start < 0) break;
    const headerStart = start + boundary.length;
    if (buffer.slice(headerStart, headerStart + 2).toString() === '--') break;
    const contentStart = buffer.indexOf(Buffer.from('\r\n\r\n'), headerStart);
    if (contentStart < 0) break;
    const headers = buffer.slice(headerStart, contentStart).toString('utf8');
    const next = buffer.indexOf(boundary, contentStart + 4);
    if (next < 0) break;
    const contentEnd = next - 2;
    const disposition = /content-disposition:\s*form-data;[^\r\n]*?name="([^"]+)"(?:;\s*filename="([^"]*)")?/i.exec(headers);
    if (disposition) {
      parts.push({
        name: disposition[1],
        filename: disposition[2] || '',
        contentType: (/content-type:\s*([^\r\n]+)/i.exec(headers)?.[1] || 'application/octet-stream').trim().toLowerCase(),
        data: buffer.slice(contentStart + 4, contentEnd),
      });
    }
    cursor = next;
  }
  const file = parts.find((part) => part.name === 'image' || part.name === 'file');
  assert(file && file.data.length > 0, 400, 'INVALID_UPLOAD', 'An image file is required.');
  assert(file.data.length <= MAX_OPTIMIZED_IMAGE_BYTES, 413, 'PAYLOAD_TOO_LARGE', 'Optimized image must be 3.5 MB or smaller.');
  const types = {
    'image/jpeg': { extension: 'jpg', magic: (data) => data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff },
    'image/png': { extension: 'png', magic: (data) => data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
    'image/webp': { extension: 'webp', magic: (data) => data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP' },
    'image/avif': { extension: 'avif', magic: (data) => data.subarray(4, 12).toString().includes('ftyp') && /avif|avis/.test(data.subarray(8, 16).toString()) },
  };
  const type = types[file.contentType];
  assert(type && type.magic(file.data), 415, 'UNSUPPORTED_IMAGE', 'Only valid JPEG, PNG, WebP, or AVIF images are supported.');
  return { ...file, ...type };
}
