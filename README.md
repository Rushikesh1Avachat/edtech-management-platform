# EduTrack AI

EduTrack AI is a role-based learning management platform for instructors, administrators, and students. It combines course management with Gemini-powered curriculum generation, automated assignment feedback, Stripe enrollment, and lesson progress tracking.

## Highlights

- JWT authentication with `ADMIN`, `INSTRUCTOR`, and `STUDENT` roles.
- AI-generated course titles, descriptions, modules, lessons, and assignments.
- Atomic course publishing: generated curriculum is saved with the course.
- Course catalog filtering, free enrollment, Stripe checkout, and webhook fulfillment.
- Durable lesson completion and enrollment progress percentages.
- AI-assisted assignment grading and instructor analytics.
- PostgreSQL through Drizzle ORM with PGlite fallback for local/demo environments.

## Local setup

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

Create a `.env` file:

```env
DATABASE_URL=postgres://user:password@localhost:5432/edutrack
JWT_SECRET=replace-with-a-long-random-secret
GEMINI_API_KEY=your-gemini-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`DATABASE_URL` and `GEMINI_API_KEY` can be omitted for the local fallback/demo experience. Stripe requires both Stripe secrets to complete paid enrollment.

### Vercel / Production environment

When deploying to Vercel, set the following environment variables in your Vercel project settings (Dashboard → Settings → Environment Variables):

 - `NEXT_PUBLIC_APP_URL` — the canonical app URL (e.g., `https://edtech-management-platform-8bp99i9i0.vercel.app`) — recommended.
 - `STRIPE_SECRET_KEY` — your Stripe secret key (starts with `sk_`).
 - `STRIPE_WEBHOOK_SECRET` — the webhook signing secret (starts with `whsec_`).
 - `DATABASE_URL` — production Postgres connection string.
 - `JWT_SECRET` — a long, random secret for signing JWTs.

Vercel also provides the `VERCEL_URL` runtime variable automatically; the app will use it when `NEXT_PUBLIC_APP_URL` is not set.

If you want the Stripe checkout to redirect back to your deployed site, make sure `NEXT_PUBLIC_APP_URL` matches the production domain. The app also defaults to:

`https://edtech-management-platform-8bp99i9i0.vercel.app`

if `NODE_ENV === 'production'` and no other URL vars are set.

## Demo accounts

All demo accounts use `password123`:

| Role | Email |
|---|---|
| Admin | `admin@edutrack.com` |
| Instructor | `instructor@edutrack.com` |
| Student | `student@edutrack.com` |

## Demo walkthrough

1. Open `/login` and use the Instructor demo account.
2. Create a course; Gemini fills the course details and curriculum automatically.
3. Confirm the generated course appears in the dashboard with modules and assignments.
4. Open the Student demo account, enroll in a free course, and mark lessons complete.
5. Submit an assignment and review the generated grade and AI feedback.
6. For paid checkout, configure Stripe test keys and use card `4242 4242 4242 4242`.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start local development |
| `npm run build` | Create a production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest tests |
| `npx playwright test` | Run browser workflow tests |
| `npm run db:push` | Apply the Drizzle schema |
| `npm run db:seed` | Seed demo data |

## Architecture

- `src/app`: pages and route handlers.
- `src/components`: reusable client UI.
- `src/db`: Drizzle schema, database connection, and seed data.
- `src/lib/auth.ts`: JWT and password helpers.
- `src/lib/ai.ts`: Gemini integration and offline fallback generation.
- `drizzle`: schema snapshots and SQL migrations.
