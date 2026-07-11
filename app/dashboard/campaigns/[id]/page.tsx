import { notFound } from "next/navigation";
import { CampaignEditor } from "@/components/workbench/campaign-editor";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseContentBlocks } from "@/lib/services/devices";
import type { ContentBlock } from "@/lib/types/campaign";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CampaignEditPage({ params }: PageProps) {
  const { id } = await params;
  const { business } = await requireBusiness();

  const [campaign, brandKit, devices] = await Promise.all([
    prisma.campaign.findFirst({
      where: { id, businessId: business.id },
    }),
    prisma.brandKit.findUnique({ where: { businessId: business.id } }),
    prisma.deviceSlot.findMany({
      where: { businessId: business.id },
      select: { id: true, nickname: true, deviceCode: true },
    }),
  ]);

  if (!campaign) notFound();

  const defaultBrand = {
    primaryColor: "#22c55e",
    secondaryColor: "#0ea5e9",
    backgroundColor: "#0b0f19",
    textColor: "#f8fafc",
  };

  return (
    <CampaignEditor
      campaign={{
        id: campaign.id,
        title: campaign.title,
        status: campaign.status,
        contentBlocks: parseContentBlocks(campaign.contentBlocks) as ContentBlock[],
        themeOverrides: (campaign.themeOverrides as Record<string, string>) ?? {},
      }}
      brandKit={brandKit ?? defaultBrand}
      businessId={business.id}
      devices={devices}
    />
  );
}
