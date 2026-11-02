# Consulting Advice Grove

A password-protected page for sharing consulting recruiting tips, hosted on
**Cloudflare Pages** with tips stored in **Supabase**.

- Browse tips in up to 3 cards per row, filter by category
- Add a tip: title, category, contributor (or anonymous), source, and body (max 250 words)
- New tips from other people appear automatically (the page re-checks every 30 seconds)

## How it fits together

```
public/              static page (HTML, CSS, JS) — no secrets in here
functions/api/       Cloudflare Pages Functions (run on Cloudflare's servers)
  _middleware.js     blocks every /api request without a valid login cookie
  login.js           checks the password against the SITE_PASSWORD secret
  session.js         tells the page whether you're already logged in
  tips.js            reads/adds tips in Supabase using the SUPABASE_KEY secret
lib/session.js       signed, HttpOnly login cookie (lasts 7 days)
supabase/schema.sql  database table + access rules
wrangler.toml        Cloudflare config (Supabase URL is set here)
```

The browser never sees the password or the Supabase key. Visitors without the
password can't load or post tips.

## Setup

### 1. Supabase (once)

In the Supabase dashboard, open **SQL Editor → New query**, paste
[`supabase/schema.sql`](supabase/schema.sql), and click **Run**.

### 2. Cloudflare Pages

1. In the Cloudflare dashboard go to **Workers & Pages → Create → Pages →
   Connect to Git** and pick this repository and branch.
2. Build settings: framework preset **None**, build command **empty**, build
   output directory **`public`**.
3. Under **Settings → Variables and Secrets**, add two variables of type
   **Secret** (for Production, and Preview if you use it):
   - `SITE_PASSWORD` — the password visitors type
   - `SUPABASE_KEY` — your Supabase publishable key (`sb_publishable_...`)
4. Redeploy (**Deployments → … → Retry deployment**) so the secrets take effect.

`SUPABASE_URL` is already set in `wrangler.toml`. Changing `SITE_PASSWORD` later
logs everyone out.

## Running locally

```bash
npx wrangler pages dev public --binding SITE_PASSWORD=yourpassword --binding SUPABASE_KEY=sb_publishable_...
```

## Moderating

Visitors can't edit or delete tips. To remove one, open **Table Editor → tips** in
Supabase and delete the row.

Supabase pauses free projects after about a week of no activity; resume it from the
dashboard if the site says it can't load tips.
