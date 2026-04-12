"""
Email notification for scrape runs.

Sends a summary email after each scrape.  Three severity levels:
 - **SUCCESS** — both sources worked, stats attached.
 - **DEGRADED** — primary or supplementary source failed but we still
   got data from the other; the email warns which source broke.
 - **FAILURE** — both sources failed or the run crashed.

Configuration comes from env vars (set as GitHub Secrets):
 - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, NOTIFY_EMAIL

If SMTP vars are not set the module prints the notification to stdout
instead of sending mail (so local runs still surface the info).
"""
from __future__ import annotations

import smtplib
from dataclasses import dataclass, field
from email.mime.text import MIMEText

from scraper.config import NOTIFY_EMAIL, SMTP_HOST, SMTP_PASSWORD, SMTP_PORT, SMTP_USER


@dataclass
class ScrapeReport:
    primary_ok: bool = True
    primary_error: str = ""
    primary_count: int = 0

    supplementary_ok: bool = True
    supplementary_error: str = ""
    supplementary_count: int = 0

    new_settlements: int = 0
    updated_settlements: int = 0
    deactivated_settlements: int = 0
    pruned_inactive_stale: int = 0
    total_settlements: int = 0

    warnings: list[str] = field(default_factory=list)

    @property
    def severity(self) -> str:
        if not self.primary_ok and not self.supplementary_ok:
            return "FAILURE"
        if not self.primary_ok or not self.supplementary_ok:
            return "DEGRADED"
        return "SUCCESS"

    def summary_text(self) -> str:
        lines: list[str] = []
        lines.append(f"SettlementScan Scrape Report -- {self.severity}")
        lines.append("=" * 50)
        lines.append("")

        # Source status
        p_status = "OK" if self.primary_ok else f"FAILED: {self.primary_error}"
        s_status = "OK" if self.supplementary_ok else f"FAILED: {self.supplementary_error}"
        lines.append(f"Primary (ClassAction.org):      {p_status}")
        lines.append(f"  Rows parsed: {self.primary_count}")
        lines.append(f"Supplementary (OpenClassActions): {s_status}")
        lines.append(f"  Rows parsed: {self.supplementary_count}")
        lines.append("")

        # Merge stats
        lines.append("Merge results:")
        lines.append(f"  + {self.new_settlements} new")
        lines.append(f"  ~ {self.updated_settlements} updated")
        lines.append(f"  - {self.deactivated_settlements} deactivated")
        if self.pruned_inactive_stale:
            lines.append(f"  x {self.pruned_inactive_stale} pruned (inactive >1y since last_verified)")
        lines.append(f"  = {self.total_settlements} total in settlements.json")
        lines.append("")

        if self.warnings:
            lines.append("Warnings:")
            for w in self.warnings:
                lines.append(f"  [!] {w}")
            lines.append("")

        if self.severity == "DEGRADED":
            failed = "Primary" if not self.primary_ok else "Supplementary"
            lines.append(
                f"ACTION NEEDED: The {failed} source failed.  "
                "Data was still produced from the surviving source, but "
                "coverage may be reduced.  Please investigate."
            )
        elif self.severity == "FAILURE":
            lines.append(
                "ACTION NEEDED: Both sources failed.  "
                "settlements.json was NOT updated.  "
                "Check source websites and scraper selectors."
            )

        return "\n".join(lines)


def _send_smtp(subject: str, body: str) -> None:
    """Send a plain-text email using the configured SMTP settings."""
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = SMTP_USER
    msg["To"] = NOTIFY_EMAIL

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as server:
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)


def send_test_email() -> int:
    """Send a minimal test message.  Uses the same env vars as the weekly scrape.

    Run from repo root::

        python -m scraper.test_notify

    Or set env vars inline (PowerShell)::

        $env:SMTP_HOST=\"smtp.gmail.com\"; ...; python -m scraper.test_notify

    Returns 0 on success, 1 on skip or failure.
    """
    if not all([SMTP_HOST, SMTP_USER, SMTP_PASSWORD, NOTIFY_EMAIL]):
        print(
            "[notify] Missing SMTP env vars. Set SMTP_HOST, SMTP_PORT, "
            "SMTP_USER, SMTP_PASSWORD, NOTIFY_EMAIL (same as GitHub repository secrets)."
        )
        return 1

    subject = "[SettlementScan] SMTP test"
    body = (
        "This is a test message from SettlementScan.\n\n"
        "If you received this, SMTP notification is configured correctly.\n"
    )
    try:
        _send_smtp(subject, body)
        print(f"[notify] Test email sent to {NOTIFY_EMAIL}")
        return 0
    except Exception as exc:
        print(f"[notify] Test email failed: {exc}")
        return 1


def send_notification(report: ScrapeReport) -> None:
    """Send (or print) the scrape report."""
    body = report.summary_text()

    # Always print to stdout (visible in GitHub Actions logs)
    print("\n" + body + "\n")

    if not all([SMTP_HOST, SMTP_USER, SMTP_PASSWORD, NOTIFY_EMAIL]):
        print("[notify] SMTP not configured -- skipping email send.")
        return

    subject = f"[SettlementScan] Scrape {report.severity}"
    if report.severity != "SUCCESS":
        subject += " -- action needed"

    try:
        _send_smtp(subject, body)
        print(f"[notify] Email sent to {NOTIFY_EMAIL}")
    except Exception as exc:
        print(f"[notify] Failed to send email: {exc}")
