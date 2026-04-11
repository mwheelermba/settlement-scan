# SettlementScan — Project Overview

## What It Is

SettlementScan is a free, open source tool that helps people find class action settlements they may be eligible for. Users build a profile (state, emails, services, products, vehicles) and the app matches that profile against a database of active settlements. The app surfaces matches ranked by confidence, flags approaching deadlines, and walks users through settlement-specific qualifying questions. All profile data stays in the user's browser. The settlements database is a JSON file in the repo, kept current by a GitHub Actions scraper.

The positioning: billions in settlement money goes unclaimed because the process is fragmented and easy to ignore. SettlementScan centralizes discovery and matching in one place, costs nothing, and stores nothing server-side about users.

---

## Architecture

### Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Frontend + Hosting | Next.js on Vercel | The entire user-facing app. SSG for settlement pages, client-side matching logic |
| Data Store (settlements) | `data/settlements.json` in repo | Flat JSON file, committed to Git, deployed with the app |
| Data Store (user profile) | Browser localStorage / IndexedDB | All PII stays client-side. Never touches a server |
| Scraper | Python scripts in `/scraper` | Runs locally or via GitHub Actions cron. Scrapes ClassAction.org settlements page |
| Automation | GitHub Actions | Weekly cron runs scraper, generates PR with updated `settlements.json` |
| HIBP API | Core plan, $4.39/mo (paid annually) | Direct email breach search. 1,000 RPM, more than sufficient |
| Analytics (community metrics) | Vercel Analytics (free tier) + lightweight custom event pings | Anonymous usage counters: active users, settlements viewed, share clicks |

### What Is NOT in the Stack

No Supabase. No backend database. No user authentication. No server-side profile storage. No edge functions. The app is a static Next.js site with client-side logic.

### Cost

| Service | Free Tier | Expected Usage |
|---------|-----------|----------------|
| Vercel | 100GB bandwidth, unlimited deploys | Trivially under |
| GitHub Actions | 2,000 min/month | ~10 min/month (weekly scrape) |
| HIBP API (Core) | $4.39/mo paid annually | Well within limits |

Effectively ~$4.39/month for HIBP. Everything else is free.

---

## Data Model

### `settlements.json` Schema

Each settlement is one object in the top-level array:

```json
{
  "id": "google-play-store-subscriptions-2026",
  "title": "Google Play Store Subscriptions Class Action Settlement",
  "defendant": "Google LLC",
  "description": "Settlement for users who paid for at least one renewal term of a Google subscription sold through the Google Play Store between May 30, 2014 and October 27, 2019.",
  "deadline": "2026-05-09",
  "claim_url": "https://playstoresubscriptionsettlement.com/",
  "source_url": "https://www.classaction.org/settlements",
  "estimated_payout": "$5.85",
  "proof_required": false,
  "type": "consumer",
  "active": true,
  "last_verified": "2026-04-11",
  "criteria": {
    "states": null,
    "services": ["Google Play Store"],
    "products": null,
    "vehicles": null,
    "breach_name": null,
    "date_range": {
      "after": "2014-05-30",
      "before": "2019-10-27"
    },
    "qualifying_questions": [
      {
        "id": "gplay-renewal",
        "text": "Did you pay for at least one renewal of a Google Play Store subscription during this period?",
        "field": "services",
        "required": true
      }
    ]
  }
}
```

**Field notes:**

- `type` — one of: `data_breach`, `consumer`, `vehicle`, `employment`, `financial`, `housing`, `health`. Used for filtering and determines which profile fields are relevant for matching.
- `criteria.states` — array of two-letter state codes, or `null` for nationwide settlements.
- `criteria.qualifying_questions` — settlement-specific questions the app asks when the user views that settlement. These supplement the profile match; they capture eligibility details too specific to pre-load into the profile (e.g., "Did you receive unwanted calls from Sirius XM between April 2019 and October 2025?"). Answers are saved to the user's profile for future matching against other settlements.
- `estimated_payout` — string, not a number, because payouts are often ranges or "varies."
- `proof_required` — boolean or `null` for unclear. This is a major UX signal; no-proof settlements are easier wins and should be visually distinguished.
- `active` — toggled to `false` when a settlement's deadline passes or the scraper detects removal. Inactive settlements are hidden from the default view but retained in the JSON for historical reference.

### User Profile (Browser Storage)

```json
{
  "name": "Optional",
  "state": "OR",
  "zip": "97201",
  "emails": ["user@example.com", "old.email@gmail.com"],
  "services": ["Google Play Store", "T-Mobile", "Equifax"],
  "products": ["RevitaLash lash serum"],
  "vehicles": [
    { "make": "Kia", "model": "Optima", "year": 2015 }
  ],
  "companies_purchased_from": ["Boohoo", "Whirlpool"],
  "breach_names": ["TMobile2021", "Equifax"],
  "qualifying_answers": {
    "gplay-renewal": true,
    "siriusxm-calls": false
  },
  "dismissed_settlements": ["settlement-id-1"],
  "filed_settlements": ["settlement-id-2"],
  "created_at": "2026-04-11T00:00:00Z"
}
```

**Notes:**

- `breach_names` is populated by the HIBP integration (if enabled) or manually by the user.
- `qualifying_answers` accumulates over time as the user interacts with individual settlements. Each key maps to a `qualifying_question.id` from the settlements data.
- `dismissed_settlements` and `filed_settlements` track user actions so the UI can hide or de-prioritize them.

---

## Core Features

### Feature 1: Profile Builder

A single-page form, not a wizard. Sections are collapsible. The user fills in what they know and skips what they don't.

**Sections:**

1. **Location** — State (dropdown), ZIP (optional). State is the single most impactful matching field.
2. **Email Addresses** — Multi-entry text field. Used for breach matching. Each email entered triggers an HIBP lookup (if enabled) and stores matched breach names.
3. **Services & Companies** — Searchable multi-select with autocomplete, pre-populated with the most common services/companies from the settlements database. Also accepts free-text entries.
4. **Products** — Free-text multi-entry. Less structured than services because product names are highly variable.
5. **Vehicles** — Structured entry: Make, Model, Year. Used for vehicle recall/defect settlements.

**UX behavior:**

- Profile saves to browser storage on every field change (debounced). No "save" button.
- A small persistent indicator shows "Profile saved locally — your data never leaves this device."
- After initial profile creation, the app immediately runs matching and navigates to the results view.

### Feature 2: Settlement Matching + Qualifying Questions

Two layers of matching:

**Layer 1 — Passive matching (profile vs. criteria).** Runs automatically on profile save. Compares profile fields against each settlement's `criteria` object. Produces a match score:

- **Full match (100%)** — All non-null criteria fields match the profile.
- **Partial match (scored proportionally)** — Some criteria fields match, others are unknown (not in profile) or don't match. Unknown fields are treated differently from mismatches; unknown means "might qualify, needs more info," while mismatch means "likely doesn't qualify."
- **No match** — No criteria fields match. Settlement is hidden from results unless the user is browsing all settlements.

Matching logic by field type:
- `states`: Profile state is in the criteria states array, OR criteria states is null (nationwide).
- `services` / `products` / `companies`: Any overlap between profile array and criteria array.
- `vehicles`: Make + model match; year falls within the criteria's model year range.
- `breach_name`: Profile's `breach_names` array contains the criteria's breach name.
- `date_range`: Informational; displayed to the user but not auto-matched (the user decides whether they were a customer/affected during the period).

**Layer 2 — Active qualifying (per-settlement questions).** When a user views a settlement detail page, the app displays any `qualifying_questions` from that settlement's criteria. These are yes/no or short-answer questions specific to that settlement. User answers are saved to `qualifying_answers` in their profile. A "yes" answer to a required qualifying question upgrades the match score. A "no" answer downgrades it.

**Matching display:**

- Match results are a card-based list, sorted by match score descending, then by deadline ascending (soonest deadline first among equal scores).
- Each card shows: title, defendant, estimated payout, deadline (with color-coded urgency: green = 30+ days, yellow = 7–30 days, red = <7 days), match score as a percentage with a small filled ring/progress indicator, proof required badge, and settlement type tag.
- Cards are expandable in-line to show the full description, qualifying questions, and the claim URL button.
- A "filed" button marks the settlement as filed and moves it to a separate "Filed Claims" section.
- A "dismiss" button hides the settlement from results.

### Feature 3: Browse & Filter All Settlements

Separately from personalized matches, users can browse the full settlements list with:

- **Sort options:** Deadline (soonest first), Payout (highest first), Newest added, Match score (if profile exists).
- **Filters:** Settlement type (data breach, consumer, vehicle, etc.), State, Proof required (yes/no), Deadline range, "No proof required" quick filter.
- **Search:** Free-text search across title, defendant, and description.

### Feature 4: Community Impact Dashboard

A lightweight public-facing page showing anonymous, aggregate usage stats. This is the "community element" — showing the tool's impact without collecting personal data.

**Metrics displayed:**

- Total unique visitors (from Vercel Analytics, free tier)
- Total settlements currently tracked
- Total settlement links clicked (outbound clicks to claim URLs)
- Total shares generated
- Settlements closing this week (count)

**Implementation:** Vercel Analytics provides visitor counts for free. For settlement link clicks and share counts, use a minimal Vercel serverless function (API route) that increments a counter stored in a simple JSON file in Vercel KV (free tier: 3,000 requests/day, 256MB) or a plain counter file on Vercel's edge config. No user-identifiable data is stored — just integer counters keyed by settlement ID.

The dashboard is a single page with large, clean stat cards. Updated in near-real-time. The tone is informational, not gamified: "78 settlements tracked — $2.4M in estimated payouts available" rather than leaderboards or badges.

### Feature 5: Share Settlements

Each settlement has a share button that generates a clean URL: `settlementscan.app/s/[settlement-id]`. Clicking the share link opens the settlement detail view directly. The share page includes Open Graph meta tags so link previews in iMessage, Slack, Discord, Reddit, etc. show the settlement title, defendant, estimated payout, and deadline.

A "copy link" button and native share sheet (on mobile via Web Share API) are the primary share mechanisms. No social media buttons.

### Feature 6: HIBP Breach Integration

The app checks each user-entered email address against HIBP's breach search API using the **Core plan** ($4.39/month, direct email search, up to 1,000 RPM). The response returns a list of breach names the email appeared in. These breach names are stored in the user's profile and matched against data breach settlements.

**Implementation:** Because the API key is a secret, HIBP lookups go through a Vercel API route (serverless function), not client-side. The flow: user enters email → client sends the email to `/api/hibp` → serverless function calls HIBP's `/api/v3/breachedaccount/{email}` endpoint with the API key in the `hibp-api-key` header → returns matched breach names → client stores them in the profile.

**Privacy disclosure:** The Core plan uses direct email search, meaning the full email address is sent to HIBP's API (not a partial hash). HIBP does not store searched addresses per their privacy policy. The UI must show a clear notice when the user enters an email for breach checking: "Your email will be checked against Have I Been Pwned to find data breaches. HIBP does not store searched addresses. [Learn more](https://haveibeenpwned.com/Privacy)."

**Graceful degradation:** If the `HIBP_API_KEY` env var is not set (e.g., for someone self-hosting without paying for the API), the feature is disabled and the UI shows a note: "Enter any data breaches you know about manually, or check haveibeenpwned.com."

---

## Scraper

### Target

ClassAction.org's settlements page: `https://www.classaction.org/settlements`

This is a structured HTML listing. Each settlement card contains: title, defendant (parseable from title), description (the eligibility blurb), deadline, estimated payout, proof required status, and a link to the official settlement website.

ClassAction.org also has an RSS feed at `/blog/rss`, but it's a blog feed for news articles, not the structured settlements listing. The RSS feed is useful for discovering new lawsuits but does not replace scraping the settlements page.

### Scraper Design

A single Python script: `scraper/scrape_settlements.py`.

**Behavior:**

1. Fetches the settlements page HTML (requests + BeautifulSoup).
2. Parses each settlement card into a normalized Python dict matching the `settlements.json` schema.
3. For fields that require interpretation (type, criteria fields), applies heuristic rules:
   - If description mentions "data breach" or "personal information," type = `data_breach`.
   - If description mentions vehicle makes/models, type = `vehicle`, and criteria.vehicles is populated.
   - States are extracted from description text when mentioned explicitly.
   - Date ranges are extracted from description text via regex.
4. Loads the existing `data/settlements.json` and merges:
   - New settlements (by ID) are added.
   - Existing settlements have `last_verified` updated if still present on the page.
   - Settlements no longer on the page have `active` set to `false` (but are not deleted).
5. Writes the merged result back to `data/settlements.json`.
6. Qualifying questions are NOT auto-generated by the scraper. They are manually authored and added to individual settlements over time. The scraper preserves any existing `qualifying_questions` in the JSON.

**Output:** The script prints a summary: X new settlements added, Y updated, Z deactivated. Exits with code 0 on success, 1 on failure (network error, parse error, etc.).

### GitHub Actions Automation

`.github/workflows/scrape.yml`:

- **Trigger:** Cron schedule, weekly (Sunday at 6 AM UTC).
- **Steps:**
  1. Checkout repo.
  2. Set up Python, install dependencies (`requests`, `beautifulsoup4`).
  3. Run `scraper/scrape_settlements.py`.
  4. If `data/settlements.json` changed, create a PR with the diff.
  5. Assign the PR to the repo owner for review.
- **Why a PR instead of direct commit:** The scraper's heuristic parsing will occasionally produce garbage. Human review of the diff catches bad parses before they hit production. This is a 2-minute weekly task: scan the diff, approve, merge, Vercel auto-deploys.

A second optional workflow: on push to `data/settlements.json` on `main`, Vercel redeploys automatically (this is Vercel's default behavior, no extra config needed).

### Community Contributions

Other people can contribute settlements by editing `data/settlements.json` directly and opening a PR. The README includes a template for a new settlement entry with all required fields. This is the low-friction contribution path — no CLI tools, no scripts, just edit a JSON file.

---

## UX & Visual Design

### Design Principles

- **Trust signals everywhere.** The app asks for personal information. Every screen should reinforce that data stays local. A persistent footer or badge: "Your data stays on your device. SettlementScan never sees your profile."
- **Deadline urgency is the primary visual driver.** Color-coded deadline badges (green/yellow/red) are the loudest element on settlement cards. Approaching deadlines should create a gentle sense of urgency without feeling spammy.
- **No-proof settlements get special treatment.** These are the easiest wins. A "No Proof Required" badge in a distinct color (e.g., a blue/teal pill) makes them instantly recognizable. A dedicated quick-filter button: "Show Easy Claims."
- **Polish over complexity.** Smooth transitions, subtle animations on match score rings, skeleton loaders for any async operations. The app should feel like a polished consumer product, not a developer tool.

### Key Visual Elements

**Settlement Cards:**
- Large title, defendant in lighter weight below.
- Left side: match score as an animated circular progress ring (percentage in the center).
- Right side: deadline badge (color-coded), estimated payout in bold, proof-required pill.
- Expandable area: full description, qualifying questions inline, "File Claim" CTA button (links to external claim URL), "Mark as Filed" button, "Dismiss" button.
- Filed settlements get a checkmark overlay and move to a "Filed" tab.

**Match Score Ring:**
- 100% = full green ring.
- 75–99% = mostly filled green/teal ring.
- 50–74% = yellow ring.
- Below 50% = gray ring.
- Below the ring, a small text note: "3 of 4 criteria matched" or "2 criteria need your input."

**Dashboard (Community Metrics):**
- Large stat cards in a grid: "142 settlements tracked," "23 closing this month," "$1.8M+ in estimated payouts," "347 claim links clicked."
- Clean, minimal design. No charts unless there's enough data to warrant them. Just big numbers with labels.

**Profile Page:**
- Clean form layout. Each section (Location, Emails, Services, Products, Vehicles) is a collapsible card.
- Inline validation and auto-save indicators.
- At the bottom: "Your profile is stored only in this browser. Clearing browser data will erase it. Use the export button to save a backup." With an export/import JSON feature for backup.

**Deadline Calendar View (optional, nice-to-have):**
- A simple calendar or timeline view showing settlement deadlines. Each dot/marker on the timeline is clickable and links to the settlement. Color-coded by match score.

### Responsive Design

Mobile-first. Settlement cards stack vertically. The profile form is single-column. The share button triggers the native share sheet on mobile.

---

## Repo Structure

```
settlementscan/
├── .github/
│   └── workflows/
│       └── scrape.yml              # Weekly cron scraper
├── data/
│   └── settlements.json            # The settlements database
├── scraper/
│   ├── scrape_settlements.py       # Main scraper script
│   └── requirements.txt            # requests, beautifulsoup4
├── src/
│   ├── app/                        # Next.js app directory
│   │   ├── page.tsx                # Home / matched settlements view
│   │   ├── profile/
│   │   │   └── page.tsx            # Profile builder
│   │   ├── browse/
│   │   │   └── page.tsx            # Browse all settlements
│   │   ├── dashboard/
│   │   │   └── page.tsx            # Community metrics
│   │   ├── s/
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Shareable settlement detail
│   │   └── api/
│   │       ├── hibp/
│   │       │   └── route.ts        # HIBP proxy (serverless)
│   │       └── events/
│   │           └── route.ts        # Analytics event counter (serverless)
│   ├── components/
│   │   ├── SettlementCard.tsx
│   │   ├── MatchScoreRing.tsx
│   │   ├── DeadlineBadge.tsx
│   │   ├── ProofBadge.tsx
│   │   ├── ProfileForm.tsx
│   │   ├── QualifyingQuestions.tsx
│   │   ├── FilterBar.tsx
│   │   ├── SearchBar.tsx
│   │   ├── ShareButton.tsx
│   │   ├── StatCard.tsx
│   │   ├── PrivacyBadge.tsx
│   │   └── Layout.tsx
│   ├── lib/
│   │   ├── matcher.ts              # Core matching logic
│   │   ├── profile.ts              # Profile read/write to localStorage
│   │   ├── settlements.ts          # Load and filter settlements data
│   │   ├── hibp.ts                 # Client-side HIBP integration
│   │   └── analytics.ts            # Event tracking helpers
│   └── styles/
│       └── globals.css             # Tailwind + custom styles
├── public/
│   └── og-image.png                # Default Open Graph image
├── tailwind.config.ts
├── next.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## Development Phases

### Phase 0: Scraper + Data Validation

**Goal:** Confirm that usable settlement data can be extracted from ClassAction.org and that the schema works against real entries.

**Steps:**

1. Write `scraper/scrape_settlements.py`. Target the settlements page HTML. Parse each settlement card into a dict matching the schema above.
2. Run the scraper and inspect output. Manually verify 10+ entries against the source page. Check that titles, deadlines, payout amounts, and descriptions parsed correctly.
3. Write a second throwaway script (`scraper/test_match.py`) that takes a hardcoded test profile and scores it against the scraped data. Print matches to terminal. Validate that the matching logic produces sensible results.
4. Commit the initial `data/settlements.json` with the scraped output plus any manual corrections.

**Done when:** `settlements.json` has 20+ real settlements with clean data, and the test matcher produces correct results against a test profile.

### Phase 1: Next.js App — Profile + Matching

**Goal:** The core app works: user can create a profile, see matched settlements, and view details.

**Steps:**

1. Initialize Next.js project with Tailwind CSS. Set up the repo structure above.
2. Build `lib/profile.ts` — read/write profile to localStorage with the schema defined above. Include export/import JSON functions.
3. Build `lib/settlements.ts` — load `settlements.json` at build time (via `getStaticProps` or Next.js app directory equivalent). Provide filter/sort/search functions.
4. Build `lib/matcher.ts` — port the matching logic from the Phase 0 test script to TypeScript. Implement the scoring algorithm described above.
5. Build `ProfileForm.tsx` — the full profile builder component with all sections.
6. Build `SettlementCard.tsx`, `MatchScoreRing.tsx`, `DeadlineBadge.tsx`, `ProofBadge.tsx` — the settlement display components.
7. Build the home page (`app/page.tsx`) — if profile exists, show matched settlements; if no profile, prompt to create one.
8. Build the profile page (`app/profile/page.tsx`) — the profile form with auto-save.
9. Build `QualifyingQuestions.tsx` — inline qualifying questions within the expanded settlement card. Answers save to profile.

**Done when:** A user can create a profile, see ranked matches with scores, expand a settlement to answer qualifying questions, and mark settlements as filed or dismissed.

### Phase 2: Browse, Filter, Search, Share

**Goal:** Full settlement discovery beyond personalized matches. Sharing works.

**Steps:**

1. Build `FilterBar.tsx` and `SearchBar.tsx` — filtering by type, state, proof required, deadline range. Free-text search.
2. Build the browse page (`app/browse/page.tsx`) — all settlements with filters and sort options.
3. Build `ShareButton.tsx` — copy link + Web Share API.
4. Build the share page (`app/s/[id]/page.tsx`) — settlement detail view with Open Graph meta tags for link previews.
5. Polish: transitions, loading states, responsive layout, empty states.

**Done when:** The browse page works with all filters. Share links render proper previews in iMessage/Slack/Discord.

### Phase 3: HIBP Integration

**Goal:** Emails entered in the profile are checked against HIBP for breach matching.

**Steps:**

1. Build `app/api/hibp/route.ts` — serverless function that accepts an email address, calls HIBP's direct email search API (`/api/v3/breachedaccount/{email}`) with the `hibp-api-key` header, returns breach names.
2. Build `lib/hibp.ts` — client-side logic: send email to `/api/hibp`, receive breach names, store in profile.
3. Integrate into `ProfileForm.tsx` — trigger HIBP lookup on email entry, show privacy disclosure notice, show results inline ("Found in 3 breaches: ..."), auto-populate `breach_names` in profile.
4. Graceful degradation: if `HIBP_API_KEY` env var is not set, disable the feature and show manual entry fallback.

**Done when:** Entering an email in the profile automatically identifies breaches and improves data-breach settlement matching.

### Phase 4: GitHub Actions + Community Dashboard

**Goal:** Automated scraping and public impact metrics.

**Steps:**

1. Write `.github/workflows/scrape.yml` — weekly cron, runs scraper, creates PR if data changed.
2. Build `app/api/events/route.ts` — serverless function that increments anonymous counters (claim link clicks, shares). Store in Vercel KV or a simple edge config.
3. Build `lib/analytics.ts` — client-side helpers that fire events on claim link click and share.
4. Build the dashboard page (`app/dashboard/page.tsx`) — stat cards showing aggregate metrics.
5. Write the README: project description, how to use, how to contribute settlements, how to run the scraper locally, how to self-host.

**Done when:** Scraper runs weekly on cron and produces PRs. Dashboard shows live community metrics. README is complete.

### Phase 5: Polish & Launch Prep

**Goal:** Production-quality UX, edge cases handled, ready to share.

**Steps:**

1. Empty states: no profile, no matches, no settlements matching filters.
2. Error handling: HIBP API failure, corrupted localStorage, missing settlement data.
3. Profile export/import: JSON download and upload for backup/transfer.
4. Accessibility: keyboard navigation, screen reader labels, color contrast.
5. Performance: ensure `settlements.json` loads fast (it's small, but verify). Lazy-load expanded card content.
6. Favicon, OG images, meta tags, manifest.json for PWA-lite experience.
7. Final visual polish pass: consistent spacing, typography hierarchy, animation timing.

**Done when:** The app looks and feels like a polished consumer product. Ready to post to Reddit and share with friends.

---

## Technical Decisions & Rationale

**Why no backend database?** The settlements dataset is small (hundreds of entries, not thousands). A JSON file in the repo is simpler, faster, and eliminates an entire infrastructure dependency. If the project ever outgrows this, migrating to a database is straightforward — the schema is already defined.

**Why localStorage for profiles?** Users are sharing personal information. Keeping it entirely client-side is the strongest possible privacy guarantee and eliminates any PII liability. The tradeoff is that profiles don't sync across devices, which is acceptable for this project's scale.

**Why GitHub Actions PR instead of direct commit?** Scraper heuristics will produce bad parses. A PR-based workflow forces human review, which catches errors before they reach users. The weekly review takes 2 minutes.

**Why HIBP Core instead of Pro?** Core provides direct email search at $4.39/month. Pro adds k-anonymity (partial-hash search so HIBP never sees the full email) but costs $379/month — absurd for this project. Direct email search is fine; HIBP doesn't store searched addresses, and a clear privacy notice in the UI is sufficient. The app still degrades gracefully without the API key for anyone self-hosting.

**Why ClassAction.org over TopClassActions?** ClassAction.org's settlements page has cleaner HTML structure (each settlement is a distinct card with consistent formatting), and the site is more consumer-focused (settlements listing with deadlines and payout amounts vs. TopClassActions which is more news/investigation-focused). Both can be scraped, but ClassAction.org is the better primary target. TopClassActions could be added as a secondary source later.

**Why Vercel KV for analytics counters?** It's free (3,000 reads + 3,000 writes/day on the hobby plan), requires zero setup beyond enabling it in the Vercel dashboard, and is perfect for simple increment-and-read counter operations. No database schema, no migrations — just key-value pairs like `clicks:settlement-id → 47`.

---

## Scraper Technical Notes

### ClassAction.org Settlements Page Structure

The settlements page at `https://www.classaction.org/settlements` renders settlement cards with the following HTML structure (as of April 2026):

- Each settlement is a card element containing:
  - Title (links to external settlement website)
  - An image/thumbnail
  - Days remaining until deadline (or "Deadline Varies")
  - Estimated payout amount
  - Proof required status
  - Eligibility description paragraph
  - Link to the official settlement website

- The page loads additional settlements via pagination or lazy loading. The scraper should handle multiple pages if paginated, or scroll-triggered loading if that is how additional settlements are surfaced.

### Scraper Resilience

- The scraper should use a reasonable User-Agent header.
- Implement retry logic (3 retries with exponential backoff) for network failures.
- If the HTML structure changes and parsing fails, the scraper should exit with a non-zero code and the GitHub Action will not create a PR. This prevents bad data from entering the pipeline.
- The scraper should log warnings for any settlement it couldn't fully parse (e.g., missing deadline) but still include partial entries with null fields.

---

## Open Questions for Development

1. **Pagination on ClassAction.org:** Does the settlements page paginate via URL params, infinite scroll, or show all results on one page? The scraper implementation depends on this. Inspect the page before coding.
2. **Vercel KV vs. alternatives:** If Vercel KV's free tier limits become a problem (unlikely at this scale), alternatives include Upstash Redis (free tier: 10,000 requests/day) or even a simple counter stored in a JSON file on Vercel's edge config.
3. **Qualifying questions authorship:** These are manually written. Over time, build a library of common qualifying question templates for each settlement type (data breach: "Was your personal information compromised in [breach]?", vehicle: "Do you own or lease a [year range] [make] [model]?").
4. **Multi-page scraping:** ClassAction.org may require scraping multiple pages or handling JavaScript-rendered content. If the latter, consider using `requests-html` or `playwright` instead of `requests` + `beautifulsoup4`. Start simple and escalate only if needed.
