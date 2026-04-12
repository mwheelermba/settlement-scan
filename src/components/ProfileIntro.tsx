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
        with search and filters, even with a minimal profile. Optional email breach suggestions use{" "}
        <a
          href="https://haveibeenpwned.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-teal-800 underline dark:text-teal-400"
        >
          Have I Been Pwned
        </a>{" "}
        (details below).
      </p>
      <p>
        Your profile is stored only in <span className="font-medium text-zinc-900 dark:text-zinc-100">this browser</span>{" "}
        — we do not keep your personal data on our servers. Use{" "}
        <span className="font-medium text-zinc-900 dark:text-zinc-100">Save backup</span> at the bottom of this page to
        download or sync a JSON file you can re-import on another device or browser.
      </p>
      <p className="font-bold text-red-700 dark:text-red-400">
        Clearing site data, cookies, or &quot;everything&quot; in your browser can erase your profile — including filed
        claims, saved bookmarks, and dismissed matches. Please{" "}
        <Link
          href="#profile-export"
          className="font-bold text-red-700 underline decoration-red-700/50 underline-offset-2 hover:text-red-800 dark:text-red-300 dark:decoration-red-400/50 dark:hover:text-red-200"
        >
          save a JSON backup below
        </Link>{" "}
        regularly so you don&apos;t lose your progress.
      </p>
      <p>
        If you add an email address, you can optionally run a one-time lookup to{" "}
        <span className="font-medium text-zinc-900 dark:text-zinc-100">Have I Been Pwned</span> to suggest breach names;
        that address is not stored on our servers. You can skip that and type breach names yourself.
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
