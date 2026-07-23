import Image from "next/image";
import Link from "next/link";
import { getMyTapProjection } from "@/lib/fusion/audience";
import { getTapSaveStatus } from "@/lib/fusion/tapsave/service";
import { TAPSAVE_MOMENT_LABELS } from "@/lib/fusion/tapsave/moments";
import { MyTapPreferencesForm } from "@/components/tap/mytap-preferences-form";
import { prisma } from "@/lib/db";
import { computeBalance, resolveTier } from "@/lib/fusion/taploop/ledger-math";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ relationshipId: string }> };

export default async function MyTapPage({ params }: Props) {
  const { relationshipId } = await params;
  const projection = await getMyTapProjection(relationshipId);

  if (!projection) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b0f19] px-4 text-white">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Saved relationship not found</h1>
          <p className="mt-2 text-sm text-white/60">
            This link may have expired or is invalid. No personal information is exposed in Tap
            Connect URLs.
          </p>
          <p className="mt-6 text-xs text-white/40">Powered by Tap The Magic</p>
        </div>
      </main>
    );
  }

  const status = await getTapSaveStatus(relationshipId);
  const preferences = status?.preferences ?? {
    emailOptIn: projection.channels.email,
    smsOptIn: false,
    walletOptIn: projection.channels.wallet,
    frequency: "weekly" as const,
  };
  const moments = status?.moments ?? [];
  const reopenHref = status?.reopenCardUrl ?? null;

  let loyalty: {
    programName: string;
    balance: number;
    tierName: string | null;
    recent: Array<{ type: string; points: number; createdAt: string }>;
  } | null = null;
  try {
    const enrollment = await prisma.loyaltyEnrollment.findFirst({
      where: {
        relationship: { publicToken: relationshipId },
        status: "ACTIVE",
      },
      include: {
        program: {
          select: {
            name: true,
            tiers: { select: { name: true, thresholdPoints: true, rank: true } },
          },
        },
        ledger: {
          select: { type: true, points: true, createdAt: true },
          take: 500,
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (enrollment) {
      const balance = computeBalance(enrollment.ledger);
      const tier = resolveTier(
        balance,
        enrollment.program.tiers.map((t) => ({
          id: t.name,
          name: t.name,
          rank: t.rank,
          thresholdPoints: t.thresholdPoints,
          perks: [],
        }))
      );
      loyalty = {
        programName: enrollment.program.name,
        balance,
        tierName: tier?.name ?? null,
        recent: [...enrollment.ledger]
          .reverse()
          .slice(0, 5)
          .map((e) => ({
            type: e.type,
            points: e.points,
            createdAt: e.createdAt.toISOString(),
          })),
      };
    }
  } catch {
    loyalty = null;
  }

  return (
    <main id="main" className="min-h-screen bg-[#0b0f19] px-4 py-10 text-white">
      <a
        href="#preferences"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-black"
      >
        Skip to preferences
      </a>
      <div className="mx-auto max-w-md space-y-6">
        <header className="text-center">
          {projection.businessLogoUrl ? (
            <Image
              src={projection.businessLogoUrl}
              alt={`${projection.businessName} logo`}
              width={64}
              height={64}
              className="mx-auto rounded-xl object-cover"
              unoptimized
            />
          ) : (
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-primary/20 text-2xl font-bold text-primary"
              aria-hidden
            >
              {projection.businessName.charAt(0)}
            </div>
          )}
          <h1 className="mt-4 text-2xl font-bold">{projection.businessName}</h1>
          <p className="mt-1 text-sm text-white/60">MyTap — saved relationship</p>
        </header>

        <section
          className="rounded-xl border border-white/10 bg-white/5 p-4"
          aria-labelledby="rel-heading"
        >
          <h2 id="rel-heading" className="sr-only">
            Relationship details
          </h2>
          <p className="text-sm leading-relaxed text-white/80">{projection.message}</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-white/50">Status</dt>
              <dd className="capitalize text-primary">{projection.status}</dd>
            </div>
            {projection.savedAt ? (
              <div className="flex justify-between">
                <dt className="text-white/50">Saved</dt>
                <dd>{new Date(projection.savedAt).toLocaleDateString()}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <dt className="text-white/50">Channels</dt>
              <dd className="text-right text-white/80">
                {[
                  projection.channels.email ? "Email" : null,
                  projection.channels.wallet ? "Wallet" : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "None yet"}
              </dd>
            </div>
          </dl>
          {reopenHref ? (
            <Link
              href={reopenHref}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-black"
            >
              Reopen Card
            </Link>
          ) : null}
        </section>

        {loyalty ? (
          <section
            className="rounded-xl border border-white/10 bg-white/5 p-4"
            aria-labelledby="taploop-heading"
          >
            <h2
              id="taploop-heading"
              className="text-sm font-semibold uppercase tracking-wide text-white/50"
            >
              TapLoop
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-white/50">Program</dt>
                <dd>{loyalty.programName}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-white/50">Points</dt>
                <dd className="font-semibold tabular-nums text-primary">{loyalty.balance}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-white/50">Tier</dt>
                <dd>{loyalty.tierName ?? "Member"}</dd>
              </div>
            </dl>
            {loyalty.recent.length > 0 ? (
              <ul className="mt-3 space-y-1 border-t border-white/10 pt-3 text-xs text-white/60">
                {loyalty.recent.map((e, idx) => (
                  <li key={`${e.createdAt}-${idx}`} className="flex justify-between gap-2">
                    <span className="capitalize">{e.type.toLowerCase()}</span>
                    <span className="tabular-nums">
                      {e.points > 0 ? `+${e.points}` : e.points} ·{" "}
                      {new Date(e.createdAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        <div id="preferences">
          <MyTapPreferencesForm publicToken={relationshipId} initial={preferences} />
        </div>

        {moments.length > 0 ? (
          <section className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/50">
              Moments
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {moments.slice(0, 12).map((m) => (
                <li key={m.id} className="flex justify-between gap-3">
                  <span>{TAPSAVE_MOMENT_LABELS[m.kind] ?? m.kind}</span>
                  <span className="text-white/40">
                    {new Date(m.occurredAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <footer className="text-center text-xs text-white/40">Powered by Tap The Magic</footer>
      </div>
    </main>
  );
}
