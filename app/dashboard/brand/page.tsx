import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BrandKitForm } from "@/components/brand/brand-kit-form";
import { BrandKeywordsSection } from "@/components/fusion/keywords/brand-keywords-section";
import { CardRelationshipAnchor } from "@/components/fusion/card/card-relationship-anchor";
import { isMediaUploadReady, isStockImagesReady } from "@/lib/config/integrations";
import { parseBrandContactProfile } from "@/lib/brand/contact-profile";
import { loadCardRelationshipContext } from "@/lib/fusion/studio/load-card-relationship";

export const dynamic = "force-dynamic";

/**
 * Legacy / classic Brand administration.
 * Ordinary owner path is the focused workspace at /dashboard/brand/edit.
 */
export default async function BrandClassicPage() {
  const { business } = await requireBusiness();

  const [brandKit, card] = await Promise.all([
    prisma.brandKit.findUnique({ where: { businessId: business.id } }),
    loadCardRelationshipContext(business.id, business.name, { logoUrl: business.logoUrl }),
  ]);

  return (
    <div className="zone-brand space-y-6 p-6 lg:p-8 pb-24" data-testid="brand-kit-classic">
      <CardRelationshipAnchor card={card} role="brand_identity" />

      {/* Demotion banner — this is the legacy/advanced path, not the default. */}
      <div
        className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
        data-testid="brand-legacy-demotion"
      >
        <div className="flex items-start gap-2">
          <span
            className="mt-0.5 inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
            style={{
              color: "var(--studio-status-neutral)",
              borderColor: "color-mix(in oklch, var(--studio-status-neutral) 40%, transparent)",
            }}
          >
            Advanced · Legacy
          </span>
          <p className="text-white/55">
            You&rsquo;re on the compatibility form. Brand Kit changes here still flow into your Card
            and campaigns — but the focused workspace is the recommended way to edit brand.
          </p>
        </div>
        <Link
          href="/dashboard/brand/edit"
          data-testid="brand-open-focused-workspace"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-[var(--studio-go)] px-4 text-sm font-medium text-[var(--studio-go-fg)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          Open focused workspace
        </Link>
      </div>

      <div className="opacity-80">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">
          Legacy Brand administration
        </p>
        <h1 className="mt-1 text-xl font-semibold text-white/80">Brand Kit (classic form)</h1>
        <p className="mt-1 text-sm text-white/45">
          Compatibility form for colors, logo, contact card, socials, and compliance. Everything you
          save here becomes the single source of truth the Card inherits.
        </p>
      </div>
      <BrandKeywordsSection initialPack={brandKit?.keywordBrandPack} />
      <BrandKitForm
        brandKit={{
          primaryColor: brandKit?.primaryColor ?? "#22c55e",
          secondaryColor: brandKit?.secondaryColor ?? "#0ea5e9",
          accentColor: brandKit?.accentColor ?? "#f59e0b",
          backgroundColor: brandKit?.backgroundColor ?? "#0b0f19",
          textColor: brandKit?.textColor ?? "#f8fafc",
          fontStyle: brandKit?.fontStyle ?? "MODERN",
          buttonStyle: brandKit?.buttonStyle ?? "ROUNDED",
          defaultLanguage: brandKit?.defaultLanguage ?? "en",
          tone: brandKit?.tone ?? "professional",
          defaultDisclaimer: brandKit?.defaultDisclaimer ?? null,
          ageGateEnabled: brandKit?.ageGateEnabled ?? false,
          ageGateMinAge: brandKit?.ageGateMinAge ?? 21,
          website: business.website,
          phone: business.phone,
          googleReviewUrl: business.googleReviewUrl,
          logoUrl: business.logoUrl,
          email: business.email,
          contactProfile: parseBrandContactProfile(brandKit?.socialLinks),
          otherLinks: Array.isArray(brandKit?.otherLinks)
            ? (brandKit.otherLinks as {
                id: string;
                title: string;
                description?: string;
                href: string;
                logoUrl?: string;
                iconUrl?: string;
                icon?: string;
                iconColor?: string;
                platform?: string;
              }[])
            : [],
          endExperience: brandKit?.endExperience ?? {},
        }}
        mediaUploadReady={isMediaUploadReady()}
        stockReady={isStockImagesReady()}
      />
    </div>
  );
}
