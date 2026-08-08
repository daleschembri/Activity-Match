# Supabase setup for Activity Match

Your Supabase project ref (from MCP config): **`iemlgwsnujyymuswsqeu`**

Follow these steps in order. The app will not use real data until all of them are done.

---

## 1. Install the Supabase CLI

```powershell
npm install -g supabase
```

Or use npx without installing globally: `npx supabase ...`

---

## 2. Log in and link your project

```powershell
cd F:\xampp\htdocs\Activity-Match

supabase login
supabase link --project-ref iemlgwsnujyymuswsqeu
```

---

## 3. Push the database schema

This creates all tables, functions, RLS policies, and seed data (categories, locations):

```powershell
supabase db push
```

If `db push` fails on PostGIS, enable it in the Supabase Dashboard first:

1. Go to [Database → Extensions](https://supabase.com/dashboard/project/bllvvbqkqvztgmogqowf/database/extensions)
2. Enable **postgis** and **pgcrypto**

Then run `supabase db push` again.

### "Database error saving new user" on signup

The profile-creation trigger failed. Common causes: PostGIS not on search path, or display name too short.

**Quick fix** — run in [SQL Editor](https://supabase.com/dashboard/project/bllvvbqkqvztgmogqowf/sql/new):

- Copy contents of `supabase/scripts/fix_signup_trigger.sql`

Or apply the migration:

```powershell
supabase db push
```

Then try signing up again (use a new email if the previous attempt created a broken auth user).

### `gen_random_bytes does not exist`

This happens when a migration partially applied. Fix:

1. Run the cleanup script in [SQL Editor](https://supabase.com/dashboard/project/bllvvbqkqvztgmogqowf/sql/new):
   - Copy contents of `supabase/scripts/repair_failed_core_migration.sql`
2. Run `supabase db push` again

---

## 4. Configure the web app environment

You need **two values** from [Project Settings → API](https://supabase.com/dashboard/project/bllvvbqkqvztgmogqowf/settings/api):

| Dashboard label | Use in web app? | Where |
|---|---|---|
| **Project URL** | Yes | `VITE_SUPABASE_URL` |
| **Publishable key** (anon) | Yes | `VITE_SUPABASE_ANON_KEY` |
| **Secret key** (service_role) | **No** | Never in the frontend — server/CLI only |

### Setup steps

1. Open `apps/web/.env` (already created for you with the project URL)
2. Paste your **publishable key** after `VITE_SUPABASE_ANON_KEY=`
3. Save the file — it should look like:

```env
VITE_SUPABASE_URL=https://bllvvbqkqvztgmogqowf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

4. **Restart the dev server** (required after any `.env` change):

```powershell
npm run dev
```

> **Security:** The publishable key is safe to use in the browser (RLS protects your data). The **secret key** bypasses RLS — only use it in Supabase Edge Functions, backend scripts, or the SQL editor, never in `apps/web/.env`.

---

## 5. Configure Auth (for local development)

In [Authentication → Providers → Email](https://supabase.com/dashboard/project/bllvvbqkqvztgmogqowf/auth/providers):

- Enable **Email** provider
- For development, turn **OFF** "Confirm email" so you can sign in immediately after signup

In [Authentication → URL Configuration](https://supabase.com/dashboard/project/bllvvbqkqvztgmogqowf/auth/url-configuration):

- **Site URL:** `http://localhost:5173`
- **Redirect URLs:** add `http://localhost:5173/**`

---

## 6. Start the app and create an account

```powershell
npm run dev
```

1. Open http://localhost:5173 — you will be redirected to **/auth**
2. **Sign up** with email + password
3. Complete **interests** and **availability** onboarding
4. You will land on the **Discover** feed (empty until activities exist)

---

## 7. Create your first activity

1. Tap **Create** in the bottom nav
2. Describe an activity or use **Fill in manually**
3. Pick a category and **Publish**
4. The activity appears in Discover and My Plans

---

## 8. (Optional) Deploy Edge Functions

Core features work via direct database queries. Edge functions add:

| Function | Purpose |
|---|---|
| `draft-from-text` | AI extraction for activity creation |
| `resolve-public-activity` | Cached public share pages |
| `create-guest-interest` | Guest signup via share links |

Deploy all:

```powershell
supabase functions deploy get-feed
supabase functions deploy record-swipe
supabase functions deploy draft-from-text
supabase functions deploy resolve-public-activity
supabase functions deploy create-guest-interest
```

---

## 9. (Optional) Seed sample activities

Run this in [SQL Editor](https://supabase.com/dashboard/project/bllvvbqkqvztgmogqowf/sql/new) after signing up (replace `YOUR_USER_ID` with your auth user UUID from Authentication → Users):

```sql
-- Get your user id from: select id from auth.users;
INSERT INTO activities (
  host_user_id, listing_type, title, description, category_id,
  starts_at, duration_minutes, location_id, capacity,
  status, published_at, visibility
)
SELECT
  'YOUR_USER_ID'::uuid,
  'confirmed',
  'Tuesday Board Games Night',
  'Casual board games for all levels. Bring your favourites!',
  (SELECT id FROM categories WHERE name = 'Board Games' LIMIT 1),
  now() + interval '3 days',
  180,
  (SELECT id FROM locations LIMIT 1),
  8,
  'published',
  now(),
  'public';
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Blank feed after login | No published activities yet — create one via Create |
| "relation does not exist" | Run `supabase db push` |
| Auth redirect loop | Check `.env` values and restart dev server |
| Sign up does nothing | Disable email confirmation in Auth settings |
| RLS permission denied | Ensure migrations ran; profile is auto-created on signup |
| Still seeing demo data | `.env` is missing or dev server wasn't restarted |

---

## How to verify it's working

- [ ] `.env` has real URL and anon key
- [ ] `supabase db push` completed without errors
- [ ] Sign up redirects to onboarding (not demo)
- [ ] Profile page shows your account name from `profiles` table
- [ ] Creating an activity persists after page refresh
- [ ] Discover feed shows your published activities
