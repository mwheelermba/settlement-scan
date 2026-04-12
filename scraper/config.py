"""Shared constants and configuration for the scraper."""
from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "settlements.json"

USER_AGENT = (
    "SettlementScanBot/1.0 "
    "(+https://github.com/your-org/settlementscan; contact: you@example.com)"
)

REQUEST_TIMEOUT = 60
MAX_RETRIES = 3

# Sources
CLASSACTION_ORG_URL = "https://www.classaction.org/settlements"
OPENCLASSACTIONS_INDEX_URL = "https://openclassactions.com/settlements.php"
OPENCLASSACTIONS_BASE_URL = "https://openclassactions.com"

# Minimum row count from primary source before we consider the scrape valid.
# If the primary returns fewer than this, something is likely broken.
MIN_PRIMARY_ROWS = 10

# SMTP notification (set via env vars or GitHub secrets)
SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
NOTIFY_EMAIL = os.environ.get("NOTIFY_EMAIL", "")

# Dedup thresholds
TITLE_SIMILARITY_THRESHOLD = 0.75
