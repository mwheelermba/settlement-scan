"use client";

type Props = {
  label: string;
  terms: string[];
  onAdd: (value: string) => void;
};

/** One row of up to 8 cells — terms from the live settlement DB (see `getSmartTermsFromDbOnly`). */
export function SmartQuickAddRow({ label, terms, onAdd }: Props) {
  const cells = terms.slice(0, 8);
  if (cells.length === 0) return null;

  return (
    <div className="pt-1">
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-8">
        {cells.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onAdd(s)}
            className="rounded-lg border border-teal-200/80 bg-teal-50/80 px-2 py-1.5 text-left text-xs font-medium text-teal-900 hover:bg-teal-100/90 dark:border-teal-900/50 dark:bg-teal-950/40 dark:text-teal-100 dark:hover:bg-teal-900/50"
          >
            + {s}
          </button>
        ))}
      </div>
    </div>
  );
}
