import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleRequest } from './src/server/handler.js';

// Local development server. On Vercel, static files come from public/ and api/index.js handles the API.
const publicRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'public');
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function serveStatic(res, route) {
  const file = path.resolve(publicRoot, `.${route === '/' ? '/index.html' : route}`);
  if (!file.startsWith(`${publicRoot}${path.sep}`) || !contentTypes[path.extname(file)] || !fs.existsSync(file)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found.');
    return;
  }
  res.writeHead(200, { 'Content-Type': contentTypes[path.extname(file)], 'X-Content-Type-Options': 'nosniff' });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  const route = new URL(req.url, 'http://localhost').pathname;
  if (route.startsWith('/api/') || route.startsWith('/uploads/')) return handleRequest(req, res);
  serveStatic(res, route);
});

const port = Number(process.env.PORT || 3000);
server.listen(port, '127.0.0.1', () => console.log(`Skill Unlocked is running at http://127.0.0.1:${port}`));
