import crypto from 'node:crypto';
import { query, newId } from './store.js';
import { readJson, reject, send } from './http.js';

const SESSION_SECONDS = 60 * 60 * 24 * 7;
const devSecret = crypto.randomBytes(32).toString('hex');

function secret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.VERCEL) throw new Error('SESSION_SECRET is not set.');
  return devSecret;
}

const sign = payload => crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
const sessionCookie = req => /(?:^|;\s*)skill_session=([^;]+)/.exec(req.headers.cookie || '')?.[1];
export const publicUser = user => user && ({ id: user.id, name: user.name, email: user.email, role: user.role });

// Sessions are stateless signed tokens: "<userId>.<expiry>.<signature>".
function readSession(token) {
  const [userId, expires, signature] = String(token || '').split('.');
  if (!userId || !expires || !signature) return null;
  const expected = Buffer.from(sign(`${userId}.${expires}`));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
  return Number(expires) > Date.now() / 1000 ? userId : null;
}

export async function currentUser(req) {
  const userId = readSession(sessionCookie(req));
  if (!userId) return undefined;
  const [user] = await query('SELECT id, name, email, role FROM users WHERE id = $1', [userId]);
  return user;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

function validPassword(password, stored) {
  const [salt, digest] = stored.split(':');
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(digest, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

const cookieFlags = req => `HttpOnly; SameSite=Lax; Path=/${req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}`;

function signIn(req, res, user) {
  const payload = `${user.id}.${Math.floor(Date.now() / 1000) + SESSION_SECONDS}`;
  res.setHeader('Set-Cookie', `skill_session=${payload}.${sign(payload)}; ${cookieFlags(req)}; Max-Age=${SESSION_SECONDS}`);
}

export async function handleAuth(req, res, route) {
  if (req.method !== 'POST') return false;
  if (route === '/api/register') {
    const input = await readJson(req);
    const name = String(input.name || '').trim().slice(0, 50);
    const email = String(input.email || '').trim().toLowerCase();
    const password = String(input.password || '');
    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
      reject(res, 400, 'Enter a name, a valid email, and a password of at least 8 characters.');
      return true;
    }
    const [user] = await query(
      `INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, 'user')
       ON CONFLICT (email) DO NOTHING RETURNING id, name, email, role`,
      [newId(), name, email, hashPassword(password)]
    );
    if (!user) reject(res, 409, 'That email is already registered.');
    else { signIn(req, res, user); send(res, 201, { user: publicUser(user) }); }
    return true;
  }
  if (route === '/api/login') {
    const input = await readJson(req);
    const [user] = await query('SELECT id, name, email, role, password FROM users WHERE email = $1', [String(input.email || '').trim().toLowerCase()]);
    if (!user || !validPassword(String(input.password || ''), user.password)) reject(res, 401, 'Incorrect email or password.');
    else { signIn(req, res, user); send(res, 200, { user: publicUser(user) }); }
    return true;
  }
  if (route === '/api/logout') {
    res.setHeader('Set-Cookie', `skill_session=; ${cookieFlags(req)}; Max-Age=0`);
    send(res, 200, { ok: true });
    return true;
  }
  return false;
}
