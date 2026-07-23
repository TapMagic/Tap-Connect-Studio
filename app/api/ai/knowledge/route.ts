import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import {
  deleteKnowledgeSnippet,
  listKnowledge,
  seedBrandKitKnowledge,
  upsertKnowledgeSnippet,
} from "@/lib/fusion/autopilot/knowledge";

const upsertSchema = z.object({
  id: z.string().min(1).max(80).optional(),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(4000),
  source: z.enum(["brand_kit", "campaign", "manual", "seed"]).default("manual"),
  tags: z.array(z.string().max(40)).max(12).optional(),
});

const seedSchema = z.object({
  action: z.literal("seed_brand"),
  businessName: z.string().optional(),
  voice: z.string().optional(),
  tagline: z.string().optional(),
  offerHints: z.string().optional(),
  colors: z.string().optional(),
});

export async function GET() {
  try {
    const { business } = await requireBusiness();
    return NextResponse.json({
      ok: true,
      snippets: listKnowledge(business.id),
      evidence: "modeled",
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { business } = await requireBusiness();
    const body = await request.json();
    if (body?.action === "seed_brand") {
      const parsed = seedSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
      }
      const snippets = seedBrandKitKnowledge(business.id, parsed.data);
      return NextResponse.json({ ok: true, snippets });
    }
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const snippet = upsertKnowledgeSnippet({
      id: parsed.data.id ?? `kb_${Date.now().toString(36)}`,
      businessId: business.id,
      title: parsed.data.title,
      body: parsed.data.body,
      source: parsed.data.source,
      tags: parsed.data.tags,
    });
    return NextResponse.json({ ok: true, snippet });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { business } = await requireBusiness();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const ok = deleteKnowledgeSnippet(business.id, id);
    return NextResponse.json({ ok });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
