"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function SettlementBackLink() {
  const sp = useSearchParams();
  const from = sp.get("from");
  const back =
    from === "matches"
      ? { href: "/", label: "Back" as const }
      : from === "browse"
        ? { href: "/browse", label: "Back" as const }
        : { href: "/browse", label: "Browse all settlements" as const };

  return (
    <Link href={back.href} className="text-sm font-medium text-teal-700 dark:text-teal-400">
      ← {back.label}
    </Link>
  );
}
