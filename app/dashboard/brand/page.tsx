import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BrandKitForm } from "@/components/brand/brand-kit-form";

export default async function BrandPage() {
  const { business } = await requireBusiness();

  const brandKit = await prisma.brandKit.findUnique({
    where: { businessId: business.id },
  });

  const defaults = {
    primaryColor: "#22c55e",
    secondaryColor: "#0ea5e9",
    accentColor: "#f59e0b",
    backgroundColor: "#0b0f19",
    textColor: "#f8fafc",
    fontStyle: "MODERN",
    buttonStyle: "ROUNDED",
    defaultLanguage: "en",
    tone: "professional",
    defaultDisclaimer: null as string | null,
    ageGateEnabled: false,
    ageGateMinAge: 21,
    website: business.website,
    googleReviewUrl: business.googleReviewUrl,
  };

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold">Brand Kit</h1>
        <p className="text-muted-foreground">
          Set colors, fonts, tone, and compliance defaults for all campaigns.
        </p>
      </div>
      <BrandKitForm brandKit={{ ...defaults, ...brandKit, website: business.website, googleReviewUrl: business.googleReviewUrl }} />
    </div>
  );
}
