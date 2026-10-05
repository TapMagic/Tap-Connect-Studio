import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TapConnectCardPublic } from "@/components/tap/tap-connect-card-public";
import { resolveExperiencePage } from "@/lib/fusion/card/experience-pages";
import {
  EVERENCORE_LOVE_AND_THEFT_ROUTE_BASE,
  resolvePublishedEverEncoreExperience,
} from "@/lib/fusion/card/public-experience-registry";

export const metadata: Metadata = {
  title: "Love & Theft · EverEncore",
  description: "A private EverEncore artist Experience demonstration.",
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

export default async function EverEncorePublicExperiencePage({ params }: {
  params: Promise<{ experienceSlug: string; pageSlug?: string[] }>;
}) {
  const { experienceSlug, pageSlug } = await params;
  const publication = resolvePublishedEverEncoreExperience(experienceSlug);
  if (!publication || !publication.config.experience) notFound();
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
      businessId="public-everencore-love-and-theft"
      deviceSlotId="stable-public-experience"
      keepCardEnabled={false}
      walletFeatureOn={false}
      backgroundColor="#070504"
      routeBasePath={EVERENCORE_LOVE_AND_THEFT_ROUTE_BASE}
      directPageRef={directPage.pageId}
    />
  </main>;
}
