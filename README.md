# Consulting Advice Grove

A password-protected page for sharing consulting recruiting tips, hosted as a
**Cloudflare Worker** with tips stored in **Supabase**.

- Browse tips in up to 3 cards per row, filter by category
- Add a tip: title, category, contributor (or anonymous), source, and body (max 250 words)
- New tips from other people appear automatically (the page re-checks every 30 seconds)

## How it fits together

```
public/              static page (HTML, CSS, JS) — no secrets in here
src/worker.js        the Worker: serves public/ and handles /api/* (login, session, tips)
src/session.js       password check + signed, HttpOnly login cookie (lasts 7 days)
src/tips.js          reads/adds tips in Supabase using the SUPABASE_KEY secret
supabase/schema.sql  database table + access rules
wrangler.toml        Worker config (Supabase URL is set here)
```

The browser never sees the password or the Supabase key. Visitors without the
password can't load or post tips.

## Setup

### 1. Supabase (once)

In the Supabase dashboard, open **SQL Editor → New query**, paste
[`supabase/schema.sql`](supabase/schema.sql), and click **Run**.

### 2. Cloudflare Worker

1. In the Cloudflare dashboard go to **Workers & Pages → Create → Import a
   repository**, pick this repository, and choose the branch to deploy.
   Leave the build command empty; the deploy command is `npx wrangler deploy`
   (the default). The Worker name must be `consultingadvice` (matches
   `wrangler.toml`).
2. After the first deploy, open the Worker's **Settings → Variables and Secrets**
   and add two variables of type **Secret**:
   - `SITE_PASSWORD` — the password visitors type
   - `SUPABASE_KEY` — your Supabase publishable key (`sb_publishable_...`)

   Make sure the type is **Secret**, not Text: Text variables are reset to what
   `wrangler.toml` says on every deploy, so they'd be wiped. If Cloudflare shows
   an "Update your Wrangler configuration" banner, a variable was added as Text.

   Secrets take effect immediately; no redeploy needed. The site lives at the
   `*.workers.dev` address shown on the Worker's overview page.

Changing `SITE_PASSWORD` later logs everyone out.

Alternatively, deploy from your own computer:

```bash
npx wrangler deploy
```

```bash
npx wrangler secret put SITE_PASSWORD
```

```bash
npx wrangler secret put SUPABASE_KEY
```

## Running locally

```bash
npx wrangler dev --var SITE_PASSWORD:yourpassword --var SUPABASE_KEY:sb_publishable_...
```

## Moderating

Visitors can't edit or delete tips. To remove one, open **Table Editor → tips** in
Supabase and delete the row.

Supabase pauses free projects after about a week of no activity; resume it from the
dashboard if the site says it can't load tips.
