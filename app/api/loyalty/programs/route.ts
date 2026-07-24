import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import {
  createProgram,
  defineRules,
  listPrograms,
  setProgramActive,
} from "@/lib/fusion/taploop";
import { checkFeatureGate, featureGateJsonBody } from "@/lib/fusion/features/gate";
import { loadFeatureContext } from "@/lib/fusion/features/server";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  earnRules: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        points: z.number().int().positive(),
        event: z.string(),
      })
    )
    .optional(),
  tiers: z
    .array(
      z.object({
        name: z.string(),
        rank: z.number().int().min(0),
        thresholdPoints: z.number().int().min(0),
        perks: z.array(z.string()).optional(),
      })
    )
    .optional(),
});

const rulesSchema = z.object({
  programId: z.string().min(1),
  earnRules: createSchema.shape.earnRules,
  tiers: createSchema.shape.tiers,
  rewards: z
    .array(
      z.object({
        name: z.string(),
        pointsCost: z.number().int().positive(),
        active: z.boolean().optional(),
      })
    )
    .optional(),
});

async function requireTapLoop() {
  const featureCtx = await loadFeatureContext();
  const gate = checkFeatureGate("loyalty.taploop", featureCtx);
  if (!gate.ok) {
    return NextResponse.json(featureGateJsonBody(gate), { status: 503 });
  }
  return null;
}

export async function GET() {
  try {
    const { business } = await requireBusiness();
    const blocked = await requireTapLoop();
    if (blocked) return blocked;

    const programs = await listPrograms(business.id);
    return NextResponse.json({ ok: true, programs });
  } catch (error) {
    console.error("Loyalty programs list error:", error);
    return NextResponse.json({ error: "Unauthorized or DB unavailable" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { business } = await requireBusiness();
    const blocked = await requireTapLoop();
    if (blocked) return blocked;

    const body = await request.json();
    if (body?.action === "defineRules") {
      const parsed = rulesSchema.parse(body);
      const program = await defineRules({
        businessId: business.id,
        programId: parsed.programId,
        earnRules: parsed.earnRules,
        tiers: parsed.tiers,
        rewards: parsed.rewards,
      });
      return NextResponse.json({ ok: true, program });
    }

    if (body?.action === "setActive") {
      const parsed = z
        .object({
          programId: z.string().min(1),
          active: z.boolean(),
        })
        .parse(body);
      const program = await setProgramActive({
        businessId: business.id,
        programId: parsed.programId,
        active: parsed.active,
      });
      return NextResponse.json({ ok: true, program });
    }

    const parsed = createSchema.parse(body);
    const program = await createProgram({
      businessId: business.id,
      name: parsed.name,
      earnRules: parsed.earnRules,
      tiers: parsed.tiers,
    });
    return NextResponse.json({ ok: true, program });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid program payload" }, { status: 400 });
    }
    console.error("Loyalty program error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save program" },
      { status: 500 }
    );
  }
}
