import { state, currentRoute, getChallenge, loadData, escapeHtml, initials, link, emptyState } from './core.js';
import { renderHome } from './features/home.js';
import { renderAuth, handleAuthClick, submitAuth } from './features/auth.js';
import { renderExplore, filterExplore, renderDetail, renderCreate, handleExploreInput, handleChallengeClick, submitChallenge } from './features/challenges.js';
import { renderDashboard, renderProfile } from './features/profile.js';
import { renderReviewer, handleReviewClick } from './features/review.js';
import { submitProof } from './features/proofs.js';

const app = document.querySelector('#app');
const accountActions = document.querySelector('#account-actions');
const toastElement = document.querySelector('#toast');

function notify(message, isError = false) {
  toastElement.textContent = message;
  toastElement.className = `toast is-visible${isError ? ' is-error' : ''}`;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toastElement.className = 'toast', 4000);
}

async function reload() {
  await loadData();
  render();
}

function renderNavigation() {
  const user = state.data.user;
  accountActions.innerHTML = user
    ? `${user.role === 'reviewer' ? '<a class="review-nav" href="#/reviewer">Review queue</a>' : ''}<a class="account-link" href="#/profile"><span class="account-monogram">${escapeHtml(initials(user.name))}</span><span>${escapeHtml(user.name.split(' ')[0])}</span></a><button class="logout-button" data-logout>Sign out</button>`
    : `<a class="login-link" href="#/login">Sign in</a><a class="button button--solid button--small" href="#/register">Sign up</a>`;
  const page = currentRoute().split('/')[1] || 'home';
  document.querySelectorAll('[data-nav]').forEach(item => item.classList.toggle('is-active', item.dataset.nav === page));
}

function render() {
  if (!state.data) return;
  const page = currentRoute();
  const user = state.data.user;
  if (['/dashboard', '/profile', '/create'].includes(page) && !user) {
    location.hash = '#/login';
    return;
  }
  if (page === '/reviewer' && user?.role !== 'reviewer') {
    location.hash = '#/';
    return;
  }

  renderNavigation();
  if (page === '/') app.innerHTML = renderHome();
  else if (page === '/explore') { app.innerHTML = renderExplore(); filterExplore(); }
  else if (page === '/dashboard') app.innerHTML = renderDashboard();
  else if (page === '/profile') app.innerHTML = renderProfile();
  else if (page === '/login' || page === '/register') app.innerHTML = renderAuth(page.slice(1));
  else if (page === '/create') app.innerHTML = renderCreate();
  else if (page === '/reviewer') app.innerHTML = renderReviewer();
  else if (page.startsWith('/challenge/')) {
    const challenge = getChallenge(page.split('/')[2]);
    app.innerHTML = challenge?.status === 'published'
      ? renderDetail(challenge)
      : `<div class="container page-layout">${emptyState('Challenge not found', 'It may not be published yet, or it is no longer available.', link('#/explore', 'Back to challenges', 'line'))}</div>`;
  } else app.innerHTML = `<div class="container page-layout">${emptyState('Page not found', 'Check the address and try again.', link('#/', 'Back to home', 'line'))}</div>`;
}

window.addEventListener('hashchange', () => {
  state.uploadStep = null;
  render();
  window.scrollTo(0, 0);
});

document.addEventListener('input', handleExploreInput);

document.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button) return;
  try {
    const context = { reload, render, notify };
    if (await handleAuthClick(button, context)) return;
    if (await handleChallengeClick(button, context)) return;
    await handleReviewClick(button, context);
  } catch (error) {
    notify(error.message, true);
  }
});

document.addEventListener('submit', async event => {
  const form = event.target;
  if (!['auth-form', 'create-form'].includes(form.id) && !form.classList.contains('upload-form')) return;
  event.preventDefault();
  const submitButton = form.querySelector('[type=submit]');
  submitButton.disabled = true;
  try {
    const context = { reload, notify };
    if (form.id === 'auth-form') await submitAuth(form, context);
    else if (form.id === 'create-form') await submitChallenge(form, context);
    else await submitProof(form, context);
  } catch (error) {
    notify(error.message, true);
  } finally {
    if (submitButton.isConnected) submitButton.disabled = false;
  }
});

loadData().then(render).catch(error => {
  app.innerHTML = `<div class="container page-layout">${emptyState('Cannot reach the server', 'Run npm start, then reload this page.')}</div>`;
  notify(error.message, true);
});
