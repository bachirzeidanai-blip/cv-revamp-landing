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

## Analytics (via Google Tag Manager)

- GTM container: `GTM-WPZ56RZJ` (snippet in `<head>` + `<noscript>` after `<body>` on both pages). Manage all tags in GTM, not in code.
- GA4 `G-GW614SVJJC` is configured inside GTM (Google Tag, All Pages).
- `purchase` conversion: `thank-you.html` runs `dataLayer.push({event:'cvr_purchase'})` once per session; a GA4 Event tag in GTM (trigger: Custom Event `cvr_purchase`) sends GA4 `purchase` with value/currency set in the tag.
- LinkedIn Insight: partner `9902625` (still hardcoded in `<head>`; can move into GTM later).

## SEO / GEO

- JSON-LD: Organization + Product/Offer + FAQPage; Open Graph + Twitter cards
- `robots.txt` allows AI crawlers; `sitemap.xml` + `llms.txt` present
- TODO: add `og-image.png` (1200x630) + `logo.png` (OG / Organization render blank without them); submit sitemap in Google Search Console

---
For full project context (backend, deploy ops, strategy, revenue), see the private
project notes, not stored in this public repo.
Last updated 2026-06-02.
