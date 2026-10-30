import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSeed } from './seed.js';

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
let runner;

// Production uses Neon over HTTP (no connection pooling concerns in serverless).
// Without DATABASE_URL, local development falls back to an embedded Postgres (PGlite).
async function connect() {
  if (databaseUrl) {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(databaseUrl);
    return (text, params) => sql.query(text, params);
  }
  if (process.env.VERCEL) throw new Error('DATABASE_URL is not set. Add a Postgres database to the Vercel project.');
  const { PGlite } = await import('@electric-sql/pglite');
  const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data/pglite');
  const pg = new PGlite(dataDir);
  return async (text, params) => (await pg.query(text, params)).rows;
}

export async function query(text, params = []) {
  runner ??= connect();
  return (await runner)(text, params);
}

export const newId = () => crypto.randomUUID();

const schema = [
  `CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE, password text NOT NULL,
    role text NOT NULL DEFAULT 'user', created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS challenges (
    id text PRIMARY KEY, title text NOT NULL, category text NOT NULL, level text NOT NULL, duration text NOT NULL,
    description text NOT NULL, steps jsonb NOT NULL, creator_id text NOT NULL REFERENCES users(id),
    status text NOT NULL, reason text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz)`,
  `CREATE TABLE IF NOT EXISTS enrollments (
    user_id text NOT NULL REFERENCES users(id), challenge_id text NOT NULL REFERENCES challenges(id),
    joined_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, challenge_id))`,
  `CREATE TABLE IF NOT EXISTS submissions (
    id text PRIMARY KEY, challenge_id text NOT NULL REFERENCES challenges(id), step_index int NOT NULL,
    user_id text NOT NULL REFERENCES users(id), media_id text NOT NULL UNIQUE, mime text NOT NULL,
    note text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'pending', reason text NOT NULL DEFAULT '',
    reviewer_id text, created_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS submissions_one_active_per_step
    ON submissions (user_id, challenge_id, step_index) WHERE status IN ('pending', 'approved')`,
  `CREATE TABLE IF NOT EXISTS media (id text PRIMARY KEY, data text NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS badges (
    id text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id), challenge_id text NOT NULL REFERENCES challenges(id),
    issued_at timestamptz NOT NULL DEFAULT now(), reviewer_id text, UNIQUE (user_id, challenge_id))`
];

async function prepare() {
  for (const statement of schema) await query(statement);
  const [{ count }] = await query('SELECT count(*)::int AS count FROM users');
  if (count > 0) return;
  const seed = createSeed();
  for (const u of seed.users) {
    await query('INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
      [u.id, u.name, u.email, u.password, u.role]);
  }
  for (const c of seed.challenges) {
    await query(`INSERT INTO challenges (id, title, category, level, duration, description, steps, creator_id, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10) ON CONFLICT DO NOTHING`,
      [c.id, c.title, c.category, c.level, c.duration, c.description, JSON.stringify(c.steps), c.creatorId, c.status, c.createdAt]);
  }
}

let ready;
// Creates tables and seeds starter data once per server instance.
export const ensureReady = () => (ready ??= prepare().catch(error => { ready = undefined; throw error; }));

export const challengeColumns = `c.id, c.title, c.category, c.level, c.duration, c.description, c.steps,
  c.creator_id AS "creatorId", c.status, c.reason, c.created_at AS "createdAt", c.reviewed_at AS "reviewedAt"`;
export const submissionColumns = `s.id, s.challenge_id AS "challengeId", s.step_index AS "stepIndex", s.user_id AS "userId",
  s.media_id AS "mediaId", s.mime, s.note, s.status, s.reason, s.reviewer_id AS "reviewerId",
  s.created_at AS "createdAt", s.reviewed_at AS "reviewedAt"`;
