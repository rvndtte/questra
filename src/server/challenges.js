import { query, newId, challengeColumns } from './store.js';
import { readJson, reject, send } from './http.js';

const categories = ['Logic', 'Life', 'Communication', 'Creative'];

export async function handleChallenges(req, res, route, user) {
  if (req.method !== 'POST') return false;

  if (route === '/api/challenges') {
    const input = await readJson(req);
    const title = String(input.title || '').trim().slice(0, 90);
    const description = String(input.description || '').trim().slice(0, 500);
    const category = String(input.category || 'Life');
    const rawSteps = Array.isArray(input.steps) ? input.steps : [];
    if (!title || !description || !categories.includes(category) || rawSteps.length < 1 || rawSteps.length > 5) {
      reject(res, 400, 'Provide 1–5 steps and a valid category.');
      return true;
    }
    const steps = rawSteps.map(step => ({
      title: String(step.title || '').trim().slice(0, 90),
      instruction: String(step.instruction || '').trim().slice(0, 300),
      proof: String(step.proof || '').trim().slice(0, 200)
    }));
    if (steps.some(step => !step.title || !step.instruction || !step.proof)) {
      reject(res, 400, 'Every step needs a title, instructions, and proof criteria.');
      return true;
    }
    const duration = `${steps.length} ${steps.length === 1 ? 'day' : 'days'}`;
    const [challenge] = await query(
      `INSERT INTO challenges AS c (id, title, description, category, level, duration, steps, creator_id, status)
       VALUES ($1, $2, $3, $4, 'Beginner', $5, $6::jsonb, $7, 'pending') RETURNING ${challengeColumns}`,
      [newId(), title, description, category, duration, JSON.stringify(steps), user.id]
    );
    send(res, 201, { challenge });
    return true;
  }

  const review = route.match(/^\/api\/challenges\/([^/]+)\/review$/);
  if (review) {
    if (user.role !== 'reviewer') { reject(res, 403, 'Only reviewers can review challenges.'); return true; }
    const [challenge] = await query("SELECT creator_id AS \"creatorId\" FROM challenges WHERE id = $1 AND status = 'pending'", [review[1]]);
    if (!challenge) reject(res, 404, 'Challenge not found.');
    else if (challenge.creatorId === user.id) reject(res, 403, 'You cannot review your own challenge.');
    else {
      const input = await readJson(req);
      if (!['published', 'rejected'].includes(input.decision)) reject(res, 400, 'Invalid decision.');
      else if (input.decision === 'rejected' && !String(input.reason || '').trim()) reject(res, 400, 'Please explain the reason for rejection.');
      else {
        await query(
          "UPDATE challenges SET status = $2, reason = $3, reviewed_at = now() WHERE id = $1 AND status = 'pending'",
          [review[1], input.decision, String(input.reason || '').trim().slice(0, 300)]
        );
        send(res, 200, { ok: true });
      }
    }
    return true;
  }

  const join = route.match(/^\/api\/challenges\/([^/]+)\/join$/);
  if (join) {
    const [challenge] = await query("SELECT id FROM challenges WHERE id = $1 AND status = 'published'", [join[1]]);
    if (!challenge) reject(res, 404, 'Challenge not found.');
    else {
      await query('INSERT INTO enrollments (user_id, challenge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [user.id, challenge.id]);
      send(res, 200, { ok: true });
    }
    return true;
  }
  return false;
}
