import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import {
  discardDeadLetter,
  listDeadLetters,
  listOutbox,
  processOutboxTick,
  retryDeadLetter,
} from "@/lib/fusion/publication/events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { business } = await requireBusiness();
    const url = new URL(request.url);
    const view = url.searchParams.get("view") ?? "dead";

    if (view === "pending") {
      const pending = await listOutbox({
        status: "PENDING",
        businessId: business.id,
        limit: 50,
      });
      return NextResponse.json({ ok: true, records: pending });
    }

    const dead = await listDeadLetters({ businessId: business.id, limit: 50 });
    return NextResponse.json({ ok: true, records: dead });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

const postSchema = z.object({
  action: z.enum(["retry", "discard", "process"]),
  id: z.string().optional(),
  reason: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const { business } = await requireBusiness();
    const body = postSchema.parse(await request.json());

    if (body.action === "process") {
      const tick = await processOutboxTick(
        async () => {
          // No-op delivery stub — records success for local recovery drills
        },
        { businessId: business.id, limit: 25 }
      );
      return NextResponse.json({ ok: true, tick });
    }

    if (!body.id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    if (body.action === "retry") {
      const record = await retryDeadLetter(body.id);
      if (!record) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, record });
    }

    const record = await discardDeadLetter(body.id, body.reason ?? "discarded_by_operator");
    if (!record) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, record });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
