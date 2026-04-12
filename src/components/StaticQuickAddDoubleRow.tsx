"use client";

type Props = {
  label: string;
  suggestions: string[];
  onAdd: (value: string) => void;
  /** Max chips to show (two rows of up to 8). Default 16. */
  max?: number;
};

/** Up to two rows of pill suggestions (8 + 8) — static "original" quick-add list. */
export function StaticQuickAddDoubleRow({ label, suggestions, onAdd, max = 16 }: Props) {
  const list = suggestions.slice(0, max);
  if (list.length === 0) return null;
  const row1 = list.slice(0, 8);
  const row2 = list.slice(8, 16);

  const chipCls =
    "flex items-start gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer";

  return (
    <div className="pt-2">
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {row1.map((s) => (
          <button key={`a-${s}`} type="button" onClick={() => onAdd(s)} className={chipCls}>
            <span className="shrink-0 select-none" aria-hidden>+</span>
            <span className="leading-snug">{s}</span>
          </button>
        ))}
      </div>
      {row2.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {row2.map((s) => (
            <button key={`b-${s}`} type="button" onClick={() => onAdd(s)} className={chipCls}>
              <span className="shrink-0 select-none" aria-hidden>+</span>
              <span className="leading-snug">{s}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
