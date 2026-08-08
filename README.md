# Activity Match

Mobile-first React PWA for discovering and joining local activities.

## Stack

- **Frontend:** Vite + React 19 + TypeScript + Tailwind CSS v4 + React Router + TanStack Query
- **Backend:** Supabase (Postgres + PostGIS, Auth, Realtime, Edge Functions)
- **Design:** Stitch exports in `stitch/action-deck/` (Action Deck project)

## Getting started

### Quick start (Windows)

1. **Install [Node.js](https://nodejs.org/)** (LTS, v20+) if you don't have it
2. **Double-click `start.bat`** in the project folder, or run:

```bash
npm install
npm run dev
```

3. **Open in your browser:** [http://localhost:5173](http://localhost:5173)

### Important: this is NOT a XAMPP/PHP app

Even though the project lives in `xampp/htdocs`, it is a **React + Vite** app. Apache/XAMPP will **not** serve it.

| Works | Does NOT work |
|---|---|
| `http://localhost:5173` | `http://localhost/Activity-Match` |
| `npm run dev` (keep terminal open) | Opening `index.html` directly |

The dev server must stay running in a terminal window while you use the app.

## Project structure

```
apps/web/           React PWA (all 16 Stitch screens as routes)
packages/shared/    Zod schemas, types, error codes
packages/ui/        Design system from Stitch tokens
supabase/           Migrations, Edge Functions, config
stitch/action-deck/ Design references (HTML + PNG)
```

## Routes (Stitch screen mapping)

| Route | Stitch screen |
|---|---|
| `/` | Discover Activities |
| `/filters` | Filter Activities |
| `/feed/exhausted` | End of Feed |
| `/activities/:id` | Activity Details |
| `/host/requests` | Join Requests |
| `/waitlist/:requestId` | Waitlist Claim |
| `/create/describe` | New Activity - Describe |
| `/create/review` | New Activity - Review |
| `/onboarding/interests` | Interests Onboarding |
| `/onboarding/availability` | Availability Onboarding |
| `/plans` | My Plans |
| `/activities/:id/chat` | Activity Chat |
| `/activities/:id/feedback` | Post-Activity Feedback |
| `/profile` | Profile |
| `/a/:slug` | Shared Activity Web View |
| `/groups/:id` | Tuesday Board Games Group |

## Supabase setup

1. Link your project: `npx supabase link --project-ref YOUR_REF`
2. Apply migrations: `npx supabase db push`
3. Deploy edge functions: `npx supabase functions deploy`

Migrations include the full domain model from `development-spec.md`: activities, join requests, participations, discovery, chat, groups, guests, and background job hooks.

## Spec implementation stages

All 9 build stages from `development-spec.md` are implemented:

1. Core entities and activity lifecycle
2. Join, capacity, acceptance modes, waitlist
3. Discovery feed, swipes, filters, onboarding
4. Conversations, system messages, realtime chat
5. Free-text activity creation with extraction
6. Attendance, reliability, feedback
7. Public sharing and guest access
8. Recurring groups and sessions
9. Proposed plans, ideas, quorum, promotion

## Scripts

- `npm run dev` — start web app
- `npm run build` — production build
- `npm run typecheck` — TypeScript check all packages
