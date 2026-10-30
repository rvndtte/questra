import { state, artwork, escapeHtml, link, sectionHeading, plural, stats } from '../core.js';
import { challengeCard } from './challenges.js';

export function renderHome() {
  const published = state.data.challenges.filter(item => item.status === 'published');
  const today = published[Math.floor(Date.now() / 86400000) % published.length];
  const counts = state.data.counts;

  return `<div class="home-page">
    <section class="hero container">
      <div class="hero-copy">
        <h1>Learn something new.<br>Show your proof.</h1>
        <p class="hero-description">Pick a small, practical challenge and work through it step by step. Submit a photo or video at each step, and earn a badge once a reviewer signs off.</p>
        <div class="hero-actions">${link('#/explore', 'Browse challenges')}${link('#/create', 'Create a challenge', 'line')}</div>
        ${stats([['Challenges', counts.challenges], ['Learners', counts.learners], ['Badges earned', counts.badges]])}
      </div>
      <a class="hero-card" href="#/challenge/${escapeHtml(today.id)}">
        ${artwork(today)}
        <div class="hero-card-body">
          <span class="eyebrow">Today's pick</span>
          <h2>${escapeHtml(today.title)}</h2>
          <p>${escapeHtml(today.description)}</p>
          <span class="meta">${plural(today.steps.length, 'step')} · ${escapeHtml(today.duration)} · ${escapeHtml(today.level)}</span>
        </div>
      </a>
    </section>

    <section class="section container">
      ${sectionHeading('How it works')}
      <ol class="process-grid">
        <li><span>1</span><h3>Choose a challenge</h3><p>Browse by category and join one that sounds interesting.</p></li>
        <li><span>2</span><h3>Submit proof for each step</h3><p>Do the work, then upload a photo or video that shows it.</p></li>
        <li><span>3</span><h3>Earn the badge</h3><p>A reviewer checks your proof against the criteria. When every step passes, the badge is yours.</p></li>
      </ol>
    </section>

    <section class="section container">
      <div class="section-row">${sectionHeading('Featured challenges')}${link('#/explore', 'View all', 'text')}</div>
      <div class="catalog-grid">${published.slice(0, 3).map(challengeCard).join('')}</div>
    </section>

    <section class="container closing"><div>
      <h2>Have a skill to teach?</h2>
      <p>Break it into steps, say what proof looks like, and submit it for review. Approved challenges join the catalog.</p>
    </div>${link('#/create', 'Create a challenge')}</section>
  </div>`;
}
