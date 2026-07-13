import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BrandKitForm } from "@/components/brand/brand-kit-form";
import { isMediaUploadReady, isStockImagesReady } from "@/lib/config/integrations";
import { parseBrandContactProfile } from "@/lib/brand/contact-profile";

export const dynamic = "force-dynamic";

export default async function BrandPage() {
  const { business } = await requireBusiness();

  const brandKit = await prisma.brandKit.findUnique({
    where: { businessId: business.id },
  });

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold">Brand Kit</h1>
        <p className="text-muted-foreground">
          Colors, logo, contact card, socials, and compliance defaults for every tap page.
        </p>
      </div>
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
        }}
        mediaUploadReady={isMediaUploadReady()}
        stockReady={isStockImagesReady()}
      />
    </div>
  );
}
