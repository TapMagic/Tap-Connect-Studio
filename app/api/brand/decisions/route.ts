import { NextResponse } from "next/server";
import { z } from "zod";
import {
  BusinessCapabilityError,
  requireBusinessCapability,
} from "@/lib/fusion/authz/business-capability";
import {
  BRAND_PROPERTY_KEYS,
  BrandDecisionError,
  decideBrandProperty,
  listBrandDecisions,
  proposeBrandDecision,
} from "@/lib/fusion/brand/property-decisions";

export const runtime = "nodejs";

const proposeSchema = z.object({
  propertyKey: z.enum(BRAND_PROPERTY_KEYS),
  candidate: z.unknown(),
  scope: z.enum(["BRAND", "CARD_ONLY"]).default("BRAND"),
  mediaAssetId: z.string().cuid().nullable().optional(),
  knowledgeSourceId: z.string().cuid().nullable().optional(),
  provider: z.string().trim().max(80).nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  rationale: z.string().trim().max(500).nullable().optional(),
  rightsStatus: z
    .enum(["CONFIRMED", "NEEDS_CONFIRMATION", "NOT_APPLICABLE"])
    .default("NOT_APPLICABLE"),
});

const decisionSchema = z.object({
  decisionId: z.string().cuid(),
  action: z.enum(["KEEP", "APPROVE", "REJECT", "LOCK", "UNLOCK"]),
});

function errorResponse(error: unknown) {
  if (error instanceof BusinessCapabilityError || error instanceof BrandDecisionError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Invalid Brand decision request.", detail: error.flatten() },
      { status: 400 }
    );
  }
  console.error("Brand decision error:", error);
  return NextResponse.json({ error: "Brand decision request failed." }, { status: 500 });
}

export async function GET() {
  try {
    const { business } = await requireBusinessCapability("onboarding.read");
    return NextResponse.json({
      decisions: await listBrandDecisions(business.id),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { business, user } = await requireBusinessCapability("brand.propose");
    const body = proposeSchema.parse(await request.json());
    const decision = await proposeBrandDecision({
      businessId: business.id,
      actorId: user.id,
      ...body,
    });
    return NextResponse.json({ decision }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = decisionSchema.parse(await request.json());
    const capability =
      body.action === "LOCK" || body.action === "UNLOCK"
        ? "brand.lock"
        : body.action === "APPROVE" || body.action === "REJECT"
          ? "brand.approve"
          : "brand.propose";
    const { business, user } = await requireBusinessCapability(capability);
    const decision = await decideBrandProperty({
      businessId: business.id,
      decisionId: body.decisionId,
      action: body.action,
      actorId: user.id,
    });
    return NextResponse.json({ decision });
  } catch (error) {
    return errorResponse(error);
  }
}
