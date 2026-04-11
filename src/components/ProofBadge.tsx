export function ProofBadge({ proofRequired }: { proofRequired: boolean | null }) {
  if (proofRequired === null) {
    return (
      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
        Proof: unknown
      </span>
    );
  }
  if (!proofRequired) {
    return (
      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-900 dark:bg-sky-950/50 dark:text-sky-100">
        No proof required
      </span>
    );
  }
  return (
    <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200">
      Proof required
    </span>
  );
}
