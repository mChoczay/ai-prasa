import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

// Reads the first pixel of an 8-bit RGB(A) PNG without dependencies.
function firstPixel(buf) {
  const width = buf.readUInt32BE(16);
  const colorType = buf[25];
  const chunks = [];
  for (let at = 8; at < buf.length; ) {
    const len = buf.readUInt32BE(at);
    const type = buf.toString('ascii', at + 4, at + 8);
    if (type === 'IDAT') chunks.push(buf.subarray(at + 8, at + 8 + len));
    at += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const channels = colorType === 6 ? 4 : 3;
  return { width, alpha: channels === 4 ? raw[1 + 3] : 255 };
}

test('the iPhone icon is a full opaque square (iOS rounds the corners itself)', () => {
  const png = readFileSync(new URL('../site/apple-touch-icon.png', import.meta.url));
  const { width, alpha } = firstPixel(png);
  assert.equal(width, 180);
  assert.equal(alpha, 255);
});
