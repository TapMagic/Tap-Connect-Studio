import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listFeatureOverrides, toResolveOverrides } from "@/lib/fusion/features/overrides";
import { isFeatureEnabled } from "@/lib/fusion/features/resolve";
import {
  SAMPLE_VISITOR,
  type JourneyDefinition,
  type VisitorContext,
} from "@/lib/fusion/journey";
import { recordJourneyDryRun } from "@/lib/fusion/journey/runs";

const schema = z.object({
  definition: z.record(z.string(), z.unknown()).optional(),
  draftId: z.string().optional(),
  requirePublished: z.boolean().optional(),
  visitor: z
    .object({
      visitorId: z.string().optional(),
      attributes: z.record(z.string(), z.unknown()).optional(),
      consent: z
        .object({
          email: z.boolean().optional(),
          sms: z.boolean().optional(),
          marketing: z.boolean().optional(),
        })
        .optional(),
      loyalty: z
        .object({
          enrolled: z.boolean().optional(),
          points: z.number().optional(),
          tier: z.string().optional(),
        })
        .optional(),
      preferBranch: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    const { business, user } = await requireBusiness();
    const overrides = toResolveOverrides(await listFeatureOverrides());
    if (!isFeatureEnabled("journey.tapflow", { overrides })) {
      return NextResponse.json(
        {
          placeholder: true,
          feature: "journey.tapflow",
          message: "TapFlow simulate is disabled. Enable journey.tapflow in Platform Admin.",
        },
        { status: 503 }
      );
    }

    const body = schema.parse(await request.json());
    let definition: JourneyDefinition | null = null;
    let draftMeta: { id: string; status: string; name: string } | null = null;

    if (body.draftId) {
      const draft = await prisma.journeyDraft.findFirst({
        where: { id: body.draftId, businessId: business.id },
      });
      if (!draft) {
        return NextResponse.json({ error: "Draft not found" }, { status: 404 });
      }
      if (
        body.requirePublished &&
        draft.status !== "PUBLISHED" &&
        draft.status !== "ACTIVE"
      ) {
        return NextResponse.json(
          { error: "Dry-run against published/active journeys only when requirePublished is set" },
          { status: 400 }
        );
      }
      definition = draft.definition as JourneyDefinition;
      draftMeta = { id: draft.id, status: draft.status, name: draft.name };
    } else if (body.definition) {
      definition = body.definition as unknown as JourneyDefinition;
    }

    if (!definition || !Array.isArray(definition.nodes)) {
      return NextResponse.json(
        { error: "Provide definition or draftId with a valid journey graph" },
        { status: 400 }
      );
    }

    const visitor: VisitorContext = {
      ...SAMPLE_VISITOR,
      ...body.visitor,
      consent: { ...SAMPLE_VISITOR.consent, ...body.visitor?.consent },
      loyalty: { ...SAMPLE_VISITOR.loyalty, ...body.visitor?.loyalty },
      attributes: { ...SAMPLE_VISITOR.attributes, ...body.visitor?.attributes },
    };

    const { run, result } = await recordJourneyDryRun({
      businessId: business.id,
      journeyId: draftMeta?.id,
      definition,
      visitor,
      actorId: user.id,
    });

    return NextResponse.json({
      ok: result.ok,
      completed: result.completed,
      path: result.path,
      events: result.events,
      issues: result.issues,
      visitor: result.visitor,
      draft: draftMeta,
      run: { id: run.id, status: run.status, dryRun: run.dryRun },
      mode: "dry_run",
      note: "Dry-run recorded — no live messages, ledger writes, or cases.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid simulate payload" }, { status: 400 });
    }
    console.error("Journey simulate error:", error);
    return NextResponse.json({ error: "Failed to simulate journey" }, { status: 500 });
  }
}
