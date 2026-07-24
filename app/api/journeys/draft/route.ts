import { NextResponse } from "next/server";
import { z } from "zod";
import type { JourneyLifecycleStatus, Prisma } from "@prisma/client";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listFeatureOverrides, toResolveOverrides } from "@/lib/fusion/features/overrides";
import { isFeatureEnabled } from "@/lib/fusion/features/resolve";
import {
  journeyIsValid,
  lifecycleRequiresFeature,
  lifecycleRequiresValidation,
  transitionJourneyLifecycle,
  type JourneyDefinition,
  type JourneyLifecycleAction,
} from "@/lib/fusion/journey";
import { snapshotJourneyPublishedVersion } from "@/lib/fusion/journey/published-version";
import { createGovernedEvent, enqueueOutbox } from "@/lib/fusion/publication/events";

const saveSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(120),
  definition: z.record(z.string(), z.unknown()),
  /** When true, allow save even with validation errors (raw draft). Default false. */
  force: z.boolean().optional(),
});

const lifecycleSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["publish", "activate", "pause", "resume"]),
});

function mapDraft(draft: {
  id: string;
  name: string;
  definition: unknown;
  schemaVersion: number;
  status: JourneyLifecycleStatus;
  publishedAt: Date | null;
  activatedAt: Date | null;
  pausedAt: Date | null;
  updatedAt: Date;
}) {
  return {
    id: draft.id,
    name: draft.name,
    definition: draft.definition,
    schemaVersion: draft.schemaVersion,
    status: draft.status,
    publishedAt: draft.publishedAt?.toISOString() ?? null,
    activatedAt: draft.activatedAt?.toISOString() ?? null,
    pausedAt: draft.pausedAt?.toISOString() ?? null,
    updatedAt: draft.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  try {
    const { business } = await requireBusiness();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const draft = await prisma.journeyDraft.findFirst({
      where: { id, businessId: business.id },
    });
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, draft: mapDraft(draft) });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { business, user } = await requireBusiness();
    const overrides = toResolveOverrides(await listFeatureOverrides());
    const featureEnabled = isFeatureEnabled("journey.tapflow", { overrides });
    const raw = await request.json();

    if (raw?.action && ["publish", "activate", "pause", "resume"].includes(raw.action)) {
      const body = lifecycleSchema.parse(raw);
      const action = body.action as JourneyLifecycleAction;

      if (lifecycleRequiresFeature(action) && !featureEnabled) {
        return NextResponse.json(
          {
            placeholder: true,
            feature: "journey.tapflow",
            error: "journey.tapflow is disabled — publish/activate/resume blocked",
          },
          { status: 503 }
        );
      }

      const draft = await prisma.journeyDraft.findFirst({
        where: { id: body.id, businessId: business.id },
      });
      if (!draft) {
        return NextResponse.json({ error: "Draft not found" }, { status: 404 });
      }

      const definition = draft.definition as JourneyDefinition;
      if (lifecycleRequiresValidation(action) && !journeyIsValid(definition)) {
        return NextResponse.json(
          { error: "Fix validation errors before publish/activate/resume" },
          { status: 400 }
        );
      }

      const transition = transitionJourneyLifecycle(draft.status, action);
      if (!transition.ok) {
        return NextResponse.json({ error: transition.message }, { status: 400 });
      }

      const now = new Date();
      const data: Prisma.JourneyDraftUpdateInput = { status: transition.status };
      if (transition.timestamps.publishedAt && !draft.publishedAt) {
        data.publishedAt = now;
      } else if (transition.timestamps.publishedAt && action === "publish") {
        data.publishedAt = now;
      }
      if (transition.timestamps.activatedAt) data.activatedAt = now;
      if (transition.timestamps.pausedAt) data.pausedAt = now;

      const updated = await prisma.journeyDraft.update({
        where: { id: draft.id },
        data,
      });

      // Immutable published version on publish/activate — visitor runs bind to snapshot, not draft.
      if (action === "publish" || action === "activate") {
        try {
          await snapshotJourneyPublishedVersion({
            businessId: business.id,
            journeyId: draft.id,
            name: draft.name,
            definition,
            activate: action === "activate" || transition.status === "ACTIVE",
          });
        } catch (err) {
          console.error("Journey published version snapshot failed", err);
        }
      }

      const correlationId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `journey_${Date.now()}`;

      try {
        await prisma.platformAuditEvent.create({
          data: {
            businessId: business.id,
            actorType: "USER",
            actorId: user.id,
            action: `journey.${action}`,
            resourceType: "journey_draft",
            resourceId: draft.id,
            correlationId,
            metadata: {
              status: transition.status,
              previousStatus: transition.previousStatus,
              name: draft.name,
            },
          },
        });
      } catch {
        /* audit optional if table missing mid-migrate */
      }

      await enqueueOutbox(
        `journey.${action}`,
        createGovernedEvent({
          name: `journey.${action}`,
          businessId: business.id,
          aggregateType: "journey_draft",
          aggregateId: draft.id,
          correlationId,
          payload: {
            status: transition.status,
            previousStatus: transition.previousStatus,
            name: draft.name,
            action,
          },
        })
      );

      return NextResponse.json({ ok: true, draft: mapDraft(updated) });
    }

    const body = saveSchema.parse(raw);
    const definition = body.definition as unknown as JourneyDefinition;

    if (!body.force && !journeyIsValid(definition)) {
      return NextResponse.json(
        { error: "Journey has validation errors — fix before saving" },
        { status: 400 }
      );
    }

    const draft = body.id
      ? await prisma.journeyDraft
          .updateMany({
            where: { id: body.id, businessId: business.id },
            data: {
              name: body.name,
              definition: definition as object,
              schemaVersion: definition.schemaVersion ?? 1,
            },
          })
          .then(async (result) => {
            if (result.count === 0) return null;
            return prisma.journeyDraft.findFirst({
              where: { id: body.id, businessId: business.id },
            });
          })
      : await prisma.journeyDraft.create({
          data: {
            businessId: business.id,
            name: body.name,
            definition: definition as object,
            schemaVersion: definition.schemaVersion ?? 1,
            status: "DRAFT",
          },
        });

    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, draft: mapDraft(draft) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid journey payload" }, { status: 400 });
    }
    console.error("Journey draft save error:", error);
    return NextResponse.json({ error: "Failed to save journey draft" }, { status: 500 });
  }
}
