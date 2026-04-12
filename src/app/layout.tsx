import { Layout } from "@/components/Layout";
import { isDarkFromCookie, THEME_COOKIE } from "@/lib/theme";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

/** NEXT_PUBLIC_SITE_URL must be a full URL at runtime; host-only values get https:// prepended. */
function getMetadataBase(): URL {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").trim();
  const withScheme = /^https?:\/\//i.test(raw)
    ? raw
    : `https://${raw.replace(/^\/+/, "")}`;
  try {
    return new URL(withScheme);
  } catch {
    return new URL("http://localhost:3000");
  }
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: "SettlementScan — Class action settlements you may qualify for",
    template: "%s · SettlementScan",
  },
  description:
    "Find class action settlements matched to your profile. Your data stays in your browser.",
  manifest: "/site.webmanifest",
  themeColor: "#09090b",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const theme = cookieStore.get(THEME_COOKIE)?.value;
  const isDark = isDarkFromCookie(theme);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased ${isDark ? "dark" : ""}`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Layout initialThemeDark={isDark}>{children}</Layout>
        <Analytics />
      </body>
    </html>
  );
}
