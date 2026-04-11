# SettlementScan

Free, open source helper to discover class action settlements you may qualify for. Your profile stays in the browser; settlement data ships as `data/settlements.json` in this repo.

See `SettlementScan_Project_Overview.md` for the full product and architecture spec.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
|--------|---------|
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build and run |
| `pip install -r scraper/requirements.txt` then `python scraper/scrape_settlements.py` | Scraper (stub parser until Phase 0 is finished) |

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `HIBP_API_KEY` | No | [Have I Been Pwned](https://haveibeenpwned.com/API/Key) API key for breach lookup via `/api/hibp`. Without it, users enter breach names manually. |
| `NEXT_PUBLIC_SITE_URL` | Recommended in production | Canonical site URL for Open Graph metadata. Without a custom domain, use your Vercel URL (e.g. `https://settlement-scan-xxx.vercel.app` — copy from the Vercel project **Domains** tab). |

## Repo layout

- `src/app` — Next.js App Router pages and API routes
- `data/settlements.json` — Settlement database (committed, deployed with the app)
- `scraper/` — Python scraper for ClassAction.org (extend `parse_stub` per Phase 0)
- `.github/workflows/scrape.yml` — Weekly cron (opens a PR when data changes)

## Contributing settlements

Edit `data/settlements.json` and open a pull request. Use the examples in the file and the schema in `SettlementScan_Project_Overview.md`.
