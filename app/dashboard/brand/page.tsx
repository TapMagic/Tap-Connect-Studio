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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
            Advanced · Legacy Brand administration
          </p>
          <h1 className="mt-1 text-2xl font-bold">Brand Kit (classic)</h1>
          <p className="text-muted-foreground">
            Compatibility form for colors, logo, contact card, socials, and compliance. Shared
            visual authoring remains the primary Brand experience.
          </p>
        </div>
        <Link
          href="/dashboard/brand/edit"
          data-testid="brand-open-focused-workspace"
          className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Open focused workspace (default)
        </Link>
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
