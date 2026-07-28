import { notFound } from "next/navigation";
import { EmailAuthoringWorkspace } from "@/components/fusion/email/email-authoring-workspace";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isEmailReady, isMediaUploadReady, isStockImagesReady } from "@/lib/config/integrations";
import { loadEmailAudienceContactSummaries } from "@/lib/fusion/email/audience-load";
import { loadCardRelationshipContext } from "@/lib/fusion/studio/load-card-relationship";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CampaignEmailPage({ params }: PageProps) {
  const { id } = await params;
  const { business } = await requireBusiness();

  const [campaign, brandKit, audienceLoad, cardRelationship] = await Promise.all([
    prisma.campaign.findFirst({ where: { id, businessId: business.id } }),
    prisma.brandKit.findUnique({ where: { businessId: business.id } }),
    loadEmailAudienceContactSummaries(business.id),
    loadCardRelationshipContext(business.id, business.name, { logoUrl: business.logoUrl }),
  ]);

  if (!campaign) notFound();

  return (
    <EmailAuthoringWorkspace
      campaign={{
        id: campaign.id,
        title: campaign.title,
        status: campaign.status,
        formSettings: campaign.formSettings,
        contentBlocks: campaign.contentBlocks,
      }}
      businessName={business.name}
      logoUrl={business.logoUrl}
      brandKit={{
        primaryColor: brandKit?.primaryColor,
        secondaryColor: brandKit?.secondaryColor,
        accentColor: brandKit?.accentColor,
        backgroundColor: brandKit?.backgroundColor,
        textColor: brandKit?.textColor,
        fontStyle: brandKit?.fontStyle,
        buttonStyle: brandKit?.buttonStyle,
        logoUrl: business.logoUrl,
      }}
      primaryColor={brandKit?.primaryColor ?? "#22c55e"}
      mediaUploadReady={isMediaUploadReady()}
      stockReady={isStockImagesReady()}
      emailReady={isEmailReady()}
      audienceContacts={audienceLoad.contacts}
      audienceConsentLoaded={audienceLoad.consentLoaded}
      audienceSuppressionLoaded={audienceLoad.suppressionLoaded}
      cardRelationship={cardRelationship}
    />
  );
}
