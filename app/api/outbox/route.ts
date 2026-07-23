import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import {
  listDeadLetters,
  retryDeadLetter,
  listOutbox,
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
  action: z.literal("retry"),
  id: z.string(),
});

export async function POST(request: Request) {
  try {
    await requireBusiness();
    const body = postSchema.parse(await request.json());
    const record = await retryDeadLetter(body.id);
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
