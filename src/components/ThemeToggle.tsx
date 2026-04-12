"use client";

import { THEME_COOKIE, THEME_LIGHT } from "@/lib/theme";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

function setLightCookie() {
  const maxAge = 60 * 60 * 24 * 365;
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? ";Secure" : "";
  document.cookie = `${THEME_COOKIE}=${THEME_LIGHT};path=/;max-age=${maxAge};SameSite=Lax${secure}`;
}

function clearThemeCookie() {
  document.cookie = `${THEME_COOKIE}=;path=/;max-age=0`;
}

type Props = { initialDark: boolean };

/** Low-key footer control: default is dark; offers switch to light and back. */
export function ThemeToggle({ initialDark }: Props) {
  const router = useRouter();
  const [isDark, setIsDark] = useState(initialDark);

  const applyLight = useCallback(() => {
    setLightCookie();
    document.documentElement.classList.remove("dark");
    setIsDark(false);
    router.refresh();
  }, [router]);

  const applyDark = useCallback(() => {
    clearThemeCookie();
    document.documentElement.classList.add("dark");
    setIsDark(true);
    router.refresh();
  }, [router]);

  return (
    <p className="text-[11px] text-zinc-500 dark:text-zinc-500">
      {isDark ? (
        <button
          type="button"
          onClick={applyLight}
          className="cursor-pointer text-zinc-600 underline decoration-zinc-400/60 underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:decoration-zinc-500/60 dark:hover:text-zinc-200"
        >
          Light mode
        </button>
      ) : (
        <button
          type="button"
          onClick={applyDark}
          className="cursor-pointer text-zinc-600 underline decoration-zinc-400/60 underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:decoration-zinc-500/60 dark:hover:text-zinc-200"
        >
          Dark mode
        </button>
      )}
    </p>
  );
}
