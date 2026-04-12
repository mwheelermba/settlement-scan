import Link from "next/link";

export function ProfileIntro() {
  return (
    <div className="space-y-3 rounded-2xl border border-teal-200/80 bg-teal-50/60 px-4 py-4 text-sm leading-relaxed text-zinc-700 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-zinc-300">
      <p>
        What you enter here is used to <span className="font-medium text-zinc-900 dark:text-zinc-100">match</span> you to
        open class actions in our database. You do not have to list everything — you can always{" "}
        <Link href="/browse" className="font-medium text-teal-800 underline dark:text-teal-400">
          browse every active settlement
        </Link>{" "}
        with search and filters, even with a minimal profile.
      </p>
      <p>
        Your profile is stored only in <span className="font-medium text-zinc-900 dark:text-zinc-100">this browser</span>{" "}
        (local storage). It is not sent to our servers. Use Export at the bottom if you want a backup file.
      </p>
      <p>
        Many settlements involve <span className="font-medium text-zinc-900 dark:text-zinc-100">data breaches</span>. If
        you add email addresses, we can (when enabled) ask{" "}
        <span className="font-medium">Have I Been Pwned</span> which breach names apply — most people forget the notices
        they got years ago. You can also type breach names yourself. That helps match breach-type claims.
      </p>
    </div>
  );
}
