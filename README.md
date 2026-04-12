# SettlementScan

Free, open source helper to discover class action settlements you may qualify for. Your profile stays in the browser; settlement data ships as `data/settlements.json` in this repo.

If you find the project useful, you can support maintenance (totally optional) via [Buy Me a Coffee](https://buymeacoffee.com/michaelwheeler9919).

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
| `RESEND_API_KEY` | No | [Resend](https://resend.com) API key for `POST /api/report` (problem reports). |
| `REPORT_EMAIL_TO` | No | Where reports are delivered — **any** address works, including **Gmail** (`you@gmail.com`). This value is server-only and never exposed to the browser. |
| `REPORT_EMAIL_FROM` | No | **From** address Resend will use. Free tier often requires a **verified domain** for production sends; until then you can use Resend’s onboarding sender for testing. Receiving at Gmail is fine; the usual constraint is *sending from* a verified domain, not *sending to* Gmail. |

**Problem reports:** set `REPORT_EMAIL_TO` to your personal inbox. **Match-notification emails** (future feature) would need user opt-in, stored email (or a provider link), and a scheduled job — not implemented yet.

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

**Policy:** Only add rows that include a **real claim / notice URL** (typically from the scraper or a primary court or settlement-administrator site). Do not ship placeholder `example.com` links or generic agency homepages as stand-ins for a claim form. Well-known brands used only to jog memory on the profile page live in `src/lib/profile-suggestions.ts` (quick-add chips), not as fake settlement rows.

Edit `data/settlements.json` and open a pull request. Use the schema in `SettlementScan_Project_Overview.md`.
