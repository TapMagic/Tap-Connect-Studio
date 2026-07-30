import Link from "next/link";
import { ArrowRight, Palette } from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isMediaUploadReady } from "@/lib/config/integrations";
import { StudioHubSections } from "@/components/studio/hub-sections";
import { KeywordsSuggestPanel } from "@/components/fusion/keywords/keywords-suggest-panel";
import { ownerMediaUsageLabel } from "@/lib/media/usage-labels";
import { type LibraryAsset } from "@/components/fusion/assets/assets-library";
import { AssetStudioWorkspace } from "@/components/fusion/assets/asset-studio-workspace";

export const dynamic = "force-dynamic";

/** Extract candidate media URLs from a JSON blob (mirrors /api/media). */
function collectUrls(blob: unknown): string[] {
  const text = JSON.stringify(blob ?? {});
  const matches = text.match(/https?:\/\/[^"\\\s]+|data:image\/[^"\\\s]+/g);
  return matches ?? [];
}

export default async function AssetsHubPage() {
  const { user, business } = await requireBusiness();

  const [brandKit, assets, campaigns] = await Promise.all([
    prisma.brandKit.findUnique({ where: { businessId: business.id } }).catch(() => null),
    prisma.mediaAsset.findMany({
      where: { businessId: business.id },
      include: {
        favorites: {
          where: { businessId: business.id, userId: user.id },
          select: { id: true },
        },
        recents: {
          where: { businessId: business.id, userId: user.id },
          select: { lastUsedAt: true, useCount: true },
        },
        usages: {
          where: { businessId: business.id },
          select: { surface: true, subjectId: true, documentPath: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 120,
    }),
    prisma.campaign.findMany({
      where: { businessId: business.id, status: { notIn: ["ARCHIVED", "CLOSED"] } },
      select: {
        id: true,
        title: true,
        contentBlocks: true,
        themeOverrides: true,
        primaryMedia: true,
      },
      take: 80,
    }),
  ]);

  const hasBrand = Boolean(business.logoUrl || brandKit);

  // Build a URL -> usage map so each asset can show truthful "used in".
  const usage = new Map<
    string,
    { label: string; href: string; detail?: string; developerPath?: string }[]
  >();
  function record(
    url: string,
    entry: { label: string; href: string; detail?: string; developerPath?: string }
  ) {
    if (!url) return;
    const list = usage.get(url) ?? [];
    if (!list.some((e) => e.label === entry.label && e.href === entry.href)) {
      list.push(entry);
      usage.set(url, list);
    }
  }

  if (business.logoUrl) {
    record(business.logoUrl, {
      label: "Brand logo",
      href: "/dashboard/brand/edit",
      detail: "Identity mark",
    });
  }
  // Card (Brand Kit tapCard) media
  if (brandKit?.tapCard) {
    for (const url of collectUrls(brandKit.tapCard)) {
      record(url, { label: "Your Card", href: "/dashboard/card/edit" });
    }
  }
  for (const c of campaigns) {
    const urls = new Set([
      ...collectUrls(c.contentBlocks),
      ...collectUrls(c.themeOverrides),
      ...collectUrls(c.primaryMedia),
    ]);
    for (const url of urls) {
      record(url, {
        label: c.title,
        href: `/dashboard/campaigns/${c.id}`,
        detail: "Campaign",
      });
    }
  }

  const libraryAssets: LibraryAsset[] = assets.map((asset) => {
    const durableUsage = asset.usages.map((item) => ({
      label: ownerMediaUsageLabel(item.surface, item.documentPath),
      href:
        item.surface === "CARD"
          ? "/dashboard/card/edit"
          : item.surface === "EMAIL"
            ? `/dashboard/campaigns/${item.subjectId}/email`
            : `/dashboard/campaigns/${item.subjectId}`,
      developerPath: item.documentPath,
    }));
    return {
      id: asset.id,
      url: asset.url,
      filename: asset.filename,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      source: asset.source,
      provider: asset.provider,
      sourcePageUrl: asset.sourcePageUrl,
      creatorName: asset.creatorName,
      creatorUrl: asset.creatorUrl,
      licenseCode: asset.licenseCode,
      licenseUrl: asset.licenseUrl,
      attributionText: asset.attributionText,
      rightsNote: asset.rightsNote,
      approvalStatus: asset.approvalStatus,
      isFavorite: asset.favorites.length > 0,
      recentAt: asset.recents[0]?.lastUsedAt.toISOString() ?? null,
      createdAt: asset.createdAt.toISOString(),
      usedIn: durableUsage.length ? durableUsage : usage.get(asset.url) ?? [],
      isBrandLogo: Boolean(business.logoUrl && asset.url === business.logoUrl),
    };
  });

  const mediaUploadReady = isMediaUploadReady();
  const usedCount = libraryAssets.filter((a) => a.usedIn.length > 0).length;

  return (
    <div className="zone-assets space-y-8 p-5 lg:p-8" data-testid="assets-workspace">
      <header className="space-y-3 border-b border-white/8 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:oklch(0.86_0.1_295)]">
          Assets
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Asset Studio</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-white/60">
          Organize Media and Logos in Collections without leaving Assets. Brand Kit remains the
          source of truth for identity — Assets support your Card, Email, Campaigns, and TapCanvas.
        </p>
      </header>

      {/* Brand Kit relationship — Assets flows FROM Brand, never replaces it. */}
      <section
        className="rounded-xl border border-white/10 bg-white/[0.02] px-5 py-4"
        data-testid="assets-brand-relationship"
        aria-label="Brand Kit relationship"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/90">
              Brand Kit is your source of truth
            </p>
            <p className="mt-1 text-xs text-white/50">
              {hasBrand
                ? "Your logo and colors come from Brand Kit — the Card and campaigns inherit them automatically. Media you add here supports those experiences."
                : "Set up Brand Kit first so your Card and campaigns look like you. Media added here supports, but never replaces, your brand identity."}
            </p>
          </div>
          <Link
            href="/dashboard/brand/edit"
            data-testid="assets-cta-brand"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-[var(--studio-go)] px-4 text-sm font-medium text-[var(--studio-go-fg)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <Palette className="h-4 w-4" aria-hidden />
            {hasBrand ? "Open Brand Kit" : "Set up Brand Kit"}
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-white/40">
          <span data-testid="assets-count-total">{libraryAssets.length} in library</span>
          <span data-testid="assets-count-used">{usedCount} in use on Card / campaigns</span>
          <Link
            href="/dashboard/card/edit"
            className="inline-flex items-center gap-1 text-white/50 hover:text-white/80"
          >
            Add media to your Card <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      <AssetStudioWorkspace
        initialAssets={libraryAssets}
        mediaUploadReady={mediaUploadReady}
      />

      <details className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-white/80">
          Keyword suggestions (optional)
        </summary>
        <p className="mt-2 text-xs text-white/45">
          Channel keyword ideas — secondary to Brand Kit. Opens Automation Team assistance when
          enabled.
        </p>
        <div className="mt-3">
          <KeywordsSuggestPanel surface="assets" defaultChannel="instagram" />
        </div>
      </details>

      <StudioHubSections
        destinationId="assets"
        title="Assets"
        subtitle="Full asset tool catalog"
        collapsible
        defaultOpen={false}
      />
    </div>
  );
}
