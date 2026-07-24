/**
 * TapFlow live visitor execution control API.
 * Actions: list | get | pause | resume | cancel | advance | retry | provider_event
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { listFeatureOverrides, toResolveOverrides } from "@/lib/fusion/features/overrides";
import { isFeatureEnabled } from "@/lib/fusion/features/resolve";
import {
  advanceWaitingExecution,
  cancelLiveExecution,
  getLiveExecution,
  ingestJourneyProviderEvent,
  listLiveExecutions,
  pauseLiveExecution,
  resumeLiveExecution,
  retryFailedNode,
} from "@/lib/fusion/journey/live";

const controlSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("list"), limit: z.number().int().min(1).max(100).optional() }),
  z.object({ action: z.literal("get"), executionId: z.string().min(1) }),
  z.object({ action: z.literal("pause"), executionId: z.string().min(1) }),
  z.object({
    action: z.literal("resume"),
    executionId: z.string().min(1),
    clearForceFail: z.boolean().optional(),
    visitorPatch: z
      .object({
        consent: z
          .object({
            email: z.boolean().optional(),
            sms: z.boolean().optional(),
            marketing: z.boolean().optional(),
          })
          .optional(),
        preferBranch: z.string().optional(),
      })
      .optional(),
  }),
  z.object({ action: z.literal("cancel"), executionId: z.string().min(1) }),
  z.object({
    action: z.literal("advance"),
    executionId: z.string().min(1),
    force: z.boolean().optional(),
  }),
  z.object({ action: z.literal("retry"), executionId: z.string().min(1) }),
  z.object({
    action: z.literal("provider_event"),
    provider: z.string().min(1),
    eventKey: z.string().min(1),
    executionId: z.string().optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
  }),
]);

export async function GET(request: Request) {
  try {
    const { business } = await requireBusiness();
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (id) {
      const execution = await getLiveExecution(business.id, id);
      if (!execution) {
        return NextResponse.json({ error: "Execution not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, execution });
    }
    const limit = Number(url.searchParams.get("limit") ?? "40");
    const executions = await listLiveExecutions(business.id, Number.isFinite(limit) ? limit : 40);
    return NextResponse.json({ ok: true, executions });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { business } = await requireBusiness();
    const overrides = toResolveOverrides(await listFeatureOverrides());
    if (!isFeatureEnabled("journey.tapflow", { overrides })) {
      return NextResponse.json(
        {
          placeholder: true,
          feature: "journey.tapflow",
          error: "journey.tapflow is disabled",
        },
        { status: 503 }
      );
    }

    const body = controlSchema.parse(await request.json());

    switch (body.action) {
      case "list": {
        const executions = await listLiveExecutions(business.id, body.limit ?? 40);
        return NextResponse.json({ ok: true, executions });
      }
      case "get": {
        const execution = await getLiveExecution(business.id, body.executionId);
        if (!execution) {
          return NextResponse.json({ error: "Execution not found" }, { status: 404 });
        }
        return NextResponse.json({ ok: true, execution });
      }
      case "pause": {
        const result = await pauseLiveExecution(business.id, body.executionId);
        if (!result.ok) {
          return NextResponse.json(result, { status: result.code === "not_found" ? 404 : 400 });
        }
        return NextResponse.json(result);
      }
      case "resume": {
        const result = await resumeLiveExecution(business.id, body.executionId, {
          clearForceFail: body.clearForceFail,
          visitorPatch: body.visitorPatch,
        });
        if (!result.ok) {
          return NextResponse.json(result, { status: result.code === "not_found" ? 404 : 400 });
        }
        return NextResponse.json(result);
      }
      case "cancel": {
        const result = await cancelLiveExecution(business.id, body.executionId);
        if (!result.ok) {
          return NextResponse.json(result, { status: result.code === "not_found" ? 404 : 400 });
        }
        return NextResponse.json(result);
      }
      case "advance": {
        const result = await advanceWaitingExecution(business.id, body.executionId, {
          force: body.force,
        });
        if (!result.ok) {
          return NextResponse.json(result, { status: result.code === "not_found" ? 404 : 400 });
        }
        return NextResponse.json(result);
      }
      case "retry": {
        const result = await retryFailedNode(business.id, body.executionId);
        if (!result.ok) {
          return NextResponse.json(result, { status: result.code === "not_found" ? 404 : 400 });
        }
        return NextResponse.json(result);
      }
      case "provider_event": {
        const result = await ingestJourneyProviderEvent({
          businessId: business.id,
          provider: body.provider,
          eventKey: body.eventKey,
          executionId: body.executionId,
          payload: body.payload,
        });
        return NextResponse.json({ ok: true, ...result });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", issues: error.issues }, { status: 400 });
    }
    console.error("Journey live API error", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
