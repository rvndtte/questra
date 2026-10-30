# Skill Unlocked

A web development competition prototype built with plain HTML, CSS, and JavaScript, plus a Node.js server with no external dependencies. Learners join challenges, upload photo or video proof for each step, and earn a badge once a reviewer approves every step. Anyone signed in can also propose a challenge of 1–5 steps.

## Run it locally

Requires Node.js 22 or newer.

```sh
npm install
npm start
```

Open `http://127.0.0.1:3000`. With no `DATABASE_URL`, the app uses an embedded Postgres (PGlite) stored in `data/pglite`, so nothing else needs to be set up. To use another port: `PORT=3001 npm start`.

To run against a real database locally, copy `.env.example` to `.env` and fill it in.

## Deploy to Vercel

The static files in `public/` and the API in `api/index.js` (a single serverless function) deploy together.

1. Push the repository to GitHub and import it in Vercel. No build command is needed.
2. In the project's **Storage** tab (or Vercel Marketplace), add a **Neon Postgres** database. This sets `DATABASE_URL` automatically.
3. Add an environment variable `SESSION_SECRET` with a long random value (`openssl rand -hex 32`).
4. Deploy. Tables and the demo data are created on the first request.

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Learner | `learner@demo.test` | `learner123` |
| Reviewer | `reviewer@demo.test` | `reviewer123` |

Quick walkthrough: sign in as the learner → open a one-step challenge → join it → upload a photo or video → sign out → sign in as the reviewer → approve the proof → sign back in as the learner → see the badge on the Badges page.

## Storage and limits

- Accounts, challenges, proofs, and badges live in Postgres. Proof files are stored in the `media` table as base64.
- Proof files can be up to 4 MB, because Vercel limits request bodies to 4.5 MB. Supported formats: JPG, PNG, WebP, MP4, WebM. Only the owner and reviewers can read a proof. For larger videos, move uploads to Vercel Blob with client-side uploads.
- Sessions are signed cookies valid for 7 days. Signing out clears the cookie but cannot revoke a copied token before it expires.
- The demo accounts are meant for presentations. Before a public launch, remove the demo credentials, add reviewer management, validate media content, and add rate limiting.
- A badge means a reviewer checked the proof. It is not a professional certification of a skill.

## Project layout

```text
public/index.html          Page shell
public/app.js              Browser entry point
public/style.css           Stylesheet entry point
public/src/client/         Browser code: routing, views, styles
api/index.js               Vercel serverless function (all /api and /uploads requests)
vercel.json                Output directory and rewrites
server.js                  Local development server
src/server/handler.js      Request entry shared by Vercel and local server
src/server/api.js          API routing and the bootstrap payload
src/server/auth.js         Accounts and signed-cookie sessions
src/server/challenges.js   Creating, reviewing, and joining challenges
src/server/proofs.js       Proof uploads and review
src/server/store.js        Postgres access, schema, and seeding
src/server/seed.js         Starter challenges and demo accounts
```
