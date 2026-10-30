import { query, newId, submissionColumns } from './store.js';
import { readBinary, readJson, reject, send } from './http.js';

const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm' };

export async function serveProof(req, res, route, user) {
  const mediaId = decodeURIComponent(route.split('/').pop());
  const [proof] = await query(
    `SELECT s.user_id AS "userId", s.mime, m.data FROM submissions s JOIN media m ON m.id = s.media_id WHERE s.media_id = $1`,
    [mediaId]
  );
  if (!user || !proof || (proof.userId !== user.id && user.role !== 'reviewer')) {
    reject(res, 403, 'Proof files are private.');
    return;
  }
  const buffer = Buffer.from(proof.data, 'base64');
  res.writeHead(200, {
    'Content-Type': proof.mime, 'Content-Length': buffer.length,
    'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store'
  });
  res.end(buffer);
}

export async function handleProofs(req, res, route, user) {
  if (req.method !== 'POST') return false;

  const submit = route.match(/^\/api\/challenges\/([^/]+)\/steps\/(\d+)\/submit$/);
  if (submit) {
    const stepIndex = Number(submit[2]);
    const [challenge] = await query("SELECT id, steps FROM challenges WHERE id = $1 AND status = 'published'", [submit[1]]);
    if (!challenge || !challenge.steps[stepIndex]) { reject(res, 404, 'Step not found.'); return true; }
    const [enrolment] = await query('SELECT 1 AS ok FROM enrollments WHERE user_id = $1 AND challenge_id = $2', [user.id, challenge.id]);
    if (!enrolment) { reject(res, 400, 'Join the challenge first.'); return true; }
    if (stepIndex > 0) {
      const [previous] = await query(
        "SELECT 1 AS ok FROM submissions WHERE user_id = $1 AND challenge_id = $2 AND step_index = $3 AND status = 'approved'",
        [user.id, challenge.id, stepIndex - 1]
      );
      if (!previous) { reject(res, 400, 'Complete the previous step first.'); return true; }
    }
    const mime = String(req.headers['content-type'] || '').split(';')[0].trim();
    if (!extensions[mime]) { reject(res, 400, 'Upload a JPG, PNG, or WebP photo, or an MP4 or WebM video.'); return true; }
    const buffer = await readBinary(req);
    if (!buffer.length) { reject(res, 400, 'Choose a proof file first.'); return true; }

    const note = String(new URL(req.url, 'http://localhost').searchParams.get('note') || '').trim().slice(0, 500);
    const mediaId = `${newId()}.${extensions[mime]}`;
    let proof;
    try {
      [proof] = await query(
        `WITH s AS (
           INSERT INTO submissions (id, challenge_id, step_index, user_id, media_id, mime, note)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
         ) SELECT ${submissionColumns} FROM s`,
        [newId(), challenge.id, stepIndex, user.id, mediaId, mime, note]
      );
    } catch (error) {
      if (error.code === '23505') { reject(res, 400, 'Proof for this step has already been submitted.'); return true; }
      throw error;
    }
    await query('INSERT INTO media (id, data) VALUES ($1, $2)', [mediaId, buffer.toString('base64')]);
    send(res, 201, { submission: proof });
    return true;
  }

  const review = route.match(/^\/api\/reviews\/([^/]+)$/);
  if (review) {
    if (user.role !== 'reviewer') { reject(res, 403, 'Only reviewers can review proof.'); return true; }
    const [proof] = await query(
      `SELECT user_id AS "userId", challenge_id AS "challengeId" FROM submissions WHERE id = $1 AND status = 'pending'`, [review[1]]
    );
    if (!proof) { reject(res, 404, 'This proof is unavailable or has already been reviewed.'); return true; }
    if (proof.userId === user.id) { reject(res, 403, 'You cannot review your own proof.'); return true; }
    const input = await readJson(req);
    if (!['approved', 'rejected'].includes(input.decision)) { reject(res, 400, 'Invalid decision.'); return true; }
    if (input.decision === 'rejected' && !String(input.reason || '').trim()) { reject(res, 400, 'Please explain the reason for rejection.'); return true; }

    const updated = await query(
      `UPDATE submissions SET status = $2, reason = $3, reviewer_id = $4, reviewed_at = now()
       WHERE id = $1 AND status = 'pending' RETURNING id`,
      [review[1], input.decision, String(input.reason || '').trim().slice(0, 300), user.id]
    );
    if (updated.length && input.decision === 'approved') {
      await query(
        `INSERT INTO badges (id, user_id, challenge_id, reviewer_id)
         SELECT $1, $2, c.id, $4 FROM challenges c
         WHERE c.id = $3 AND jsonb_array_length(c.steps) = (
           SELECT count(DISTINCT step_index) FROM submissions
           WHERE user_id = $2 AND challenge_id = $3 AND status = 'approved')
         ON CONFLICT DO NOTHING`,
        [newId(), proof.userId, proof.challengeId, user.id]
      );
    }
    send(res, 200, { ok: true });
    return true;
  }
  return false;
}
