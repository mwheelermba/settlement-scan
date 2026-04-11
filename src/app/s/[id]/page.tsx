import { ShareButton } from "@/components/ShareButton";
import { DeadlineBadge } from "@/components/DeadlineBadge";
import { ProofBadge } from "@/components/ProofBadge";
import { getActiveSettlements, getSettlementById } from "@/lib/settlements";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return getActiveSettlements().map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const s = getSettlementById(id);
  if (!s) return { title: "Settlement" };
  return {
    title: s.title,
    description: s.description.slice(0, 160),
    openGraph: {
      title: s.title,
      description: `${s.defendant} · ${s.estimated_payout} · Due ${s.deadline ?? "TBD"}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: s.title,
      description: s.description.slice(0, 200),
    },
  };
}

export default async function ShareSettlementPage({ params }: Props) {
  const { id } = await params;
  const s = getSettlementById(id);
  if (!s || !s.active) notFound();

  return (
    <div className="space-y-6">
      <Link href="/browse" className="text-sm font-medium text-teal-700 dark:text-teal-400">
        ← All settlements
      </Link>
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{s.title}</h1>
        <p className="text-zinc-600 dark:text-zinc-400">{s.defendant}</p>
        <div className="flex flex-wrap items-center gap-2">
          <DeadlineBadge deadline={s.deadline} />
          <ProofBadge proofRequired={s.proof_required} />
          <span className="text-sm font-semibold">{s.estimated_payout}</span>
        </div>
      </header>
      <p className="leading-relaxed text-zinc-700 dark:text-zinc-300">{s.description}</p>
      <div className="flex flex-wrap gap-3">
        <a
          href={s.claim_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Open claim site
        </a>
        <ShareButton settlementId={s.id} title={s.title} />
      </div>
    </div>
  );
}
