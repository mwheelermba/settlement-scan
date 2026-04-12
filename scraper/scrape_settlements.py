#!/usr/bin/env python3
"""
SettlementScan web scraper — main entry point.

Fetches settlement data from two sources (ClassAction.org as primary,
OpenClassActions.com as supplementary), deduplicates, enriches with
type/criteria inference, merges into ``data/settlements.json``, and sends
a notification email on partial or full failure.

Run from repo root:  python -m scraper.scrape_settlements
              or:    python scraper/scrape_settlements.py
"""
from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

# Allow running as both `python scraper/scrape_settlements.py` and
# `python -m scraper.scrape_settlements` by adjusting sys.path.
_SCRAPER_DIR = Path(__file__).resolve().parent
_ROOT = _SCRAPER_DIR.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from scraper.classify import enrich
from scraper.config import DATA_PATH, MIN_PRIMARY_ROWS
from scraper.dedup import deduplicate
from scraper.notify import ScrapeReport, send_notification
from scraper.prune import prune_stale_inactive
from scraper.sources.classaction_org import scrape as scrape_primary
from scraper.sources.openclassactions import scrape as scrape_supplementary


# ── File I/O ────────────────────────────────────────────────────────────────

def load_existing() -> list[dict]:
    if not DATA_PATH.exists():
        return []
    with DATA_PATH.open(encoding="utf-8") as f:
        return json.load(f)


def save(settlements: list[dict]) -> None:
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    with DATA_PATH.open("w", encoding="utf-8") as f:
        json.dump(settlements, f, indent=2, ensure_ascii=False)
        f.write("\n")


# ── Merge logic ─────────────────────────────────────────────────────────────

def merge(
    existing: list[dict],
    incoming: list[dict],
) -> tuple[list[dict], int, int, int]:
    """Merge *incoming* enriched settlements into *existing*.

    Returns ``(merged_list, new_count, updated_count, deactivated_count)``.

    Rules:
     - New IDs are added.
     - Existing IDs are updated (``last_verified`` refreshed), but
       hand-authored ``qualifying_questions`` are preserved.
     - IDs present in *existing* but absent from *incoming* are marked
       ``active=False`` (deactivated, not deleted).
    """
    by_id: dict[str, dict] = {s["id"]: s for s in existing}
    incoming_ids: set[str] = set()
    new_n = upd_n = 0

    for row in incoming:
        rid = row["id"]
        incoming_ids.add(rid)

        if rid not in by_id:
            by_id[rid] = row
            new_n += 1
            continue

        old = by_id[rid]
        # Preserve hand-authored qualifying questions
        old_questions = (old.get("criteria") or {}).get("qualifying_questions", [])
        incoming_questions = (row.get("criteria") or {}).get("qualifying_questions", [])
        keep_questions = old_questions if old_questions else incoming_questions

        # Preserve manually set fields that the scraper cannot reliably produce
        preserved_type = old.get("type") if old.get("type") != "consumer" else row.get("type", "consumer")

        old.update(row)
        old["type"] = preserved_type
        old.setdefault("criteria", {})["qualifying_questions"] = keep_questions
        old["active"] = True
        upd_n += 1

    # Deactivate settlements no longer found on any source
    deactivated = 0
    today = datetime.now().strftime("%Y-%m-%d")
    for rid, settlement in by_id.items():
        if rid not in incoming_ids and settlement.get("active", True):
            settlement["active"] = False
            settlement["last_verified"] = today
            deactivated += 1

    merged = list(by_id.values())
    return merged, new_n, upd_n, deactivated


# ── Main ────────────────────────────────────────────────────────────────────

def main() -> int:
    report = ScrapeReport()

    # ── Step 1: Fetch primary source ────────────────────────────────────
    primary_raw: list[dict] = []
    try:
        primary_raw = scrape_primary()
        report.primary_count = len(primary_raw)
        if len(primary_raw) < MIN_PRIMARY_ROWS:
            report.primary_ok = False
            report.primary_error = (
                f"Only {len(primary_raw)} rows (minimum {MIN_PRIMARY_ROWS}). "
                "HTML structure may have changed."
            )
            report.warnings.append(report.primary_error)
    except Exception as exc:
        report.primary_ok = False
        report.primary_error = str(exc)
        print(f"[ERROR] Primary source failed: {exc}")

    # ── Step 2: Fetch supplementary source ──────────────────────────────
    supplementary_raw: list[dict] = []
    try:
        supplementary_raw = scrape_supplementary()
        report.supplementary_count = len(supplementary_raw)
    except Exception as exc:
        report.supplementary_ok = False
        report.supplementary_error = str(exc)
        print(f"[ERROR] Supplementary source failed: {exc}")

    # ── Step 3: Bail if both sources failed ─────────────────────────────
    if not primary_raw and not supplementary_raw:
        report.warnings.append("Both sources returned 0 rows. settlements.json not updated.")
        send_notification(report)
        return 1

    # ── Step 4: Deduplicate across sources ──────────────────────────────
    if primary_raw and supplementary_raw:
        deduped = deduplicate(primary_raw, supplementary_raw)
    elif primary_raw:
        deduped = primary_raw
    else:
        deduped = supplementary_raw
        report.warnings.append(
            "Running on supplementary source only -- primary failed."
        )

    # ── Step 5: Enrich with type/criteria inference ─────────────────────
    print(f"\n[enrich] Processing {len(deduped)} settlements ...")
    enriched: list[dict] = []
    for row in deduped:
        try:
            enriched.append(enrich(row))
        except Exception as exc:
            title = row.get("title", "???")[:60]
            print(f"  [warn] Enrichment failed for '{title}': {exc}")
            report.warnings.append(f"Enrichment failed: {title}")

    # ── Step 6: Merge into existing data ────────────────────────────────
    existing = load_existing()
    merged, new_n, upd_n, deact_n = merge(existing, enriched)

    # ── Step 6b: Drop inactive rows older than ~1 year (last_verified) ───
    final_rows, pruned_n = prune_stale_inactive(merged)

    report.new_settlements = new_n
    report.updated_settlements = upd_n
    report.deactivated_settlements = deact_n
    report.pruned_inactive_stale = pruned_n
    report.total_settlements = len(final_rows)

    # ── Step 7: Write output ────────────────────────────────────────────
    save(final_rows)
    print(
        f"\nDone: +{new_n} new, ~{upd_n} updated, "
        f"-{deact_n} deactivated, x{pruned_n} pruned (inactive stale) => {len(final_rows)} total."
    )

    # ── Step 8: Send notification ───────────────────────────────────────
    send_notification(report)

    # Exit 0 even on degraded runs so the GH Action creates the PR.
    # Exit 1 only when both sources failed (no data written).
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except SystemExit:
        raise
    except Exception as exc:
        print(f"FATAL: {exc}", file=sys.stderr)
        report = ScrapeReport(
            primary_ok=False,
            primary_error=str(exc),
            supplementary_ok=False,
            supplementary_error="Not attempted (fatal error before supplementary fetch)",
        )
        send_notification(report)
        raise SystemExit(1)
