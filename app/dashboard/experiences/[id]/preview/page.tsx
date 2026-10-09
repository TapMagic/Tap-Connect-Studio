import Link from "next/link";
import { notFound } from "next/navigation";
import { TapConnectCardPublic } from "@/components/tap/tap-connect-card-public";
import { ExperiencePreviewMarker } from "@/components/fusion/card/experience-preview-marker";
import { parseBrandContactProfile } from "@/lib/brand/contact-profile";
import { parseTapConnectCard } from "@/lib/brand/tap-card";
import { prisma } from "@/lib/db";
import { requireBusinessCapability } from "@/lib/fusion/authz/business-capability";
import "@/app/t/tap.css";

export const dynamic = "force-dynamic";

export default async function ExperienceDraftPreviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  const { business } = await requireBusinessCapability("card.draft.edit");
  const { id } = await params;
  const query = await searchParams;
  const [document, brandKit] = await Promise.all([
    prisma.cardCreativeDocument.findFirst({ where: { id, businessId: business.id, archivedAt: null }, include: { publicDestination: true } }),
    prisma.brandKit.findUnique({ where: { businessId: business.id } }),
  ]);
  if (!document) notFound();
  const profile = parseBrandContactProfile(brandKit?.socialLinks);
  const contactProfile = {
    ...profile,
    displayName: profile.displayName || document.clientName,
    organization: profile.organization || document.clientName,
    phone: profile.phone || business.phone || undefined,
    email: profile.email || business.email || undefined,
    website: profile.website || business.website || undefined,
  };
  const config = parseTapConnectCard(document.draft, {
    businessName: document.clientName,
    profile: contactProfile,
    logoUrl: business.logoUrl,
    accentColor: brandKit?.accentColor || "#d4af37",
    reviewUrl: business.googleReviewUrl,
  });
  return <div className="min-h-dvh bg-[#070a10] text-white" data-testid="experience-draft-preview">
    <ExperiencePreviewMarker experienceId={document.id} />
    <header className="sticky top-0 z-50 flex min-h-12 items-center gap-3 border-b border-cyan-300/20 bg-[#081019]/94 px-3 backdrop-blur-xl">
      <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{document.clientName} · {document.name}</p><p className="text-[9px] uppercase tracking-[.13em] text-cyan-200/65">Draft Preview · saved revision {document.draftRevision} · public remains unchanged</p></div>
      <Link href={`/dashboard/card/edit?experience=${encodeURIComponent(document.id)}&returnTo=${encodeURIComponent("/dashboard/experiences/library")}`} className="rounded-lg border border-white/14 px-3 py-2 text-xs">Return to edit</Link>
      {document.publicDestination && document.currentPublicationSnapshotId ? <a href={`/everencore/${document.publicDestination.slug}`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-[#b8ff2c]/38 bg-[#b8ff2c]/8 px-3 py-2 text-xs text-[#d8ff8a]">Open public destination ↗</a> : null}
    </header>
    <main className="mx-auto min-h-[calc(100dvh-3rem)] max-w-[430px] bg-[#070504] shadow-2xl" data-preview-renderer="canonical-public">
      <TapConnectCardPublic
        config={config}
        profile={contactProfile}
        businessName={document.clientName}
        businessId={business.id}
        deviceSlotId={`draft-preview-${document.id}`}
        keepCardEnabled={false}
        walletFeatureOn={false}
        backgroundColor="#070504"
        directPageRef={query.page}
      />
    </main>
  </div>;
}
