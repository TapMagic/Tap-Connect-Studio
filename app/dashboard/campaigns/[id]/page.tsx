import { notFound } from "next/navigation";
import { CampaignEditor } from "@/components/workbench/campaign-editor";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseContentBlocks } from "@/lib/services/devices";
import { parseBrandContactProfile } from "@/lib/brand/contact-profile";
import {
  isMediaUploadReady,
  isStockImagesReady,
  isAiReady,
  isEmailReady,
} from "@/lib/config/integrations";
import type { ContentBlock } from "@/lib/types/campaign";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CampaignEditPage({ params }: PageProps) {
  const { id } = await params;
  const { business } = await requireBusiness();

  const [campaign, brandKit, devices, siblingCampaigns] = await Promise.all([
    prisma.campaign.findFirst({
      where: { id, businessId: business.id },
    }),
    prisma.brandKit.findUnique({ where: { businessId: business.id } }),
    prisma.deviceSlot.findMany({
      where: { businessId: business.id },
      select: { id: true, nickname: true, deviceCode: true },
    }),
    prisma.campaign.findMany({
      where: { businessId: business.id, status: { notIn: ["ARCHIVED", "CLOSED"] } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, status: true },
    }),
  ]);

  if (!campaign) notFound();

  return (
    <CampaignEditor
      campaign={{
        id: campaign.id,
        title: campaign.title,
        status: campaign.status,
        contentBlocks: parseContentBlocks(campaign.contentBlocks) as ContentBlock[],
        themeOverrides:
          campaign.themeOverrides &&
          typeof campaign.themeOverrides === "object" &&
          !Array.isArray(campaign.themeOverrides)
            ? (campaign.themeOverrides as Record<string, string>)
            : {},
        scheduledStart: campaign.scheduledStart?.toISOString() ?? null,
        scheduledEnd: campaign.scheduledEnd?.toISOString() ?? null,
        endExperience: campaign.endExperience ?? {},
      }}
      brandKit={{
        primaryColor: brandKit?.primaryColor ?? "#22c55e",
        secondaryColor: brandKit?.secondaryColor ?? "#0ea5e9",
        backgroundColor: brandKit?.backgroundColor ?? "#0b0f19",
        textColor: brandKit?.textColor ?? "#f8fafc",
        logoUrl: business.logoUrl,
        phone:
          parseBrandContactProfile(brandKit?.socialLinks).phone ?? business.phone ?? null,
        email:
          parseBrandContactProfile(brandKit?.socialLinks).email ?? business.email ?? null,
        address: parseBrandContactProfile(brandKit?.socialLinks).address ?? null,
        website:
          parseBrandContactProfile(brandKit?.socialLinks).website ?? business.website ?? null,
      }}
      businessId={business.id}
      devices={devices}
      siblingCampaigns={siblingCampaigns}
      integrations={{
        mediaUpload: isMediaUploadReady(),
        stockImages: isStockImagesReady(),
        ai: isAiReady(),
        email: isEmailReady(),
      }}
      subscriptionTier={business.subscriptionTier}
    />
  );
}
