"use client";

import type { ProfileUpdater } from "@/lib/profile";
import type { QualifyingQuestion, UserProfile } from "@/lib/types";

export function QualifyingQuestions({
  settlementId,
  questions,
  profile,
  onChange,
}: {
  settlementId: string;
  questions: QualifyingQuestion[];
  profile: UserProfile;
  onChange: (update: ProfileUpdater) => void;
}) {
  if (!questions.length) return null;

  return (
    <div className="mt-4 space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Qualifying questions</p>
      <ul className="space-y-3">
        {questions.map((q) => {
          const val = profile.qualifying_answers[q.id];
          return (
            <li key={q.id} className="flex flex-col gap-2">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">{q.text}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    val === true
                      ? "bg-emerald-600 text-white"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                  onClick={() =>
                    onChange((prev) => ({
                      ...prev,
                      qualifying_answers: { ...prev.qualifying_answers, [q.id]: true },
                    }))
                  }
                >
                  Yes
                </button>
                <button
                  type="button"
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    val === false
                      ? "bg-zinc-700 text-white dark:bg-zinc-600"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                  onClick={() =>
                    onChange((prev) => ({
                      ...prev,
                      qualifying_answers: { ...prev.qualifying_answers, [q.id]: false },
                    }))
                  }
                >
                  No
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="sr-only">Settlement {settlementId}</p>
    </div>
  );
}
