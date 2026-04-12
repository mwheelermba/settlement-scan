"""Source parsers for settlement data."""
from __future__ import annotations

import time
from typing import TypedDict

import requests

from scraper.config import MAX_RETRIES, USER_AGENT


class RawSettlement(TypedDict, total=False):
    """Intermediate shape returned by source parsers before type inference."""
    title: str
    defendant: str
    description: str
    deadline: str | None
    claim_url: str
    source_url: str
    estimated_payout: str
    proof_required: bool | None
    source_name: str  # which parser produced this row


def fetch_html(url: str, *, retries: int = MAX_RETRIES) -> str:
    """GET *url* with retries and exponential backoff."""
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
        except Exception as exc:
            last = exc
            wait = 2 ** attempt
            print(f"  [retry {attempt + 1}/{retries}] {url} => {exc}; sleeping {wait}s")
            time.sleep(wait)
    raise RuntimeError(f"Failed to fetch {url} after {retries} retries: {last}") from last
