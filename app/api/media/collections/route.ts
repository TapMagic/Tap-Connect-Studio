import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import {
  createCollection,
  listCollections,
  reorderCollections,
} from "@/lib/fusion/assets/collections";

export async function GET() {
  try {
    const { business } = await requireBusiness();
    const collections = await listCollections(business.id);
    return NextResponse.json({ ok: true, collections });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { business } = await requireBusiness();
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      icon?: string;
      accent?: string;
      parentId?: string | null;
      orderedIds?: string[];
      action?: "create" | "reorder";
    };

    if (body.action === "reorder" && Array.isArray(body.orderedIds)) {
      await reorderCollections(business.id, body.orderedIds);
      const collections = await listCollections(business.id);
      return NextResponse.json({ ok: true, collections });
    }

    if (!body.name?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Collection name is required" },
        { status: 400 }
      );
    }
    const collection = await createCollection(business.id, {
      name: body.name,
      description: body.description,
      icon: body.icon,
      accent: body.accent,
      parentId: body.parentId,
    });
    return NextResponse.json({ ok: true, collection });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    const status = message.includes("Unique") ? 409 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
