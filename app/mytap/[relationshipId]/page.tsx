import Image from "next/image";
import Link from "next/link";
import { getMyTapProjection } from "@/lib/fusion/audience";
import { getTapSaveStatus } from "@/lib/fusion/tapsave/service";
import { TAPSAVE_MOMENT_LABELS } from "@/lib/fusion/tapsave/moments";
import { MyTapPreferencesForm } from "@/components/tap/mytap-preferences-form";

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

  return (
    <main className="min-h-screen bg-[#0b0f19] px-4 py-10 text-white">
      <div className="mx-auto max-w-md space-y-6">
        <header className="text-center">
          {projection.businessLogoUrl ? (
            <Image
              src={projection.businessLogoUrl}
              alt=""
              width={64}
              height={64}
              className="mx-auto rounded-xl object-cover"
              unoptimized
            />
          ) : (
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-primary/20 text-2xl font-bold text-primary">
              {projection.businessName.charAt(0)}
            </div>
          )}
          <h1 className="mt-4 text-2xl font-bold">{projection.businessName}</h1>
          <p className="mt-1 text-sm text-white/60">MyTap — saved relationship</p>
        </header>

        <section className="rounded-xl border border-white/10 bg-white/5 p-4">
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
          </dl>
          {reopenHref ? (
            <Link
              href={reopenHref}
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-black"
            >
              Reopen Card
            </Link>
          ) : null}
        </section>

        <MyTapPreferencesForm publicToken={relationshipId} initial={preferences} />

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
