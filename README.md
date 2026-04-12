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
| `pip install -r scraper/requirements.txt` then `python scraper/scrape_settlements.py` | Scraper (ClassAction.org + OpenClassActions; merges into `data/settlements.json`) |

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

**Scraper email alerts (GitHub Actions):** add **repository secrets** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `NOTIFY_EMAIL` (e.g. Gmail with an [App Password](https://support.google.com/accounts/answer/185833)). The weekly workflow emails you when a source fails partially or fully. Test locally after setting the same env vars: `python -m scraper.test_notify`.

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
- `scraper/` — Python scraper (primary: ClassAction.org, supplementary: OpenClassActions; dedupe + SMTP alert on failure)
- `.github/workflows/scrape.yml` — Weekly cron (opens a PR when data changes)

## Contributing settlements

**Policy:** Only add rows that include a **real claim / notice URL** (typically from the scraper or a primary court or settlement-administrator site). Do not ship placeholder `example.com` links or generic agency homepages as stand-ins for a claim form. Well-known brands used only to jog memory on the profile page live in `src/lib/profile-suggestions.ts` (quick-add chips), not as fake settlement rows.

**Bulk data:** The long-term plan is to **grow `data/settlements.json` from the scraper** (and optionally merge multiple sources). Good public indexes to align with include [ClassAction.org settlements](https://www.classaction.org/settlements), [ClassAction.com settlements](https://www.classaction.com/settlements/), and [OpenClassActions.com](https://openclassactions.com/settlements.php) — each row you import should still point at an **official settlement administrator** or court-approved claim site for `claim_url`, not only a news aggregator page.

Edit `data/settlements.json` and open a pull request. Use the schema in `SettlementScan_Project_Overview.md`.

## Profile “Recommended active settlements” chips

On the profile page, the teal chips are built from **current `settlements.json`**: **open** claim windows first, then **closed** windows among still-active rows; within each group, settlements are ordered by **largest parsed `estimated_payout`** (best-effort) so bigger funds surface first. Category filters (subscriptions, financial, etc.) still apply. Gray chips are **Suggested names** from `profile-suggestions.ts`.

## Data retention in `settlements.json`

The weekly scraper **merges** into the JSON: new rows are added, existing IDs are updated, and settlements that disappear from sources are set to **`active: false`** with a fresh **`last_verified`**.

**Pruning:** inactive rows are **removed entirely** after the **`last_verified`** date is older than **365 days** (`INACTIVE_RETENTION_DAYS` in `scraper/config.py`). That clock starts when the scraper last marked them inactive (or any other `last_verified` on an inactive row). Inactive rows without a parseable `last_verified` are kept. Active rows are never deleted by this step.

“Include past deadlines” in Browse only shows rows still present in the file before they age out.
