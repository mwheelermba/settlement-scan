"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ProfileBackupAutoWriter, ProfileBackupProvider } from "./ProfileBackupContext";
import { ProfileBackupFloatingBar } from "./ProfileBackupFloatingBar";
import { PrivacyBadge } from "./PrivacyBadge";
import { ThemeToggle } from "./ThemeToggle";
import { VisitorPing } from "./VisitorPing";

const nav = [
  { href: "/", label: "Matches" },
  { href: "/profile", label: "Profile" },
  { href: "/browse", label: "Browse" },
  { href: "/saved", label: "Filed & Saved" },
  { href: "/dashboard", label: "Community" },
  { href: "/report", label: "Report" },
];

export function Layout({
  children,
  initialThemeDark,
}: {
  children: ReactNode;
  initialThemeDark: boolean;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <ProfileBackupProvider>
      <ProfileBackupAutoWriter />
    <div className="flex min-h-full flex-col">
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            SettlementScan
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm font-medium">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive(item.href)
                    ? "text-teal-700 dark:text-teal-400"
                    : "text-zinc-600 hover:text-teal-600 dark:text-zinc-400 dark:hover:text-teal-400"
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8">
        <VisitorPing />
        <ProfileBackupFloatingBar />
        {children}
      </main>
      <footer className="border-t border-zinc-200 bg-zinc-50/80 py-6 dark:border-zinc-800 dark:bg-zinc-950/50">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <PrivacyBadge />
          <p className="text-xs">
            Free and open source — settlement data comes from public listings and community contributions. Not legal advice.
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            Like this app? Help support it by{" "}
            <a
              href="https://buymeacoffee.com/michaelwheeler9919"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-700 underline decoration-teal-700/30 underline-offset-2 hover:decoration-teal-700 dark:text-teal-400 dark:decoration-teal-400/30"
            >
              buying me a coffee
            </a>
            . Totally optional — the app stays free either way.
          </p>
          <ThemeToggle initialDark={initialThemeDark} />
        </div>
      </footer>
    </div>
    </ProfileBackupProvider>
  );
}
