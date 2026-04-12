"""
Prune stale inactive settlements from the merged database.

Inactive rows are kept for ``INACTIVE_RETENTION_DAYS`` after their
``last_verified`` date (set when the scraper marks them absent from sources),
then removed so ``settlements.json`` does not grow without bound.
"""
from __future__ import annotations

from datetime import datetime, timedelta

from scraper.config import INACTIVE_RETENTION_DAYS


def prune_stale_inactive(
    settlements: list[dict],
    *,
    retention_days: int = INACTIVE_RETENTION_DAYS,
) -> tuple[list[dict], int]:
    """Return settlements with inactive rows older than *retention_days* removed.

    Only ``active: false`` rows are candidates. Requires a parseable
    ``last_verified`` (``YYYY-MM-DD``); rows without it are kept.
    """
    today = datetime.now().date()
    cutoff = today - timedelta(days=retention_days)

    kept: list[dict] = []
    removed = 0

    for s in settlements:
        if s.get("active", True):
            kept.append(s)
            continue

        lv = s.get("last_verified")
        if not lv or not isinstance(lv, str):
            kept.append(s)
            continue

        try:
            verified = datetime.strptime(lv.strip()[:10], "%Y-%m-%d").date()
        except ValueError:
            kept.append(s)
            continue

        if verified < cutoff:
            removed += 1
            continue

        kept.append(s)

    return kept, removed
