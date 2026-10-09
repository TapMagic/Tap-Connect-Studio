import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TapConnectCardPublic } from "@/components/tap/tap-connect-card-public";
import { resolveExperiencePage } from "@/lib/fusion/card/experience-pages";
import {
  resolveEverEncoreDestination,
} from "@/lib/fusion/card/public-experience-registry";

export async function generateMetadata({ params }: { params: Promise<{ experienceSlug: string }> }): Promise<Metadata> {
  const { experienceSlug } = await params;
  const resolution = await resolveEverEncoreDestination(experienceSlug);
  return {
    title: resolution.state !== "missing" ? `${resolution.state === "live" ? resolution.publication.businessName : resolution.businessName} · EverEncore` : "EverEncore Experience",
    description: resolution.state === "live" ? `${resolution.publication.businessName} public Experience.` : "This Experience is currently unavailable.",
    robots: { index: false, follow: false, noarchive: true, nocache: true },
  };
}

export default async function EverEncorePublicExperiencePage({ params }: {
  params: Promise<{ experienceSlug: string; pageSlug?: string[] }>;
}) {
  const { experienceSlug, pageSlug } = await params;
  const resolution = await resolveEverEncoreDestination(experienceSlug);
  if (resolution.state === "missing") notFound();
  if (resolution.state === "dormant") {
    return <main className="grid min-h-dvh place-items-center bg-[#070a10] p-6 text-white" data-testid="dormant-public-experience" data-dormant-reason={resolution.reason}>
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[.035] p-8 text-center shadow-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#b8ff2c]">EverEncore Experience</p>
        <h1 className="mt-3 text-2xl font-semibold">Currently unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-white/55">{resolution.businessName}&apos;s Experience is dormant right now. This destination is still reserved; please check back later.</p>
      </section>
    </main>;
  }
  const publication = resolution.publication;
  if (!publication.config.experience) notFound();
  if (pageSlug && pageSlug.length > 1) notFound();
  const directPageRef = pageSlug?.[0] || publication.config.experience.defaultPageId;
  const directPage = resolveExperiencePage(publication.config.experience, directPageRef);
  if (!directPage || !directPage.pageVisible || directPage.access?.lockedBehavior?.mode === "hidden") notFound();

  return <main
    className="min-h-dvh bg-[#070504]"
    data-testid="everencore-public-experience"
    data-public-experience-slug={publication.stableSlug}
    data-published-revision={publication.publishedRevision}
    data-direct-page={directPage.slug}
  >
    <TapConnectCardPublic
      config={publication.config}
      profile={publication.profile}
      businessName={publication.businessName}
      businessId={publication.businessId || `public-everencore-${publication.stableSlug}`}
      deviceSlotId="stable-public-experience"
      keepCardEnabled={false}
      walletFeatureOn={false}
      backgroundColor="#070504"
      routeBasePath={`/everencore/${publication.stableSlug}`}
      directPageRef={directPage.pageId}
    />
  </main>;
}
