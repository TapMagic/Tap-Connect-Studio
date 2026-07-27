import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BrandKitForm } from "@/components/brand/brand-kit-form";
import { BrandKeywordsSection } from "@/components/fusion/keywords/brand-keywords-section";
import { isMediaUploadReady, isStockImagesReady } from "@/lib/config/integrations";
import { parseBrandContactProfile } from "@/lib/brand/contact-profile";

export const dynamic = "force-dynamic";

export default async function BrandPage() {
  const { business } = await requireBusiness();

  const brandKit = await prisma.brandKit.findUnique({
    where: { businessId: business.id },
  });

  return (
    <div className="space-y-6 p-6 lg:p-8 pb-24" data-testid="brand-kit-classic">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Brand Kit</h1>
          <p className="text-muted-foreground">
            Colors, logo, contact card, socials, and compliance defaults for every tap page.
          </p>
        </div>
        <Link
          href="/dashboard/brand/edit"
          data-testid="brand-open-focused-workspace"
          className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Open focused workspace
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
