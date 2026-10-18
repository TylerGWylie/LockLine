# Confidence League

A confidence-pool football league website: commissioner publishes each week's games with a frozen opening spread, teams rank their confidence picks, and the site tracks weekly/season standings plus a what-if calculator.

See the MVP plan for full scope and architecture decisions.

## Project layout

- `backend/` — Node.js + TypeScript + Express API, Prisma ORM, PostgreSQL.
- `frontend/` — React + TypeScript SPA (Vite).

## Local development

### Backend

```
cd backend
copy .env.example .env   # then fill in a real DATABASE_URL and secrets
npm install
npm run prisma:generate
npm run dev               # http://localhost:4000
```

A local PostgreSQL database is required for anything beyond the `/health` check — set `DATABASE_URL` in `backend/.env`, then run `npm run prisma:migrate` to create the schema.

### Frontend

```
cd frontend
npm install
npm run dev                # http://localhost:5173
```

The frontend reads the API base URL from `VITE_API_URL` in `frontend/.env` (defaults to `http://localhost:4000`).
