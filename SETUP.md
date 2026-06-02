# CV Revamp landing, setup

Technical reference for the live landing site (cvrevamp.info). Internal ops,
backend, and business notes are kept in private project notes, NOT in this public repo.

## Live

- https://cvrevamp.info
- Host: Netlify, auto-deploys from this repo (branch `main`). Static site, no build step. Edit + `git push` -> deploy.

## Files

- `index.html` — landing page (EN + AR/RTL)
- `thank-you.html` — post-payment page (Stripe success URL points here)
- `robots.txt`, `sitemap.xml`, `llms.txt` — crawler / SEO / GEO
- `pricing.md` — pricing reference

## Analytics (tags already present in public page source)

- GA4: `G-GW614SVJJC` in the `<head>` of `index.html` + `thank-you.html`
- `purchase` event fires on `/thank-you` (once per session)
- LinkedIn Insight: partner `9902625`

## SEO / GEO

- JSON-LD: Organization + Product/Offer + FAQPage; Open Graph + Twitter cards
- `robots.txt` allows AI crawlers; `sitemap.xml` + `llms.txt` present
- TODO: add `og-image.png` (1200x630) + `logo.png` (OG / Organization render blank without them); submit sitemap in Google Search Console

---
For full project context (backend, deploy ops, strategy, revenue), see the private
project notes, not stored in this public repo.
Last updated 2026-06-02.
