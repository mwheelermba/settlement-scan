export function PrivacyBadge() {
  return (
    <p className="inline-flex items-center justify-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-900 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100">
      <span aria-hidden>🔒</span>
      Your profile stays in this browser — SettlementScan never stores it on a server.
    </p>
  );
}
