#!/usr/bin/env python3
"""
Fetch ClassAction.org settlements and merge into data/settlements.json.

Run from repo root: python scraper/scrape_settlements.py

Phase 0: stub — implements fetch + merge skeleton. Extend parsing to match
the live HTML (see SettlementScan_Project_Overview.md).
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "settlements.json"
SOURCE = "https://www.classaction.org/settlements"
USER_AGENT = (
    "SettlementScanBot/0.1 (+https://github.com/your-org/settlementscan; contact: you@example.com)"
)


def fetch_html(url: str, retries: int = 3) -> str:
    last: Exception | None = None
    for attempt in range(retries):
        try:
            r = requests.get(
                url,
                headers={"User-Agent": USER_AGENT},
                timeout=60,
            )
            r.raise_for_status()
            return r.text
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(2**attempt)
    raise RuntimeError(f"Failed to fetch {url}: {last}") from last


def parse_stub(html: str) -> list[dict]:
    """Placeholder parser — replace with real card extraction."""
    soup = BeautifulSoup(html, "html.parser")
    _ = soup.title.string if soup.title else ""
    # When implementing: iterate settlement cards, map fields to schema.
    return []


def load_existing() -> list[dict]:
    if not DATA_PATH.exists():
        return []
    with DATA_PATH.open(encoding="utf-8") as f:
        return json.load(f)


def merge(existing: list[dict], incoming: list[dict]) -> tuple[list[dict], int, int, int]:
    by_id = {x["id"]: x for x in existing}
    new_n = upd_n = 0
    for row in incoming:
        eid = row["id"]
        if eid not in by_id:
            by_id[eid] = row
            new_n += 1
            continue
        old = by_id[eid]
        preserved_q = (old.get("criteria") or {}).get("qualifying_questions") or []
        crit = row.setdefault("criteria", {})
        crit["qualifying_questions"] = preserved_q if preserved_q else crit.get("qualifying_questions", [])
        old.update(row)
        upd_n += 1
    deactivated = 0
    merged = list(by_id.values())
    return merged, new_n, upd_n, deactivated


def main() -> int:
    print(f"Fetching {SOURCE} …")
    html = fetch_html(SOURCE)
    incoming = parse_stub(html)
    existing = load_existing()
    if not incoming:
        print("Stub parser returned 0 rows — not writing data/settlements.json. Implement parse_stub next.")
        return 0

    merged, new_n, upd_n, deactivated = merge(existing, incoming)

    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    with DATA_PATH.open("w", encoding="utf-8") as f:
        json.dump(merged, f, indent=2)
        f.write("\n")

    print(f"Summary: +{new_n} new, ~{upd_n} updated, {deactivated} deactivated.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as e:  # noqa: BLE001
        print(f"ERROR: {e}", file=sys.stderr)
        raise SystemExit(1)
