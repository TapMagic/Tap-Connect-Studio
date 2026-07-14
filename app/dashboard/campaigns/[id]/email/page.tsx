import { notFound } from "next/navigation";
import { CampaignEmailBuilder } from "@/components/campaign/email-builder";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isEmailReady, isMediaUploadReady, isStockImagesReady } from "@/lib/config/integrations";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CampaignEmailPage({ params }: PageProps) {
  const { id } = await params;
  const { business } = await requireBusiness();

  const [campaign, brandKit] = await Promise.all([
    prisma.campaign.findFirst({ where: { id, businessId: business.id } }),
    prisma.brandKit.findUnique({ where: { businessId: business.id } }),
  ]);

  if (!campaign) notFound();

  return (
    <CampaignEmailBuilder
      campaign={{
        id: campaign.id,
        title: campaign.title,
        formSettings: campaign.formSettings,
      }}
      businessName={business.name}
      logoUrl={business.logoUrl}
      primaryColor={brandKit?.primaryColor ?? "#22c55e"}
      mediaUploadReady={isMediaUploadReady()}
      stockReady={isStockImagesReady()}
      emailReady={isEmailReady()}
    />
  );
}
