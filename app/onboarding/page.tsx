import { CardFirstOnboardingWorkspace } from "@/components/onboarding/card-first-onboarding-workspace";
import { getSessionUser, isPlatformAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { isTapConnectCardDraft } from "@/lib/fusion/card/draft";
import { isMediaUploadReady, isStockImagesReady } from "@/lib/config/integrations";
import "@/app/t/tap.css";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  if (isPlatformAdmin(user)) {
    redirect("/admin");
  }

  const membership = user.memberships[0] ?? null;
  if (membership?.business.cardFirstOnboardingCompletedAt) {
    redirect("/dashboard");
  }

  if (!membership) {
    return (
      <CardFirstOnboardingWorkspace
        initialBusiness={null}
        initialFacts={[]}
        initialDecisions={[]}
        initialDraft={null}
        initialRevision={0}
        initialStage={0}
        role="OWNER"
        mediaUploadReady={isMediaUploadReady()}
        stockReady={isStockImagesReady()}
      />
    );
  }

  const business = membership.business;
  const [brandKit, facts, decisions] = await Promise.all([
    prisma.brandKit.findUnique({ where: { businessId: business.id } }),
    prisma.knowledgeFact.findMany({
      where: { businessId: business.id },
      include: {
        source: {
          select: {
            kind: true,
            displayLabel: true,
            normalizedUri: true,
          },
        },
      },
      orderBy: [{ factKey: "asc" }, { version: "desc" }],
    }),
    prisma.brandPropertyDecision.findMany({
      where: { businessId: business.id },
      include: {
        mediaAsset: {
          select: {
            id: true,
            url: true,
            approvalStatus: true,
            provider: true,
            licenseCode: true,
            rightsNote: true,
            attributionText: true,
          },
        },
      },
      orderBy: [{ propertyKey: "asc" }, { updatedAt: "desc" }],
    }),
  ]);
  const query = await searchParams;
  const requestedStage =
    query.stage === "business"
      ? 0
      : query.stage === "knowledge"
        ? 1
        : query.stage === "brand"
          ? 2
          : query.stage === "card"
            ? 3
            : null;
  const initialStage =
    requestedStage ??
    (business.cardFirstOnboardingPreviewedAt
      ? 3
      : decisions.length > 0
        ? 2
        : 1);

  return (
    <CardFirstOnboardingWorkspace
      initialBusiness={{
        name: business.name,
        website: business.website,
        phone: business.phone,
        email: business.email,
        businessCategory: business.businessCategory,
        primaryCustomerOutcome: business.primaryCustomerOutcome,
        previewedAt:
          business.cardFirstOnboardingPreviewedAt?.toISOString() ?? null,
      }}
      initialFacts={facts.map((fact) => ({
        id: fact.id,
        factKey: fact.factKey,
        value: fact.value,
        confidence: fact.confidence,
        approvalStatus: fact.approvalStatus,
        contradictionStatus: fact.contradictionStatus,
        lastVerifiedAt: fact.lastVerifiedAt.toISOString(),
        source: fact.source,
      }))}
      initialDecisions={decisions.map((decision) => ({
        id: decision.id,
        propertyKey: decision.propertyKey,
        candidate: decision.candidate,
        status: decision.status,
        scope: decision.scope,
        locked: decision.locked,
        provider: decision.provider,
        confidence: decision.confidence,
        rationale: decision.rationale,
        rightsStatus: decision.rightsStatus,
        mediaAsset: decision.mediaAsset,
      }))}
      initialDraft={
        isTapConnectCardDraft(brandKit?.tapCardDraft)
          ? brandKit.tapCardDraft
          : null
      }
      initialRevision={brandKit?.tapCardDraftRevision ?? 0}
      initialStage={initialStage}
      role={membership.role}
      mediaUploadReady={isMediaUploadReady()}
      stockReady={isStockImagesReady()}
    />
  );
}
