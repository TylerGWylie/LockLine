# Deploying Lockline

Reference checklist for taking Lockline from local-only to live. Nothing here needs to happen
until you're ready — the app runs entirely locally until you work through this.

Target stack: **GitHub** (source) → **Railway** (backend API + Postgres) → **Vercel** (frontend).

## Status

- [x] Code pushed to GitHub: https://github.com/TylerGWylie/LockLine
- [ ] Backend deployed on Railway
- [ ] Postgres database on Railway
- [ ] Frontend deployed on Vercel
- [ ] Real email provider wired up (currently a no-op stub)
- [ ] Custom domain (optional)

## 1. GitHub

Already done. Every time you want to ship a change, pushing to `main` is all that's needed —
Railway and Vercel both auto-deploy on push once they're connected (steps below).

## 2. Railway — backend + Postgres

1. [railway.app](https://railway.app) → sign up/log in with GitHub.
2. **New Project** → **Deploy from GitHub repo** → select `TylerGWylie/LockLine`.
3. **Important — this is a monorepo, not a single app at the repo root.** Click into the service
   Railway created → **Settings** → **Source** → set **Root Directory** to `backend` and make sure
   it actually saves (easy to type it and click away without committing it — if the build logs show
   the repo root listing `backend/`, `frontend/`, etc. instead of installing npm packages, this
   didn't take and needs to be set again).
4. Still in Settings → **Deploy**: confirm **Build Command** is `npm run build` and **Start
   Command** is `npm start` (should auto-detect from `package.json`, but verify).
5. **New** (top of project) → **Database** → **Add PostgreSQL**.
6. Click into the **backend service** → **Variables** tab → add:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Use Railway's variable-reference option to pull this from the Postgres service rather than typing it by hand, so it stays in sync if it ever changes. |
   | `JWT_ACCESS_SECRET` | A long random string — generate one with `[Convert]::ToBase64String((1..48 \| ForEach-Object { Get-Random -Maximum 256 }))` in PowerShell. Don't reuse a value that's ever been shared anywhere (chat, docs, etc.) — generate fresh. |
   | `ODDS_API_KEY` | Your Odds API key (same one from `backend/.env` locally). |
   | `ODDS_API_BOOKMAKER` | `draftkings` |

   Don't set `PORT` — Railway injects it, and the app already reads `process.env.PORT`.
7. Wait for the deploy to go green in the **Deployments** tab. Logs should end with
   `Lockline API listening on port ...`. (The start script runs `prisma migrate deploy`
   automatically before booting, so the database schema gets created/updated on every deploy —
   nothing manual needed here.)
8. **Settings** → **Networking** → **Generate Domain** to get a public URL
   (`https://something.up.railway.app`).
9. Verify: visit `<that-url>/health` — should return `{"status":"ok"}`.

**Reliability note**: the picks-lock and score-polling jobs (`node-cron`) run inside the backend
process itself, not a separate worker. The service needs to stay running continuously — don't use
a tier that spins down on idle, or weeks will stop auto-locking and scores will stop updating.

## 3. Vercel — frontend

1. [vercel.com](https://vercel.com) → sign up/log in with GitHub.
2. **Add New...** → **Project** → import `TylerGWylie/LockLine`.
3. On the import screen, click **Edit** next to Root Directory → set it to `frontend`.
4. Framework Preset should auto-detect as **Vite** — leave build/output settings as detected.
5. Add an environment variable: `VITE_API_URL` = the Railway backend URL from step 2.9 above
   (no trailing slash).
6. **Deploy**. Once it finishes, visit the `*.vercel.app` URL it gives you — you should see the
   Lockline welcome page, and signup/login should work end-to-end against the Railway backend.

## 4. Real email

Right now `sendMail()` in `backend/src/services/mailer.ts` just logs to the console — no email
actually goes out anywhere. To make the picks-locked / results-final / line-correction / week-
published emails real:

1. Sign up for an email provider — Resend or Postmark both have usable free tiers.
2. Get an API key, and either verify your own sending domain or use the provider's shared test
   domain to start.
3. Add the provider's API key as a Railway environment variable on the backend service.
4. Swap the body of `sendMail()` to call the provider's API instead of `console.log`. Every
   notification in the app already goes through this one function, so this is a contained change.

## 5. Custom domain (optional)

- **Frontend**: Vercel project → **Settings** → **Domains** → add your domain, then create the
  DNS records it shows you with your domain registrar.
- **Backend**: Railway service → **Settings** → **Networking** → **Custom Domain**, same idea
  (a CNAME record pointing at Railway).
- If you add a custom frontend domain, update `VITE_API_URL` if the backend domain changes too,
  and redeploy the frontend.

## Gotchas worth remembering

- `JWT_ACCESS_SECRET` is required — the server refuses to start without it (no insecure default).
- This is a monorepo. Every host needs to be told the subfolder (`backend` or `frontend`) —
  nothing deploys correctly from the repo root.
- `backend/package.json`'s `start` script runs `prisma migrate deploy` before launching the
  server, so schema changes ship automatically on every deploy — no separate migration step.
