import { BrandKitWorkspace } from "@/components/fusion/brand/brand-kit-workspace";
import { requireBusiness } from "@/lib/auth";
import { parseTapConnectCard } from "@/lib/brand/tap-card";
import { isMediaUploadReady, isStockImagesReady } from "@/lib/config/integrations";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Focused Brand Kit authoring escape — Shared Visual Authoring Core V0 host.
 * Done / Esc → /dashboard/brand. Classic form remains as compatibility fallback.
 */
export default async function BrandKitEditPage() {
  const { business } = await requireBusiness();
  const brandKit = await prisma.brandKit.findUnique({
    where: { businessId: business.id },
  });
  const assets = await prisma.mediaAsset.findMany({
    where: { businessId: business.id, source: "upload" },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: { url: true },
  });

  const cardConfig = parseTapConnectCard(brandKit?.tapCard, {
    businessName: business.name,
    logoUrl: business.logoUrl,
    accentColor: brandKit?.accentColor || "#d4af37",
  });

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden"
      data-testid="brand-edit-workspace-host"
      data-escape-authoring="true"
    >
      <BrandKitWorkspace
        businessName={business.name}
        initialBrand={{
          primaryColor: brandKit?.primaryColor ?? "#22c55e",
          secondaryColor: brandKit?.secondaryColor ?? "#0ea5e9",
          accentColor: brandKit?.accentColor ?? "#f59e0b",
          backgroundColor: brandKit?.backgroundColor ?? "#0b0f19",
          textColor: brandKit?.textColor ?? "#f8fafc",
          fontStyle: brandKit?.fontStyle ?? "MODERN",
          buttonStyle: brandKit?.buttonStyle ?? "ROUNDED",
          logoUrl: business.logoUrl,
          website: business.website,
        }}
        cardConfig={cardConfig}
        mediaUploadReady={isMediaUploadReady()}
        stockReady={isStockImagesReady()}
        logoOptions={[business.logoUrl, ...assets.map((a) => a.url)].filter(
          (u): u is string => Boolean(u)
        )}
      />
    </div>
  );
}
