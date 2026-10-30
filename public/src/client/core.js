export const state = { data: null, filter: 'All', search: '', uploadStep: null };
export const categories = ['All', 'Logic', 'Life', 'Communication', 'Creative'];

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

export function formatDate(value) {
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

export function initials(name) {
  return String(name || '?').split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
}

export const categorySlug = category => String(category || '').toLowerCase();
export const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

export function artwork(challenge) {
  return `<div class="artwork artwork--${escapeHtml(categorySlug(challenge.category))}" aria-hidden="true"><div class="artwork-shape"></div><span class="artwork-label">${escapeHtml(challenge.category)}</span></div>`;
}

export async function request(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'The request failed.');
  return result;
}

export async function loadData() {
  state.data = await request('/api/bootstrap');
}

export const currentRoute = () => location.hash.slice(1) || '/';
export const getChallenge = id => state.data?.challenges.find(item => item.id === id);
export const enrolled = id => state.data?.enrollments.some(item => item.challengeId === id);
export const ownSubmissions = (challengeId, stepIndex) => state.data?.submissions.filter(item =>
  item.challengeId === challengeId && item.stepIndex === stepIndex && item.userId === state.data.user?.id
) || [];
export const approved = (challengeId, stepIndex) => ownSubmissions(challengeId, stepIndex).some(item => item.status === 'approved');
export const latestSubmission = (challengeId, stepIndex) => ownSubmissions(challengeId, stepIndex).at(-1);
export const progress = challenge => challenge.steps.filter((_, index) => approved(challenge.id, index)).length;
export const badge = challengeId => state.data?.badges.find(item => item.challengeId === challengeId);

export function link(href, label, variant = 'solid') {
  return `<a class="button button--${variant}" href="${href}">${label}</a>`;
}

export function sectionHeading(title, description = '') {
  return `<div class="section-heading"><h2>${title}</h2>${description ? `<p>${description}</p>` : ''}</div>`;
}

export function pageHead(title, description = '') {
  return `<div class="page-head"><h1>${title}</h1>${description ? `<p>${description}</p>` : ''}</div>`;
}

export function emptyState(title, description, action = '') {
  return `<div class="empty-state"><h3>${title}</h3><p>${description}</p>${action}</div>`;
}

export function stats(items) {
  return `<dl class="stats">${items.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl>`;
}
