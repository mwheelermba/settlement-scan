"use client";

type Props = {
  label: string;
  suggestions: string[];
  onAdd: (value: string) => void;
};

export function SuggestionChips({ label, suggestions, onAdd }: Props) {
  return (
    <div className="pt-1">
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onAdd(s)}
            className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            + {s}
          </button>
        ))}
      </div>
    </div>
  );
}
