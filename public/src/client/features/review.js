import { state, getChallenge, escapeHtml, formatDate, emptyState, request, pageHead, stats } from '../core.js';

const reasonField = id => `<label class="field"><span>Rejection note <small>(required if rejecting)</small></span><textarea id="${id}" placeholder="Explain what needs to change"></textarea></label>`;

function proofCard(submission) {
  const challenge = getChallenge(submission.challengeId);
  if (!challenge) return '';
  const step = challenge.steps[submission.stepIndex];
  const source = `/uploads/${encodeURIComponent(submission.mediaId)}`;
  const media = submission.mime.startsWith('video/')
    ? `<video class="review-media" src="${source}" controls preload="metadata"></video>`
    : `<img class="review-media" src="${source}" alt="Proof from ${escapeHtml(submission.userName)}">`;
  return `<article class="review-card">
    <div class="review-card-head"><div><h3>${escapeHtml(challenge.title)}</h3><p>Step ${submission.stepIndex + 1}: ${escapeHtml(step.title)}<br>${escapeHtml(submission.userName)} · ${formatDate(submission.createdAt)}</p></div><span class="status is-pending">Pending</span></div>
    <div class="criteria-box"><strong>What the proof should show</strong><p>${escapeHtml(step.proof)}</p></div>
    ${media}
    ${submission.note ? `<p class="review-note">Learner's note: ${escapeHtml(submission.note)}</p>` : ''}
    ${reasonField(`reason-${escapeHtml(submission.id)}`)}
    <div class="review-actions"><button class="button button--solid button--small" data-review="${escapeHtml(submission.id)}" data-decision="approved">Approve</button><button class="button button--line button--small" data-review="${escapeHtml(submission.id)}" data-decision="rejected">Reject</button></div>
  </article>`;
}

function proposalCard(challenge) {
  return `<article class="review-card">
    <div class="review-card-head"><div><h3>${escapeHtml(challenge.title)}</h3><p>${escapeHtml(challenge.category)} · Proposed by ${escapeHtml(challenge.creatorName)}</p></div><span class="status is-pending">Pending</span></div>
    <p>${escapeHtml(challenge.description)}</p>
    <ol class="proposal-steps">${challenge.steps.map(step => `<li><strong>${escapeHtml(step.title)}</strong><p>${escapeHtml(step.instruction)}</p><small>Proof: ${escapeHtml(step.proof)}</small></li>`).join('')}</ol>
    ${reasonField(`challenge-reason-${escapeHtml(challenge.id)}`)}
    <div class="review-actions"><button class="button button--solid button--small" data-challenge-review="${escapeHtml(challenge.id)}" data-decision="published">Publish</button><button class="button button--line button--small" data-challenge-review="${escapeHtml(challenge.id)}" data-decision="rejected">Reject</button></div>
  </article>`;
}

export function renderReviewer() {
  const proofs = state.data.submissions.filter(item => item.status === 'pending');
  const proposals = state.data.challenges.filter(item => item.status === 'pending');
  return `<div class="container page-layout">
    ${pageHead('Review queue', 'Judge each submission against the criteria written for that step.')}
    ${stats([['Proofs waiting', proofs.length], ['New proposals', proposals.length], ['Badges issued', state.data.counts.badges]])}
    <div class="review-columns">
      <section><div class="subheading"><h2>Learner proofs</h2><span class="muted">${proofs.length}</span></div>${proofs.length ? proofs.map(proofCard).join('') : emptyState('All caught up', 'There are no new submissions.')}</section>
      <section><div class="subheading"><h2>Challenge proposals</h2><span class="muted">${proposals.length}</span></div>${proposals.length ? proposals.map(proposalCard).join('') : emptyState('No proposals', 'Proposals from the community will show up here.')}</section>
    </div>
  </div>`;
}

export async function handleReviewClick(button, { reload, notify }) {
  if (button.dataset.review) {
    const reason = document.getElementById(`reason-${button.dataset.review}`).value;
    await request(`/api/reviews/${encodeURIComponent(button.dataset.review)}`, {
      method: 'POST', body: JSON.stringify({ decision: button.dataset.decision, reason })
    });
    await reload();
    notify(button.dataset.decision === 'approved' ? 'Proof approved.' : 'Proof rejected with a note.');
    return true;
  }
  if (button.dataset.challengeReview) {
    const reason = document.getElementById(`challenge-reason-${button.dataset.challengeReview}`).value;
    await request(`/api/challenges/${encodeURIComponent(button.dataset.challengeReview)}/review`, {
      method: 'POST', body: JSON.stringify({ decision: button.dataset.decision, reason })
    });
    await reload();
    notify(button.dataset.decision === 'published' ? 'Challenge published.' : 'Proposal rejected with a note.');
    return true;
  }
  return false;
}
