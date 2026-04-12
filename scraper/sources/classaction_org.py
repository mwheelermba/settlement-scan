"""
Parser for ClassAction.org /settlements.

The page renders every settlement as a `div.settlement-card`.  Each card
contains a title link (`a.js-settlement-link`) with `data-slug` and `href`
(pointing to the official settlement website), plus stats for payout,
deadline, and proof-required.
"""
from __future__ import annotations

import re
from datetime import datetime

from bs4 import BeautifulSoup, Tag

from scraper.config import CLASSACTION_ORG_URL
from scraper.sources import RawSettlement, fetch_html


def _parse_deadline(text: str) -> str | None:
    """Convert 'M/D/YY' or 'M/D/YYYY' to 'YYYY-MM-DD', or None for 'Varies'."""
    text = text.strip()
    if not text or text.lower() == "varies":
        return None
    for fmt in ("%m/%d/%y", "%m/%d/%Y"):
        try:
            dt = datetime.strptime(text, fmt)
            if dt.year < 2000:
                dt = dt.replace(year=dt.year + 2000)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def _parse_proof(text: str) -> bool | None:
    text = text.strip().lower()
    if text == "yes":
        return True
    if text == "no":
        return False
    return None  # "N/A" or anything unexpected


def _extract_stats(card: Tag) -> dict:
    """Pull payout, deadline, proof_required from the stats bar."""
    stats: dict = {"estimated_payout": "Varies", "deadline": None, "proof_required": None}

    stats_container = card.select_one(
        ".bg-tw-lightest-gray, [class*='lightest-gray']"
    )
    if not stats_container:
        return stats

    spans = stats_container.find_all("span")
    # Spans come in label/value pairs.  Labels contain keywords.
    i = 0
    while i < len(spans):
        label_text = spans[i].get_text(" ", strip=True).lower()
        value_span = spans[i + 1] if i + 1 < len(spans) else None
        if value_span is None:
            break
        value_text = value_span.get_text(strip=True)

        if "payout" in label_text:
            stats["estimated_payout"] = value_text or "Varies"
            i += 2
        elif "deadline" in label_text:
            stats["deadline"] = _parse_deadline(value_text)
            i += 2
        elif "proof" in label_text:
            stats["proof_required"] = _parse_proof(value_text)
            i += 2
        else:
            i += 1

    return stats


def _clean_title(raw: str) -> str:
    """Strip trailing ' Class Action Settlement' boilerplate when it adds no info."""
    raw = raw.strip()
    # Keep the full title — downstream code uses it for type inference
    return raw


def scrape() -> list[RawSettlement]:
    """Fetch and parse all settlement cards from ClassAction.org.

    Returns a list of :class:`RawSettlement` dicts (one per card).
    Raises on network failure; logs warnings for individual card parse issues.
    """
    print(f"[classaction.org] Fetching {CLASSACTION_ORG_URL}")
    html = fetch_html(CLASSACTION_ORG_URL)
    soup = BeautifulSoup(html, "lxml")

    cards = soup.select("div.settlement-card")
    print(f"[classaction.org] Found {len(cards)} settlement cards")

    results: list[RawSettlement] = []
    for card in cards:
        try:
            title_link = card.select_one("a.js-settlement-link")
            if not title_link:
                continue

            title = _clean_title(title_link.get_text(strip=True))
            claim_url = (title_link.get("href") or "").strip()
            slug = (title_link.get("data-slug") or "").strip()

            if not title or not claim_url:
                continue

            # Description
            desc_p = card.select_one("p")
            description = desc_p.get_text(strip=True) if desc_p else ""

            stats = _extract_stats(card)

            row: RawSettlement = {
                "title": title,
                "defendant": "",  # inferred later by classify module
                "description": description,
                "deadline": stats["deadline"],
                "claim_url": claim_url,
                "source_url": f"{CLASSACTION_ORG_URL}#{slug}" if slug else CLASSACTION_ORG_URL,
                "estimated_payout": stats["estimated_payout"],
                "proof_required": stats["proof_required"],
                "source_name": "classaction.org",
            }
            results.append(row)

        except Exception as exc:
            title_text = card.get_text(" ", strip=True)[:60]
            print(f"  [warn] Failed to parse card ({title_text}...): {exc}")

    print(f"[classaction.org] Parsed {len(results)} settlements")
    return results
