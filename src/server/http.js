export function send(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(payload));
}

export const reject = (res, status, message) => send(res, status, { error: message });

// Vercel caps request bodies at 4.5 MB, so proof files stay under that.
export const MAX_PROOF_BYTES = 4 * 1024 * 1024;

async function readBody(req, limit) {
  // Vercel's Node runtime pre-parses bodies onto req.body; plain Node leaves the stream untouched.
  if (req.body !== undefined) return req.body;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error('Upload is too large.'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function readJson(req) {
  const body = await readBody(req, 1024 * 1024);
  if (body && typeof body === 'object' && !Buffer.isBuffer(body)) return body;
  try {
    return JSON.parse(String(body || '') || '{}');
  } catch {
    throw Object.assign(new Error('Invalid data.'), { status: 400 });
  }
}

export async function readBinary(req, limit = MAX_PROOF_BYTES) {
  const body = await readBody(req, limit + 1);
  const buffer = Buffer.isBuffer(body) ? body : Buffer.alloc(0);
  if (buffer.length > limit) throw Object.assign(new Error(`Proof files can be at most ${limit / 1024 / 1024} MB.`), { status: 413 });
  return buffer;
}
