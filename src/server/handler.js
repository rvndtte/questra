import { ensureReady } from './store.js';
import { handleApi } from './api.js';
import { currentUser } from './auth.js';
import { serveProof } from './proofs.js';
import { reject } from './http.js';

// Shared by the Vercel function (api/index.js) and the local server (server.js).
export async function handleRequest(req, res) {
  try {
    const route = new URL(req.url, 'http://localhost').pathname;
    await ensureReady();
    if (route.startsWith('/api/')) return await handleApi(req, res, route);
    if (route.startsWith('/uploads/')) return await serveProof(req, res, route, await currentUser(req));
    reject(res, 404, 'Not found.');
  } catch (error) {
    if (!error.status) console.error(error);
    reject(res, error.status || 500, error.status ? error.message : 'Something went wrong on the server.');
  }
}
