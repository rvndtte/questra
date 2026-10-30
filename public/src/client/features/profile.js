import { state, enrolled, progress, badge, escapeHtml, initials, formatDate, link, emptyState, pageHead, stats, plural } from '../core.js';
import { challengeCard } from './challenges.js';

export function renderDashboard() {
  const user = state.data.user;
  const joined = state.data.challenges.filter(item => item.status === 'published' && enrolled(item.id));
  const proposed = state.data.challenges.filter(item => item.creatorId === user.id && item.status !== 'published');
  const pending = state.data.submissions.filter(item => item.userId === user.id && item.status === 'pending').length;
  return `<div class="container page-layout">
    ${pageHead('My progress', `Hi ${escapeHtml(user.name.split(' ')[0])}. Continue from your last step.`)}
    ${stats([['Challenges joined', joined.length], ['Badges earned', state.data.badges.length], ['Proofs in review', pending]])}
    <div class="subheading"><h2>Your challenges</h2>${link('#/explore', 'Find more', 'text')}</div>
    <div class="catalog-grid">${joined.length ? joined.map(challengeCard).join('') : emptyState('Nothing started yet', 'Join a challenge and begin with its first step.', link('#/explore', 'Browse challenges'))}</div>
    ${proposed.length ? `<section class="proposals"><div class="subheading"><h2>Your proposals</h2></div>${proposed.map(item => `<div class="proposal-row"><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.category)} · ${plural(item.steps.length, 'step')}${item.reason ? ` · Reviewer note: ${escapeHtml(item.reason)}` : ''}</p></div><span class="status ${item.status === 'rejected' ? 'is-rejected' : 'is-pending'}">${item.status === 'rejected' ? 'Needs changes' : 'In review'}</span></div>`).join('')}</section>` : ''}
  </div>`;
}

export function renderProfile() {
  const user = state.data.user;
  const published = state.data.challenges.filter(item => item.status === 'published');
  return `<div class="container page-layout">
    <div class="profile-heading"><span class="avatar avatar--large">${escapeHtml(initials(user.name))}</span><div><h1>${escapeHtml(user.name)}</h1><p>${escapeHtml(user.email)}</p></div></div>
    <div class="subheading"><h2>Badges</h2><span class="muted">${state.data.badges.length} of ${published.length} earned</span></div>
    <div class="badge-grid">${published.map(item => {
      const earned = badge(item.id);
      return `<a class="badge-card ${earned ? 'is-earned' : 'is-locked'}" href="#/challenge/${escapeHtml(item.id)}"><div class="badge-emblem" aria-hidden="true">${escapeHtml(item.category.slice(0, 2))}</div><div><h3>${escapeHtml(item.title)}</h3><p>${earned ? `Earned ${formatDate(earned.issuedAt)}` : `${progress(item)} of ${item.steps.length} steps done`}</p></div></a>`;
    }).join('')}</div>
  </div>`;
}
