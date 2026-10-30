import { request } from '../core.js';

export function renderAuth(kind) {
  const register = kind === 'register';
  return `<div class="container auth-layout">
    <div class="auth-intro">
      <h1>${register ? 'Create your account' : 'Welcome back'}</h1>
      <p>${register ? 'Save your progress and collect badges for the skills you prove.' : 'Pick up the challenges you started.'}</p>
    </div>
    <div class="auth-panel">
      <form id="auth-form" data-kind="${kind}">
        ${register ? `<label class="field"><span>Name</span><input name="name" minlength="2" maxlength="50" autocomplete="name" required></label>` : ''}
        <label class="field"><span>Email</span><input type="email" name="email" autocomplete="email" required placeholder="you@example.com"></label>
        <label class="field"><span>Password</span><input type="password" name="password" minlength="8" autocomplete="${register ? 'new-password' : 'current-password'}" required>${register ? '<small>At least 8 characters.</small>' : ''}</label>
        <button class="button button--solid button--full" type="submit">${register ? 'Create account' : 'Sign in'}</button>
      </form>
      <p class="form-switch">${register ? 'Already have an account? <a href="#/login">Sign in</a>' : 'New here? <a href="#/register">Create an account</a>'}</p>
      <div class="demo-access">
        <p>Want to look around? Fill in a demo account.</p>
        <div><button type="button" data-demo="learner">Learner</button><button type="button" data-demo="reviewer">Reviewer</button></div>
      </div>
    </div>
  </div>`;
}

export async function handleAuthClick(button, { reload, notify }) {
  if (button.dataset.demo) {
    const form = document.querySelector('#auth-form');
    form.elements.email.value = `${button.dataset.demo}@demo.test`;
    form.elements.password.value = `${button.dataset.demo}123`;
    return true;
  }
  if (button.hasAttribute('data-logout')) {
    await request('/api/logout', { method: 'POST', body: '{}' });
    await reload();
    location.hash = '#/';
    notify('You have been signed out.');
    return true;
  }
  return false;
}

export async function submitAuth(form, { reload, notify }) {
  await request(`/api/${form.dataset.kind}`, {
    method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form)))
  });
  await reload();
  location.hash = '#/dashboard';
  notify(form.dataset.kind === 'register' ? 'Account created. Welcome!' : 'Welcome back.');
}
