import { NextResponse } from "next/server";
import { z } from "zod";
import {
  BusinessCapabilityError,
  requireBusinessCapability,
  roleHasBusinessCapability,
} from "@/lib/fusion/authz/business-capability";
import {
  createKnowledgeFacts,
  decideKnowledgeFact,
  listBusinessKnowledge,
  ONBOARDING_FACT_KEYS,
  toGovernedKnowledgeFact,
} from "@/lib/fusion/knowledge/repository";

export const runtime = "nodejs";

const factValue = z.union([
  z.string().trim().min(1).max(2_000),
  z.record(z.string(), z.unknown()),
  z.array(z.unknown()).max(20),
]);

const createSchema = z.object({
  facts: z
    .array(
      z.object({
        factKey: z.enum(ONBOARDING_FACT_KEYS),
        value: factValue,
      })
    )
    .min(1)
    .max(16),
  sourceLabel: z.string().trim().min(1).max(120).default("Owner confirmed"),
  locationId: z.string().cuid().optional(),
});

const decisionSchema = z.object({
  factId: z.string().cuid(),
  decision: z.enum(["APPROVED", "REJECTED"]),
});

function errorResponse(error: unknown) {
  if (error instanceof BusinessCapabilityError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Invalid Business Knowledge request.", detail: error.flatten() },
      { status: 400 }
    );
  }
  console.error("Business Knowledge error:", error);
  return NextResponse.json(
    { error: "Business Knowledge could not be saved." },
    { status: 500 }
  );
}

export async function GET() {
  try {
    const { business } = await requireBusinessCapability("onboarding.read");
    const facts = await listBusinessKnowledge(business.id);
    return NextResponse.json({
      facts,
      governedFacts: facts.map(toGovernedKnowledgeFact),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { business, user, membership } =
      await requireBusinessCapability("knowledge.propose");
    const body = createSchema.parse(await request.json());
    const canApprove = roleHasBusinessCapability(
      membership.role,
      "knowledge.approve"
    );
    const result = await createKnowledgeFacts({
      businessId: business.id,
      locationId: body.locationId,
      source: {
        kind: "OWNER",
        displayLabel: body.sourceLabel,
        metadata: { entry: "onboarding" },
      },
      facts: body.facts.map((fact) => ({
        ...fact,
        confidence: 1,
        approvalStatus: canApprove ? ("APPROVED" as const) : ("SUGGESTED" as const),
        evidenceClass: "HOST_DECLARED" as const,
      })),
      actorId: canApprove ? user.id : undefined,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { business, user } =
      await requireBusinessCapability("knowledge.approve");
    const body = decisionSchema.parse(await request.json());
    const fact = await decideKnowledgeFact({
      businessId: business.id,
      factId: body.factId,
      decision: body.decision,
      actorId: user.id,
    });
    if (!fact) {
      return NextResponse.json({ error: "Fact not found." }, { status: 404 });
    }
    return NextResponse.json({ fact });
  } catch (error) {
    return errorResponse(error);
  }
}
