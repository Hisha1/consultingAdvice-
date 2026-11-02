# Consulting Advice Grove

A web page for sharing consulting recruiting tips. All tips are stored in a shared
Supabase database, so everyone who visits sees every tip.

- Password gate (password: `Wharton`)
- Browse tips in up to 3 cards per row, filter by category
- Add a tip: title, category, contributor (or anonymous), source, and body (max 250 words)
- New tips from other people appear automatically (the page re-checks every 30 seconds)

## One-time setup (about 5 minutes)

1. Create a free account and a new project at https://supabase.com.
2. In the project, open **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. This creates the
   `tips` table and lets visitors read and add tips (but not edit or delete them).
3. Open **Project Settings → API** (may be labelled **Data API**) and copy:
   - **Project URL** → `supabaseUrl` in [`config.js`](config.js)
   - **anon / public** key → `supabaseAnonKey` in [`config.js`](config.js)
4. Commit `config.js` and host the folder, e.g. with GitHub Pages
   (repo **Settings → Pages → Deploy from a branch**).

The anon key is meant to be public; what it can do is limited by the policies in
`schema.sql`. Never put the `service_role` key in this site.

## Moderating

Visitors can't edit or delete tips. To remove one, open **Table Editor → tips** in
Supabase and delete the row.

## Notes

- The password check runs in the browser, so it keeps casual visitors out but is not
  real security: someone who reads the page source could find the database address
  and post tips without the password.
- Supabase pauses free projects after about a week of no activity; resume it from the
  dashboard if the site says it can't load tips.
