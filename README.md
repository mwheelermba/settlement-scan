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
| `NEXT_PUBLIC_SITE_URL` | Recommended in production | Canonical site for Open Graph. Use a full URL (`https://your-app.vercel.app`) or **hostname only** (`your-app.vercel.app`) — the app prepends `https://` if the scheme is missing. |
| `KV_REST_API_URL` | No* | Upstash-style **HTTP REST** (optional). With `KV_REST_API_TOKEN`, uses `@vercel/kv`. |
| `KV_REST_API_TOKEN` | No* | Paired with the REST URL (`UPSTASH_REDIS_REST_*` also supported). |
| `REDIS_URL` | No* | **Vercel Serverless Redis** / **Redis Cloud** — standard `redis://` or `rediss://` URL. Used when REST vars are not set. |

\*Vercel usually injects one style automatically when you link Storage. You do **not** need both REST and `REDIS_URL`.

### Community metrics (Redis)

**Two supported setups:**

1. **HTTP REST (Upstash / legacy KV)** — env vars `KV_REST_API_URL` + `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_*`). No `REDIS_URL` required.
2. **TCP Redis (Serverless Redis / Redis Cloud)** — only **`REDIS_URL`**, as in Vercel’s quickstart (`npm install redis`). There is **no** REST URL/token in that product; that is normal.

Steps: create/link Redis in Vercel → confirm **`REDIS_URL`** (or the REST pair) appears under **Project → Settings → Environment Variables** → **Redeploy**.

Optional local testing: `vercel env pull .env.local` or paste vars into `.env.local`.

`POST /api/events` increments counters when users click **File claim** or **Share**. `GET /api/events` returns `{ claims, shares, kvEnabled }`. The dashboard refreshes totals about every 15 seconds (`revalidate`).

## Repo layout

- `src/app` — Next.js App Router pages and API routes
- `data/settlements.json` — Settlement database (committed, deployed with the app)
- `scraper/` — Python scraper for ClassAction.org (extend `parse_stub` per Phase 0)
- `.github/workflows/scrape.yml` — Weekly cron (opens a PR when data changes)

## Contributing settlements

Edit `data/settlements.json` and open a pull request. Use the examples in the file and the schema in `SettlementScan_Project_Overview.md`.
