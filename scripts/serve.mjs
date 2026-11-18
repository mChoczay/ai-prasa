// Local static server for site/ (development preview only). Usage: node scripts/serve.mjs
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SITE_ROOT = fileURLToPath(new URL('../site/', import.meta.url));
const MIME = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
});

export function createSiteServer(root = SITE_ROOT) {
  const base = path.resolve(root);
  return createServer(async (req, res) => {
    const send = (status, body, type = 'text/plain; charset=utf-8') => {
      res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(body);
    };
    let rel;
    try {
      rel = decodeURIComponent(req.url.split('?')[0]);
    } catch {
      return send(400, 'Bad request');
    }
    const target = path.resolve(base, `.${rel.startsWith('/') ? rel : `/${rel}`}`);
    if (target !== base && !target.startsWith(base + path.sep)) return send(403, 'Forbidden');
    let file = target;
    try {
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      const body = await readFile(file);
      return send(200, body, MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
    } catch {
      return send(404, 'Not found');
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 8080;
  createSiteServer().listen(port, '127.0.0.1', () => {
    console.log(`site: http://127.0.0.1:${port}/`);
  });
}
