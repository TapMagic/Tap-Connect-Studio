import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import {
  deleteCollection,
  updateCollection,
} from "@/lib/fusion/assets/collections";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireBusiness();
    const { id } = await context.params;
    const body = (await request.json()) as {
      name?: string;
      description?: string | null;
      icon?: string | null;
      accent?: string | null;
      pinned?: boolean;
      sortOrder?: number;
      parentId?: string | null;
    };
    const collection = await updateCollection(business.id, id, body);
    if (!collection) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, collection });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireBusiness();
    const { id } = await context.params;
    const ok = await deleteCollection(business.id, id);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
