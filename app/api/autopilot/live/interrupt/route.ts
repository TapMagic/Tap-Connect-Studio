import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import {
  persistInterruptLiveActivation,
} from "@/lib/fusion/autopilot/live-persist";
import type { AutopilotPlan } from "@/lib/fusion/autopilot/plan";
import type { PreparedExecution } from "@/lib/fusion/autopilot/prepared-execution";

export const dynamic = "force-dynamic";

const schema = z.object({
  activationId: z.string().min(1),
  mode: z.enum(["stop", "pause", "undo", "manual", "resume"]),
  plan: z.unknown().optional(),
  execution: z.unknown().optional(),
  editorHref: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const { business, user } = await requireBusiness();
    const body = schema.parse(await request.json());

    const result = await persistInterruptLiveActivation({
      businessId: business.id,
      businessName: business.name,
      logoUrl: business.logoUrl,
      actorId: user?.id ?? null,
      activationId: body.activationId,
      plan: body.plan as unknown as AutopilotPlan | undefined,
      execution: body.execution as unknown as PreparedExecution | undefined,
      mode: body.mode,
      editorHref: body.editorHref,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: result.message || "Could not complete that action.",
          activation: result.activation,
          code: result.activation.failure?.code || "interrupt_failed",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      activation: result.activation,
      execution: result.execution,
      plan: result.plan,
      domain: {
        campaignStatus: result.domain.campaignStatus,
        insightsObservationActive: result.domain.insightsObservationActive,
      },
      honesty: {
        distributionSent: false,
        customerContactOccurred: false,
        claimsPreserved: true,
        consentPreserved: true,
        relationshipsPreserved: true,
        auditPreserved: true,
      },
      verification: result.record?.verification ?? null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Invalid interrupt request", code: "validation" },
        { status: 400 }
      );
    }
    console.error("Autopilot live interrupt error:", error);
    return NextResponse.json(
      { ok: false, error: "Could not complete that action.", code: "server" },
      { status: 500 }
    );
  }
}
