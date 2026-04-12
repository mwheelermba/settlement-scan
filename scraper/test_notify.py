#!/usr/bin/env python3
"""Send a one-off test email using SMTP_* / NOTIFY_EMAIL env vars.

Run from the repository root::

    python -m scraper.test_notify

Set the same variables you use as GitHub Actions secrets (or load a .env file
with your shell).  Example (PowerShell)::

    $env:SMTP_HOST = "smtp.gmail.com"
    $env:SMTP_PORT = "587"
    $env:SMTP_USER = "you@gmail.com"
    $env:SMTP_PASSWORD = "your-app-password"
    $env:NOTIFY_EMAIL = "you@gmail.com"
    python -m scraper.test_notify
"""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from scraper.notify import send_test_email

if __name__ == "__main__":
    raise SystemExit(send_test_email())
