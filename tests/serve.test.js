import test from 'node:test';
import assert from 'node:assert/strict';
import { createSiteServer } from '../scripts/serve.mjs';

async function withServer(fn) {
  const server = createSiteServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

// fetch() normalizes "/../", so send the raw path with node:http.
async function rawGet(base, path) {
  const { request } = await import('node:http');
  const url = new URL(base);
  return new Promise((resolve, reject) => {
    const req = request({ host: url.hostname, port: url.port, path, method: 'GET' }, (res) => {
      res.resume();
      res.on('end', () => resolve(res));
    });
    req.on('error', reject);
    req.end();
  });
}

test('GET / serves index.html with no-store', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/html/);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.match(await res.text(), /Poranna prasa AI/);
  });
});

test('paths outside site/ are rejected', async () => {
  await withServer(async (base) => {
    const res = await rawGet(base, '/../package.json');
    assert.equal(res.statusCode, 403);
    const enc = await rawGet(base, '/%2e%2e/package.json');
    assert.equal(enc.statusCode, 403);
  });
});

test('JSON data is served with a JSON content type', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/data/index.json`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /application\/json/);
  });
});

test('missing files return 404', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/nope.html`);
    assert.equal(res.status, 404);
  });
});
