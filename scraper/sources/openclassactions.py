"""
Parser for OpenClassActions.com (supplementary source).

The index page at ``/settlements.php`` lists settlement links inside
``div.grid-box > a`` elements.  Each link points to an article page that
contains a structured summary table with Deadline, Payout, Category, and
the official Claim Website URL.
"""
from __future__ import annotations

import re
import time
from datetime import datetime
from urllib.parse import urljoin

from bs4 import BeautifulSoup, Tag

from scraper.config import OPENCLASSACTIONS_BASE_URL, OPENCLASSACTIONS_INDEX_URL
from scraper.sources import RawSettlement, fetch_html

# Rate-limit detail page fetches to be polite
_DETAIL_DELAY_SECS = 1.5


def _parse_deadline_text(text: str) -> str | None:
    """
    Parse a human-readable deadline like 'August 14, 2026' into 'YYYY-MM-DD'.
    Returns None for empty / 'Varies' / unparseable.
    """
    text = text.strip()
    if not text or text.lower() in ("varies", "n/a", "open", "tbd"):
        return None
    for fmt in ("%B %d, %Y", "%b %d, %Y", "%m/%d/%Y", "%m/%d/%y"):
        try:
            return datetime.strptime(text, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def _parse_summary_table(soup: BeautifulSoup) -> dict:
    """Extract key fields from the article's summary table."""
    info: dict = {
        "deadline": None,
        "estimated_payout": "Varies",
        "proof_required": None,
        "claim_url": "",
        "category": "",
    }
    table = soup.find("table")
    if not table:
        return info

    for row in table.find_all("tr"):
        cells = row.find_all("td")
        if len(cells) < 2:
            continue
        label = cells[0].get_text(strip=True).lower()
        value_tag = cells[1]
        value = value_tag.get_text(strip=True)

        if "deadline" in label:
            info["deadline"] = _parse_deadline_text(value)
        elif "payout" in label or "estimated" in label:
            info["estimated_payout"] = value or "Varies"
        elif "category" in label:
            info["category"] = value
        elif "claim website" in label:
            link = value_tag.find("a", href=True)
            if link:
                info["claim_url"] = link["href"].strip()

    return info


def _extract_description(soup: BeautifulSoup) -> str:
    """Pull the first meaningful paragraph after the H1."""
    h1 = soup.find("h1")
    if not h1:
        return ""
    for sibling in h1.find_all_next(["p", "div"]):
        text = sibling.get_text(strip=True)
        if len(text) > 80 and "class action" in text.lower():
            return text
    # Fallback: grab the paragraph under "What Is" heading
    for h2 in soup.find_all("h2"):
        if "what is" in h2.get_text(strip=True).lower():
            p = h2.find_next("p")
            if p:
                return p.get_text(strip=True)
    return ""


def _extract_proof_required(soup: BeautifulSoup) -> bool | None:
    """Heuristic: scan for 'proof required' / 'no proof' signals."""
    for h2 in soup.find_all("h2"):
        if "proof" in h2.get_text(strip=True).lower():
            section_text = ""
            for sib in h2.find_next_siblings(["p", "ul"], limit=3):
                section_text += " " + sib.get_text(" ", strip=True)
            low = section_text.lower()
            if "no proof" in low or "no receipts" in low or "no documentation" in low:
                return False
            if "must provide" in low or "documentation" in low or "receipts" in low:
                return True
    return None


def _title_from_h1(soup: BeautifulSoup) -> str:
    """Clean up the article H1 into a settlement title."""
    h1 = soup.find("h1")
    if not h1:
        return ""
    raw = h1.get_text(strip=True)
    # Strip leading dollar amounts ("$117.5M ...")
    raw = re.sub(r"^\$[\d,.]+[MBK]?\s+", "", raw)
    # Strip trailing date/deadline fragments ("— File by August 14, 2026 ...")
    raw = re.sub(r"\s*[—–-]\s*File by.*$", "", raw, flags=re.IGNORECASE)
    # Strip trailing payout fragments ("(Up to $10,000)")
    raw = re.sub(r"\s*\(.*\)\s*$", "", raw)
    return raw.strip()


def scrape() -> list[RawSettlement]:
    """Fetch the OCA index, then fetch each article page for details.

    Returns a list of :class:`RawSettlement` dicts.
    Logs warnings for individual article failures but does not abort.
    """
    print(f"[openclassactions] Fetching index: {OPENCLASSACTIONS_INDEX_URL}")
    index_html = fetch_html(OPENCLASSACTIONS_INDEX_URL)
    index_soup = BeautifulSoup(index_html, "lxml")

    article_links: list[str] = []
    for box in index_soup.select("div.grid-box a[href]"):
        href = box["href"]
        if "/settlements/" in href and href.endswith(".php"):
            full = urljoin(OPENCLASSACTIONS_BASE_URL, href)
            if full not in article_links:
                article_links.append(full)

    print(f"[openclassactions] Found {len(article_links)} article links")

    results: list[RawSettlement] = []
    for i, url in enumerate(article_links):
        try:
            if i > 0:
                time.sleep(_DETAIL_DELAY_SECS)
            print(f"  [{i + 1}/{len(article_links)}] {url}")
            detail_html = fetch_html(url, retries=2)
            detail_soup = BeautifulSoup(detail_html, "lxml")

            title = _title_from_h1(detail_soup)
            if not title:
                print(f"    [warn] No title found, skipping")
                continue

            table_info = _parse_summary_table(detail_soup)
            description = _extract_description(detail_soup)
            proof = _extract_proof_required(detail_soup)
            if proof is None:
                proof = table_info.get("proof_required")

            claim_url = table_info.get("claim_url", "")
            if not claim_url:
                # Fallback: find first external link with "settlement" in text
                for a in detail_soup.find_all("a", href=True):
                    href = a["href"]
                    text = a.get_text(strip=True).lower()
                    if (
                        "openclassactions" not in href
                        and "injuryclaims" not in href
                        and ("file" in text or "claim" in text or "settlement" in text)
                        and href.startswith("http")
                    ):
                        claim_url = href
                        break

            row: RawSettlement = {
                "title": title,
                "defendant": "",
                "description": description[:500] if description else "",
                "deadline": table_info.get("deadline"),
                "claim_url": claim_url,
                "source_url": url,
                "estimated_payout": table_info.get("estimated_payout", "Varies"),
                "proof_required": proof,
                "source_name": "openclassactions.com",
            }
            results.append(row)

        except Exception as exc:
            print(f"    [warn] Failed to fetch/parse {url}: {exc}")

    print(f"[openclassactions] Parsed {len(results)} settlements")
    return results
