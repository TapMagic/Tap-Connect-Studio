import { TapCardBuilder } from "@/components/card/tap-card-builder";
import { requireBusiness, isPlatformAdmin } from "@/lib/auth";
import { parseBrandContactProfile } from "@/lib/brand/contact-profile";
import { parseTapConnectCard } from "@/lib/brand/tap-card";
import { isMediaUploadReady, isStockImagesReady } from "@/lib/config/integrations";
import { prisma } from "@/lib/db";
import "@/app/t/tap.css";

export const dynamic = "force-dynamic";

export default async function TapCardPage() {
  const { user, business } = await requireBusiness();
  const brandKit = await prisma.brandKit.findUnique({ where: { businessId: business.id } });
  const profile = parseBrandContactProfile(brandKit?.socialLinks);
  const config = parseTapConnectCard(brandKit?.tapCard, {
    businessName: business.name,
    profile: {
      ...profile,
      phone: profile.phone || business.phone || undefined,
      email: profile.email || business.email || undefined,
      website: profile.website || business.website || undefined,
    },
    logoUrl: business.logoUrl,
    accentColor: brandKit?.accentColor || "#d4af37",
    reviewUrl: business.googleReviewUrl,
  });

  const landingDemo = await prisma.campaign.findFirst({
    where: { businessId: business.id, isLandingDemo: true },
    select: { id: true },
  });

  const devices = await prisma.deviceSlot.findMany({
    where: { businessId: business.id },
    select: { id: true, nickname: true, deviceCode: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="h-full min-h-0">
      <TapCardBuilder
        initialConfig={config}
        profile={{
          ...profile,
          phone: profile.phone || business.phone || undefined,
          email: profile.email || business.email || undefined,
          website: profile.website || business.website || undefined,
        }}
        businessName={business.name}
        logoUrl={business.logoUrl}
        reviewUrl={business.googleReviewUrl}
        mediaUploadReady={isMediaUploadReady()}
        stockReady={isStockImagesReady()}
        isAdmin={isPlatformAdmin(user)}
        isLandingDemo={Boolean(landingDemo)}
        devices={devices}
      />
    </div>
  );
}
