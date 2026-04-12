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
        (local storage). The only network use is optional: if{" "}
        <code className="rounded bg-teal-100/80 px-1 text-xs dark:bg-teal-900/50">HIBP_API_KEY</code> is set, leaving the
        email field sends that address to this app&apos;s API once to query Have I Been Pwned — it isn&apos;t stored.
        Use Export at the bottom for a backup file.
      </p>
      <p>
        <span className="font-medium text-zinc-900 dark:text-zinc-100">Saving:</span> text boxes update your profile when
        you leave the field (Tab or click elsewhere). State and ZIP save immediately when you change them.
      </p>
      <p>
        Many settlements involve <span className="font-medium text-zinc-900 dark:text-zinc-100">data breaches</span>.
        Breach names help match those claims; you can type them yourself or use the optional lookup above.
      </p>
    </div>
  );
}
