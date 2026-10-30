import {
  state, categories, escapeHtml, artwork, enrolled, request,
  approved, latestSubmission, progress, badge, formatDate, link, emptyState, pageHead, plural
} from '../core.js';

export function challengeCard(challenge) {
  const completed = state.data.user ? progress(challenge) : 0;
  const href = `#/challenge/${escapeHtml(challenge.id)}`;
  return `<article class="catalog-card">
    <a class="catalog-art-link" href="${href}" tabindex="-1" aria-hidden="true">${artwork(challenge)}</a>
    <div class="catalog-body">
      <div class="meta-line"><span>${escapeHtml(challenge.category)}</span><span>${escapeHtml(challenge.duration)}</span></div>
      <h3><a href="${href}">${escapeHtml(challenge.title)}</a></h3>
      <p>${escapeHtml(challenge.description)}</p>
      <div class="catalog-card-foot">
        ${enrolled(challenge.id)
          ? `<div class="progress-block"><div class="progress-track"><span style="width:${completed / challenge.steps.length * 100}%"></span></div><small>${completed} of ${plural(challenge.steps.length, 'step')} done</small></div>`
          : `<small>${plural(challenge.steps.length, 'step')} · ${escapeHtml(challenge.level)}</small>`}
      </div>
    </div>
  </article>`;
}

export function renderExplore() {
  return `<div class="container page-layout">
    ${pageHead('Challenges', 'Pick something that feels familiar, or something you have never tried.')}
    <div class="catalog-toolbar">
      <label class="search-field"><span class="visually-hidden">Search challenges</span><input id="search" type="search" placeholder="Search challenges" value="${escapeHtml(state.search)}"></label>
      <div class="filter-row" role="group" aria-label="Filter by category">${categories.map(item => `<button class="filter ${state.filter === item ? 'is-active' : ''}" data-filter="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join('')}</div>
    </div>
    <div id="explore-grid" class="catalog-grid"></div>
  </div>`;
}

export function filterExplore() {
  const matches = state.data.challenges.filter(item => item.status === 'published'
    && (state.filter === 'All' || item.category === state.filter)
    && `${item.title} ${item.description}`.toLowerCase().includes(state.search.toLowerCase()));
  document.querySelector('#explore-grid').innerHTML = matches.length
    ? matches.map(challengeCard).join('')
    : emptyState('No matches', 'Try a different keyword or category.');
  document.querySelectorAll('[data-filter]').forEach(button => button.classList.toggle('is-active', button.dataset.filter === state.filter));
}

function stepStatus(challenge, index) {
  const record = latestSubmission(challenge.id, index);
  if (approved(challenge.id, index)) return { key: 'done', label: 'Completed', css: 'is-approved' };
  if (record?.status === 'pending') return { key: 'review', label: 'In review', css: 'is-pending' };
  if (record?.status === 'rejected') return { key: 'retry', label: 'Try again', css: 'is-rejected' };
  if (index > 0 && !approved(challenge.id, index - 1)) return { key: 'locked', label: 'Locked', css: 'is-locked' };
  return { key: 'open', label: 'Open', css: 'is-available' };
}

export function renderDetail(challenge) {
  const user = state.data.user;
  const joined = enrolled(challenge.id);
  const completed = user ? progress(challenge) : 0;
  const earned = badge(challenge.id);
  const id = escapeHtml(challenge.id);
  return `<div class="container detail-layout">
    <div class="detail-main">
      <a class="back-link" href="#/explore">← All challenges</a>
      ${artwork(challenge)}
      <div class="detail-title"><h1>${escapeHtml(challenge.title)}</h1><p>${escapeHtml(challenge.description)}</p></div>
      <dl class="detail-facts"><div><dt>Category</dt><dd>${escapeHtml(challenge.category)}</dd></div><div><dt>Level</dt><dd>${escapeHtml(challenge.level)}</dd></div><div><dt>Estimated time</dt><dd>${escapeHtml(challenge.duration)}</dd></div><div><dt>Created by</dt><dd>${escapeHtml(challenge.creatorName)}</dd></div></dl>
      <div class="subheading"><h2>Steps</h2><span class="muted">${plural(challenge.steps.length, 'step')}</span></div>
      <div class="steps-list">${challenge.steps.map((step, index) => {
        const status = user ? stepStatus(challenge, index) : { key: 'open', label: 'Open', css: 'is-available' };
        const record = user ? latestSubmission(challenge.id, index) : null;
        const canUpload = joined && ['open', 'retry'].includes(status.key);
        return `<article class="step-row"><div class="step-index">${index + 1}</div><div class="step-content">
          <div class="step-top"><h3>${escapeHtml(step.title)}</h3>${user ? `<span class="status ${status.css}">${status.label}</span>` : ''}</div>
          <p>${escapeHtml(step.instruction)}</p>
          <div class="proof-criteria"><strong>Proof required</strong><p>${escapeHtml(step.proof)}</p></div>
          ${record?.status === 'rejected' ? `<p class="review-reason"><strong>Reviewer note:</strong> ${escapeHtml(record.reason)}</p>` : ''}
          ${canUpload && state.uploadStep !== `${challenge.id}:${index}` ? `<button class="button button--line button--small" data-upload="${index}" data-challenge="${id}">Upload proof</button>` : ''}
          ${state.uploadStep === `${challenge.id}:${index}` ? renderUploadForm(challenge.id, index) : ''}
        </div></article>`;
      }).join('')}</div>
    </div>
    <aside class="detail-aside">
      <h2>${earned ? 'Badge earned' : 'Earn the badge'}</h2>
      <p>${earned ? `A reviewer approved every step on ${formatDate(earned.issuedAt)}.` : 'Complete every step. A reviewer checks each proof before the badge is added to your collection.'}</p>
      <div class="progress-label"><span>Progress</span><strong>${completed} / ${challenge.steps.length}</strong></div>
      <div class="progress-track"><span style="width:${completed / challenge.steps.length * 100}%"></span></div>
      <div class="aside-action">${earned ? link('#/profile', 'View my badges', 'line') : joined ? link('#/dashboard', 'Go to my progress', 'line') : user ? `<button class="button button--solid button--full" data-join="${id}">Join challenge</button>` : link('#/login', 'Sign in to join')}</div>
      <small>A badge means a reviewer checked your proof. It is not a professional certification.</small>
    </aside>
  </div>`;
}

function renderUploadForm(challengeId, index) {
  return `<form class="upload-form" data-challenge="${escapeHtml(challengeId)}" data-step="${index}">
    <label class="field"><span>Photo or video</span><input name="proof" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" required><small>JPG, PNG, WebP, MP4, or WebM. Up to 4 MB.</small></label>
    <label class="field"><span>Note for the reviewer <small>(optional)</small></span><textarea name="note" maxlength="500" placeholder="Briefly describe what you did"></textarea></label>
    <div class="form-actions"><button class="button button--solid button--small" type="submit">Submit proof</button><button class="button button--text button--small" type="button" data-cancel-upload>Cancel</button></div>
  </form>`;
}

export function createStep(number) {
  return `<div class="create-step" data-step-fields>
    <div class="create-step-head"><strong>Step ${number}</strong>${number > 1 ? '<button class="text-button" type="button" data-remove-step>Remove</button>' : ''}</div>
    <label class="field"><span>Step title</span><input name="stepTitle" maxlength="90" required placeholder="e.g. Solve one face"></label>
    <label class="field"><span>Instructions</span><textarea name="instruction" maxlength="300" required placeholder="What should the learner do?"></textarea></label>
    <label class="field"><span>Proof criteria</span><textarea name="proof" maxlength="200" required placeholder="What should the photo or video show?"></textarea></label>
  </div>`;
}

export function renderCreate() {
  return `<div class="container create-layout">
    ${pageHead('Create a challenge', 'Describe the goal, break it into steps, and say what proof looks like for each. A reviewer will check it before it goes live.')}
    <div class="create-panel"><form id="create-form">
      <h2>Details</h2>
      <label class="field"><span>Title</span><input name="title" maxlength="90" required placeholder="e.g. Solve a 3×3 Rubik's Cube"></label>
      <label class="field"><span>Category</span><select name="category">${categories.slice(1).map(item => `<option>${item}</option>`).join('')}</select></label>
      <label class="field"><span>Description</span><textarea name="description" maxlength="500" required placeholder="What will learners get out of this?"></textarea></label>
      <h2>Steps <small>(1–5)</small></h2>
      <div id="create-steps">${createStep(1)}</div>
      <button class="button button--line button--small add-step" type="button" data-add-step>Add a step</button>
      <button class="button button--solid button--full" type="submit">Submit for review</button>
    </form></div>
  </div>`;
}

export function handleExploreInput(event) {
  if (event.target.id !== 'search') return false;
  state.search = event.target.value;
  filterExplore();
  return true;
}

export async function handleChallengeClick(button, { reload, render, notify }) {
  if (button.dataset.filter) {
    state.filter = button.dataset.filter;
    filterExplore();
  } else if (button.dataset.join) {
    await request(`/api/challenges/${encodeURIComponent(button.dataset.join)}/join`, { method: 'POST', body: '{}' });
    await reload();
    notify('You joined the challenge.');
  } else if (button.dataset.upload !== undefined) {
    state.uploadStep = `${button.dataset.challenge}:${button.dataset.upload}`;
    render();
  } else if (button.hasAttribute('data-cancel-upload')) {
    state.uploadStep = null;
    render();
  } else if (button.hasAttribute('data-add-step')) {
    const holder = document.querySelector('#create-steps');
    if (holder.children.length >= 5) throw new Error('A challenge can have at most 5 steps.');
    holder.insertAdjacentHTML('beforeend', createStep(holder.children.length + 1));
  } else if (button.hasAttribute('data-remove-step')) {
    button.closest('[data-step-fields]').remove();
    document.querySelectorAll('[data-step-fields]').forEach((step, index) => {
      step.querySelector('strong').textContent = `Step ${index + 1}`;
    });
  } else return false;
  return true;
}

export async function submitChallenge(form, { reload, notify }) {
  const fields = Object.fromEntries(new FormData(form));
  const steps = [...form.querySelectorAll('[data-step-fields]')].map(step => ({
    title: step.querySelector('[name=stepTitle]').value,
    instruction: step.querySelector('[name=instruction]').value,
    proof: step.querySelector('[name=proof]').value
  }));
  await request('/api/challenges', {
    method: 'POST', body: JSON.stringify({ title: fields.title, description: fields.description, category: fields.category, steps })
  });
  await reload();
  location.hash = '#/dashboard';
  notify('Challenge submitted for review.');
}
