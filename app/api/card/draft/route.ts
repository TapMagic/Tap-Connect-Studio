import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  BusinessCapabilityError,
  requireBusinessCapability,
} from "@/lib/fusion/authz/business-capability";
import {
  beginCardDraftEditing,
  CardDraftError,
  getCardDraft,
  isTapConnectCardDraft,
  saveCardDraft,
} from "@/lib/fusion/card/draft";
import {
  buildFirstCardDraft,
  type ApprovedCardFact,
  type FirstCardBrand,
} from "@/lib/fusion/card/first-card-draft";

export const runtime = "nodejs";

const actionSchema = z.object({
  action: z.enum(["generate", "begin-edit", "previewed", "complete"]),
});

const saveSchema = z.object({
  draft: z.unknown(),
  expectedRevision: z.number().int().min(0),
});

async function generationInputs(businessId: string) {
  const [business, brandKit, facts, decisions] = await Promise.all([
    prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: {
        name: true,
        primaryCustomerOutcome: true,
        cardFirstOnboardingPreviewedAt: true,
      },
    }),
    prisma.brandKit.findUniqueOrThrow({
      where: { businessId },
      select: {
        primaryColor: true,
        backgroundColor: true,
        textColor: true,
        fontStyle: true,
      },
    }),
    prisma.knowledgeFact.findMany({
      where: {
        businessId,
        approvalStatus: "APPROVED",
        contradictionStatus: "NONE",
      },
      orderBy: [{ factKey: "asc" }, { version: "desc" }],
    }),
    prisma.brandPropertyDecision.findMany({
      where: { businessId, status: "APPROVED" },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const latestFacts = new Map<string, ApprovedCardFact>();
  for (const fact of facts) {
    if (!latestFacts.has(fact.factKey)) {
      latestFacts.set(fact.factKey, {
        id: fact.id,
        factKey: fact.factKey,
        value: fact.value,
      });
    }
  }

  const latestDecisions = new Map<string, (typeof decisions)[number]>();
  for (const decision of decisions) {
    if (!latestDecisions.has(decision.propertyKey)) {
      latestDecisions.set(decision.propertyKey, decision);
    }
  }
  const decisionValue = (key: string) => {
    const candidate = latestDecisions.get(key)?.candidate;
    if (typeof candidate === "string") return candidate;
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      const value = (candidate as Record<string, unknown>).value;
      return typeof value === "string" ? value : undefined;
    }
    return undefined;
  };
  const brand: FirstCardBrand = {
    logoUrl: decisionValue("logo"),
    primaryColor: decisionValue("primaryColor"),
    backgroundColor: decisionValue("backgroundColor"),
    textColor: decisionValue("textColor"),
    fontStyle: brandKit.fontStyle,
    decisionIds: [...latestDecisions.values()].map((decision) => decision.id),
  };

  return {
    business,
    brand,
    facts: [...latestFacts.values()],
  };
}

async function generateForBusiness(businessId: string) {
  const input = await generationInputs(businessId);
  if (!input.business.primaryCustomerOutcome) {
    throw new CardDraftError(
      "Choose a customer outcome before generating the Card.",
      "invalid_draft",
      400
    );
  }
  return {
    ...buildFirstCardDraft({
      businessName: input.business.name,
      outcome: input.business.primaryCustomerOutcome,
      facts: input.facts,
      brand: input.brand,
    }),
    previewedAt: input.business.cardFirstOnboardingPreviewedAt,
  };
}

function errorResponse(error: unknown) {
  if (error instanceof BusinessCapabilityError || error instanceof CardDraftError) {
    return NextResponse.json(
      { error: error.message, code: "code" in error ? error.code : "forbidden" },
      { status: error.status }
    );
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Invalid Card draft request.", detail: error.flatten() },
      { status: 400 }
    );
  }
  console.error("Card draft error:", error);
  return NextResponse.json({ error: "Card draft request failed." }, { status: 500 });
}

export async function GET() {
  try {
    const { business } = await requireBusinessCapability("onboarding.read");
    const [kit, generated] = await Promise.all([
      getCardDraft(business.id),
      generateForBusiness(business.id),
    ]);
    return NextResponse.json({
      draft: kit.tapCardDraft,
      revision: kit.tapCardDraftRevision,
      updatedAt: kit.tapCardDraftUpdatedAt,
      publishedAt: kit.tapCardPublishedAt,
      publishedCardExists: isTapConnectCardDraft(kit.tapCard),
      generated,
      status: kit.tapCardDraft
        ? "Saved draft"
        : "Unsaved changes",
      publicationNotice: "Draft changes not published",
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = actionSchema.parse(await request.json());
    const { business } = await requireBusinessCapability(
      body.action === "generate"
        ? "onboarding.read"
        : "onboarding.edit"
    );
    const generated = await generateForBusiness(business.id);

    if (body.action === "generate") {
      return NextResponse.json(generated);
    }
    if (body.action === "begin-edit") {
      const kit = await beginCardDraftEditing(business.id, generated.draft);
      return NextResponse.json({
        draft: kit.tapCardDraft,
        revision: kit.tapCardDraftRevision,
        publicationNotice: "Draft changes not published",
      });
    }
    if (body.action === "previewed") {
      await prisma.business.update({
        where: { id: business.id },
        data: { cardFirstOnboardingPreviewedAt: new Date() },
      });
      return NextResponse.json({ previewed: true });
    }

    const kit = await getCardDraft(business.id);
    const current = await prisma.business.findUniqueOrThrow({
      where: { id: business.id },
      select: { cardFirstOnboardingPreviewedAt: true },
    });
    if (!isTapConnectCardDraft(kit.tapCardDraft) || !current.cardFirstOnboardingPreviewedAt) {
      return NextResponse.json(
        {
          error: "Save a valid draft and preview it as a customer before completing onboarding.",
        },
        { status: 409 }
      );
    }
    await prisma.business.update({
      where: { id: business.id },
      data: { cardFirstOnboardingCompletedAt: new Date() },
    });
    return NextResponse.json({ completed: true, redirectTo: "/dashboard/card" });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { business } =
      await requireBusinessCapability("card.draft.edit");
    const body = saveSchema.parse(await request.json());
    const kit = await saveCardDraft({
      businessId: business.id,
      draft: body.draft,
      expectedRevision: body.expectedRevision,
    });
    return NextResponse.json({
      draft: kit.tapCardDraft,
      revision: kit.tapCardDraftRevision,
      updatedAt: kit.tapCardDraftUpdatedAt,
      status: "Saved draft",
      publicationNotice: "Draft changes not published",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
