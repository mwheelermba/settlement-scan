"""
Settlement type classification and criteria extraction.

Uses keyword heuristics on title + description to derive:
 - ``type`` (data_breach | consumer | vehicle | employment | financial | housing | health)
 - ``defendant`` (best-effort extraction from the title)
 - ``criteria.states`` (two-letter codes mentioned in description)
 - ``criteria.vehicles`` (make/model/year from description)
 - ``criteria.breach_name`` (from title for data-breach type)
 - ``criteria.date_range`` (date spans found in description)
 - ``criteria.services`` / ``criteria.products`` (keyword extraction)
"""
from __future__ import annotations

import re
from datetime import datetime

from scraper.sources import RawSettlement

# ── State extraction ────────────────────────────────────────────────────────
_US_STATES = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
    "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
    "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
    "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
    "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
    "massachusetts": "MA", "michigan": "MI", "minnesota": "MN",
    "mississippi": "MS", "missouri": "MO", "montana": "MT", "nebraska": "NE",
    "nevada": "NV", "new hampshire": "NH", "new jersey": "NJ",
    "new mexico": "NM", "new york": "NY", "north carolina": "NC",
    "north dakota": "ND", "ohio": "OH", "oklahoma": "OK", "oregon": "OR",
    "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
    "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
    "vermont": "VT", "virginia": "VA", "washington": "WA",
    "west virginia": "WV", "wisconsin": "WI", "wyoming": "WY",
    "district of columbia": "DC",
}

# Reverse map for abbreviation-only mentions like "(CA)"
_STATE_ABBREVS = {v for v in _US_STATES.values()}


def _extract_states(text: str) -> list[str] | None:
    """Return state codes found in *text*, or None for nationwide."""
    found: set[str] = set()
    lower = text.lower()

    for name, code in _US_STATES.items():
        # Word-boundary match to avoid false positives
        if re.search(rf"\b{re.escape(name)}\b", lower):
            found.add(code)

    # Also pick up parenthesized abbreviations like "(California)" already
    # caught above, and bare "(CA)" patterns in titles
    for match in re.findall(r"\b([A-Z]{2})\b", text):
        if match in _STATE_ABBREVS:
            # Only include if it looks intentional (near "resident" or in title parens)
            context_pat = rf"\({re.escape(match)}\)|{re.escape(match)}\s+resident"
            if re.search(context_pat, text, re.IGNORECASE):
                found.add(match)

    return sorted(found) if found else None


# ── Date range extraction ───────────────────────────────────────────────────
_DATE_RANGE_RE = re.compile(
    r"between\s+"
    r"(\w+ \d{1,2},?\s*\d{4})\s+and\s+(\w+ \d{1,2},?\s*\d{4})",
    re.IGNORECASE,
)

_DATE_FORMATS = ["%B %d, %Y", "%B %d %Y", "%b %d, %Y", "%b %d %Y"]


def _parse_date(s: str) -> str | None:
    s = s.strip().replace(",", ", ").replace("  ", " ")
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def _extract_date_range(text: str) -> dict | None:
    m = _DATE_RANGE_RE.search(text)
    if not m:
        return None
    start = _parse_date(m.group(1))
    end = _parse_date(m.group(2))
    if start and end:
        return {"after": start, "before": end}
    return None


# ── Vehicle extraction ──────────────────────────────────────────────────────
_VEHICLE_MAKES = [
    "Acura", "Audi", "BMW", "Buick", "Cadillac", "Chevrolet", "Chrysler",
    "Dodge", "Fiat", "Ford", "Genesis", "GMC", "Honda", "Hyundai", "Infiniti",
    "Jaguar", "Jeep", "Kia", "Land Rover", "Lexus", "Lincoln", "Mazda",
    "Mercedes-Benz", "Mitsubishi", "Nissan", "Porsche", "Ram", "Subaru",
    "Tesla", "Toyota", "Volkswagen", "Volvo",
]

_YEAR_RANGE_RE = re.compile(r"(\d{4})\s*[-–—]\s*(\d{4})")
_SINGLE_YEAR_RE = re.compile(r"\b(20[0-2]\d|19[89]\d)\b")


def _extract_vehicles(text: str) -> list[dict] | None:
    found: list[dict] = []
    for make in _VEHICLE_MAKES:
        if make.lower() not in text.lower():
            continue
        # Look for model names after the make
        pattern = rf"\b{re.escape(make)}\s+([A-Z][a-zA-Z0-9 ]+?)(?=[,;.\)]|\band\b|\bor\b|\bmodels\b|\bvehicles\b|\bbuilt\b|\bmanufactured\b)"
        for m in re.finditer(pattern, text, re.IGNORECASE):
            model = m.group(1).strip().rstrip(" -–—")
            # Extract year range near the mention
            context = text[max(0, m.start() - 60) : m.end() + 60]
            yr = _YEAR_RANGE_RE.search(context)
            entry: dict = {"make": make, "model": model}
            if yr:
                entry["yearMin"] = int(yr.group(1))
                entry["yearMax"] = int(yr.group(2))
            found.append(entry)

    if not found:
        # Fallback: just capture make + year range without model
        for make in _VEHICLE_MAKES:
            if make.lower() in text.lower():
                yr = _YEAR_RANGE_RE.search(text)
                entry = {"make": make, "model": ""}
                if yr:
                    entry["yearMin"] = int(yr.group(1))
                    entry["yearMax"] = int(yr.group(2))
                found.append(entry)

    return found if found else None


# ── Type classification ─────────────────────────────────────────────────────
_TYPE_SIGNALS: list[tuple[str, list[str]]] = [
    ("data_breach", [
        "data breach", "personal information", "data security",
        "cyber", "breach notification", "identity theft",
        "unauthorized access", "data incident",
    ]),
    ("vehicle", [
        "vehicle", "engine", "transmission", "airbag", "recall",
        "forklift", "truck", "braking", "sliding door",
    ]),
    ("employment", [
        "unpaid wages", "labor law", "employee", "worker",
        "independent contractor", "misclassification", "overtime",
        "child labor", "nurses",
    ]),
    ("financial", [
        "mortgage", "loan servicing", "credit union", "bank",
        "payment for order flow", "merchant fees", "card fees",
        "credit card", "overdraft",
    ]),
    ("housing", [
        "housing", "rent", "tenant", "landlord", "rental",
        "apartment", "insulation", "shingle", "roof", "drywall",
        "plumbing", "pex tubing",
    ]),
    ("health", [
        "blood pressure", "drug", "pharmaceutical", "vaccine",
        "medical", "health", "hospital", "toothpaste", "acne",
        "surgery", "orthopaedic", "orthopedic",
    ]),
]


def _classify_type(title: str, description: str) -> str:
    combined = f"{title} {description}".lower()
    scores: dict[str, int] = {}
    for stype, keywords in _TYPE_SIGNALS:
        count = sum(1 for kw in keywords if kw in combined)
        if count:
            scores[stype] = count

    if scores:
        return max(scores, key=scores.get)  # type: ignore[arg-type]
    return "consumer"  # default


# ── Defendant extraction ────────────────────────────────────────────────────
_TITLE_STRIP_RE = re.compile(
    r"\s*(?:Class Action Settlement|Settlement|Class Action|Lawsuit).*$",
    re.IGNORECASE,
)
_TITLE_DASH_SPLIT = re.compile(r"\s*[-–—]\s*")


def _extract_defendant(title: str) -> str:
    """Best-effort defendant name from the settlement title."""
    cleaned = _TITLE_STRIP_RE.sub("", title).strip()
    parts = _TITLE_DASH_SPLIT.split(cleaned)
    # The defendant is typically the first segment
    if parts:
        return parts[0].strip().rstrip(",")
    return cleaned


# ── Service / product extraction ────────────────────────────────────────────
_SERVICE_KEYWORDS = [
    "Google Play Store", "Google Play", "Tinder", "Grubhub", "Robinhood",
    "Amazon Prime", "Amazon", "Sirius XM", "SiriusXM", "LastPass",
    "Comcast", "Xfinity", "T-Mobile", "Equifax", "Avis", "Hertz",
    "Krispy Kreme", "MUBI", "DoorDash", "Uber", "Lyft", "Netflix",
    "Spotify", "Hulu", "Facebook", "Instagram", "Twitter", "X",
    "WhatsApp", "Zoom", "Slack",
    "Patelco Credit Union", "SouthState Bank", "Cadence Bank",
    "Kaiser Permanente", "Blue Cross", "Aetna", "UnitedHealth",
]


def _extract_services(text: str) -> list[str] | None:
    lower = text.lower()
    found: list[str] = []
    for svc in _SERVICE_KEYWORDS:
        svc_low = svc.lower()
        # Require word boundaries for short names to avoid false positives
        if len(svc) <= 3:
            if re.search(rf"\b{re.escape(svc_low)}\b", lower):
                found.append(svc)
        else:
            if svc_low in lower:
                found.append(svc)
    return sorted(set(found)) if found else None


def _extract_products(text: str) -> list[str] | None:
    """Extract product names — very heuristic, catches known patterns."""
    products: list[str] = []
    known = [
        "RevitaLash", "RevitaBrow", "Cosequin", "Boostrix", "Traeger",
        "Whirlpool", "Maytag", "KitchenAid", "JennAir", "Shimano",
        "Zonolite", "CertainTeed", "Sanyo", "NIBCO", "Sealy",
        "Tom's of Maine", "Differin", "Joint Juice", "Losartan",
        "Irbesartan", "Duloxetine",
    ]
    for prod in known:
        if prod.lower() in text.lower():
            products.append(prod)
    return sorted(set(products)) if products else None


# ── Breach name extraction ──────────────────────────────────────────────────
def _extract_breach_name(title: str, description: str) -> str | None:
    combined = f"{title} {description}"
    m = re.search(
        r"(?:the\s+)?(\w[\w .'-]+?)\s+data\s+breach",
        combined,
        re.IGNORECASE,
    )
    if m:
        name = m.group(1).strip().rstrip(" -–—")
        # Append year if found nearby
        year_match = re.search(r"\b(20[12]\d)\b", combined[m.start():m.end() + 40])
        if year_match:
            name = f"{name} {year_match.group(1)}"
        return name
    return None


# ── ID generation ───────────────────────────────────────────────────────────
def _generate_id(title: str, deadline: str | None) -> str:
    # Strip common suffixes before slugifying
    cleaned = re.sub(
        r"\s*(Class Action Settlement|Class Action|Settlement|Lawsuit)\s*$",
        "", title, flags=re.IGNORECASE,
    ).strip()
    slug = re.sub(r"[^a-z0-9]+", "-", cleaned.lower()).strip("-")
    # Truncate very long slugs
    parts = slug.split("-")
    if len(parts) > 8:
        slug = "-".join(parts[:8])
    # Append year from deadline to disambiguate recurring settlements
    if deadline:
        year = deadline[:4]
        if not slug.endswith(year):
            slug = f"{slug}-{year}"
    return slug


# ── Public API ──────────────────────────────────────────────────────────────

def enrich(row: RawSettlement) -> dict:
    """Take a raw scraped row and return a full settlement dict matching the
    ``Settlement`` TypeScript type.
    """
    title = row.get("title", "")
    desc = row.get("description", "")
    deadline = row.get("deadline")
    combined_text = f"{title} {desc}"

    stype = _classify_type(title, desc)
    defendant = row.get("defendant") or _extract_defendant(title)

    vehicles = _extract_vehicles(combined_text) if stype == "vehicle" else None
    breach_name = _extract_breach_name(title, desc) if stype == "data_breach" else None

    return {
        "id": _generate_id(title, deadline),
        "title": title,
        "defendant": defendant,
        "description": desc,
        "deadline": deadline,
        "claim_url": row.get("claim_url", ""),
        "source_url": row.get("source_url", ""),
        "estimated_payout": row.get("estimated_payout", "Varies"),
        "proof_required": row.get("proof_required"),
        "type": stype,
        "active": True,
        "last_verified": datetime.now().strftime("%Y-%m-%d"),
        "criteria": {
            "states": _extract_states(combined_text),
            "services": _extract_services(combined_text),
            "products": _extract_products(combined_text),
            "vehicles": vehicles,
            "breach_name": breach_name,
            "date_range": _extract_date_range(combined_text),
            "qualifying_questions": [],
        },
    }
