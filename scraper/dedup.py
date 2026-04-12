"""
Deduplication engine for settlements scraped from multiple sources.

Challenges addressed:
 - The *same* settlement appears on both sources with slightly different titles.
 - The *same* defendant can have multiple distinct active settlements
   (e.g. "Hyundai Kia — Vehicle Theft" vs "Hyundai Kia — Airbag Control Units").
 - Two *different* defendants can have similarly-named settlements.

Strategy (applied in priority order):
 1. **Claim-URL domain match** — strongest signal.  If two rows resolve to
    the same administrator website, they are the same settlement regardless
    of title wording.
 2. **Title token similarity + deadline match** — catches same-settlement
    listings that link to different intermediate pages.
 3. If neither fires, the rows are treated as distinct.

When a duplicate is found the *primary source* row wins; supplementary
fields fill any blanks.
"""
from __future__ import annotations

import re
from urllib.parse import urlparse

from scraper.config import TITLE_SIMILARITY_THRESHOLD
from scraper.sources import RawSettlement


def _normalize_url_domain(url: str) -> str:
    """Return a canonical domain key: lowercase, no www, no trailing slash."""
    if not url:
        return ""
    parsed = urlparse(url.lower().rstrip("/"))
    host = parsed.netloc or ""
    host = re.sub(r"^www\.", "", host)
    # Include the path to distinguish e.g. site.com/case-a vs site.com/case-b
    path = parsed.path.rstrip("/")
    return f"{host}{path}"


def _title_tokens(title: str) -> set[str]:
    """Lowercase word-set, stripping common noise words."""
    noise = {
        "class", "action", "settlement", "lawsuit", "the", "a", "an",
        "of", "for", "and", "in", "to", "at", "by", "-", "–", "—",
    }
    words = re.findall(r"[a-z0-9]+", title.lower())
    return {w for w in words if w not in noise and len(w) > 1}


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def _deadlines_compatible(d1: str | None, d2: str | None) -> bool:
    """True when deadlines are the same, or at least one is unknown."""
    if d1 is None or d2 is None:
        return True
    return d1 == d2


def deduplicate(
    primary: list[RawSettlement],
    supplementary: list[RawSettlement],
) -> list[RawSettlement]:
    """Merge *supplementary* into *primary*, dropping duplicates.

    Returns a unified list.  Primary rows are always kept; supplementary
    rows are added only if they don't match an existing primary row.
    When a match is found, any empty fields on the primary row are filled
    from the supplementary row.
    """
    # Index primary rows by claim-URL key for O(1) lookups
    url_index: dict[str, int] = {}
    for i, row in enumerate(primary):
        key = _normalize_url_domain(row.get("claim_url", ""))
        if key:
            url_index[key] = i

    # Pre-compute title tokens for primary rows
    primary_tokens = [_title_tokens(r.get("title", "")) for r in primary]

    merged = list(primary)  # shallow copy; we'll mutate in-place for fill-ins
    added = 0
    dupes = 0

    for sup_row in supplementary:
        sup_url_key = _normalize_url_domain(sup_row.get("claim_url", ""))
        matched_idx: int | None = None

        # --- Check 1: exact claim-URL domain match ---
        if sup_url_key and sup_url_key in url_index:
            matched_idx = url_index[sup_url_key]

        # --- Check 2: title similarity + deadline compatibility ---
        if matched_idx is None:
            sup_tokens = _title_tokens(sup_row.get("title", ""))
            sup_deadline = sup_row.get("deadline")
            best_score = 0.0
            best_idx: int | None = None
            for i, pri_tokens in enumerate(primary_tokens):
                score = _jaccard(sup_tokens, pri_tokens)
                if (
                    score > best_score
                    and score >= TITLE_SIMILARITY_THRESHOLD
                    and _deadlines_compatible(sup_deadline, merged[i].get("deadline"))
                ):
                    best_score = score
                    best_idx = i
            if best_idx is not None:
                matched_idx = best_idx

        if matched_idx is not None:
            # Fill empty primary fields from supplementary
            target = merged[matched_idx]
            for field in ("description", "defendant", "estimated_payout", "claim_url"):
                if not target.get(field) and sup_row.get(field):
                    target[field] = sup_row[field]  # type: ignore[literal-required]
            if target.get("proof_required") is None and sup_row.get("proof_required") is not None:
                target["proof_required"] = sup_row["proof_required"]
            dupes += 1
        else:
            # Genuinely new settlement — add it
            merged.append(sup_row)
            # Also register in url_index so later supplementary rows can dedup
            if sup_url_key:
                url_index[sup_url_key] = len(merged) - 1
            primary_tokens.append(_title_tokens(sup_row.get("title", "")))
            added += 1

    print(
        f"[dedup] {len(primary)} primary + {len(supplementary)} supplementary "
        f"=> {dupes} duplicates merged, {added} unique additions "
        f"=> {len(merged)} total"
    )
    return merged
