# Consulting Advice Grove

A static web page for sharing consulting recruiting tips.

- Password gate (password: `Wharton`)
- Browse tips in up to 3 cards per row, filter by category
- Add a tip: title, category, contributor (or anonymous), source, and body (max 250 words)
- Bamboo-forest green theme with floating specks in the background

## Running

Open `index.html` in a browser, or serve the folder (e.g. `python3 -m http.server`) / host it on GitHub Pages.

## Notes

- Tips are saved in the browser's `localStorage`, so each visitor only sees their own additions
  plus the sample tips. Sharing tips across users would need a backend or database.
- The password check runs in the browser, so it keeps casual visitors out but is not real security.
