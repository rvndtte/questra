import { query, challengeColumns, submissionColumns } from './store.js';
import { currentUser, handleAuth, publicUser } from './auth.js';
import { handleChallenges } from './challenges.js';
import { handleProofs } from './proofs.js';
import { reject, send } from './http.js';

async function bootstrap(user) {
  const userId = user?.id ?? null;
  const isReviewer = user?.role === 'reviewer';
  const [challenges, enrollments, submissions, badges, [counts]] = await Promise.all([
    query(
      `SELECT ${challengeColumns}, COALESCE(u.name, 'Community') AS "creatorName"
       FROM challenges c LEFT JOIN users u ON u.id = c.creator_id
       WHERE c.status = 'published' OR $1::boolean OR c.creator_id = $2::text
       ORDER BY c.created_at, c.id`,
      [isReviewer, userId]
    ),
    query('SELECT user_id AS "userId", challenge_id AS "challengeId", joined_at AS "joinedAt" FROM enrollments WHERE user_id = $1::text', [userId]),
    query(
      `SELECT ${submissionColumns}, COALESCE(u.name, 'Learner') AS "userName"
       FROM submissions s LEFT JOIN users u ON u.id = s.user_id
       WHERE s.user_id = $1::text OR $2::boolean ORDER BY s.created_at, s.id`,
      [userId, isReviewer]
    ),
    query('SELECT id, user_id AS "userId", challenge_id AS "challengeId", issued_at AS "issuedAt" FROM badges WHERE user_id = $1::text', [userId]),
    query(`SELECT
      (SELECT count(*)::int FROM users WHERE role = 'user') AS learners,
      (SELECT count(*)::int FROM badges) AS badges,
      (SELECT count(*)::int FROM challenges WHERE status = 'published') AS challenges`)
  ]);
  return { user: publicUser(user), challenges, enrollments, submissions, badges, counts };
}

export async function handleApi(req, res, route) {
  const user = await currentUser(req);
  if (req.method === 'GET' && route === '/api/bootstrap') return send(res, 200, await bootstrap(user));
  if (await handleAuth(req, res, route)) return;
  if (!user) return reject(res, 401, 'Please sign in first.');
  if (await handleChallenges(req, res, route, user)) return;
  if (await handleProofs(req, res, route, user)) return;
  reject(res, 404, 'Not found.');
}
