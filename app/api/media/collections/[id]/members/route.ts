import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import {
  addMembers,
  memberAssetIds,
  removeMembers,
} from "@/lib/fusion/assets/collections";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireBusiness();
    const { id } = await context.params;
    const mediaAssetIds = await memberAssetIds(business.id, id);
    return NextResponse.json({ ok: true, mediaAssetIds });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unauthorized";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { business } = await requireBusiness();
    const { id } = await context.params;
    const body = (await request.json()) as {
      mediaAssetIds?: string[];
      action?: "add" | "remove";
    };
    const ids = Array.isArray(body.mediaAssetIds) ? body.mediaAssetIds : [];
    if (ids.length === 0) {
      return NextResponse.json(
        { ok: false, error: "mediaAssetIds required" },
        { status: 400 }
      );
    }
    const count =
      body.action === "remove"
        ? await removeMembers(business.id, id, ids)
        : await addMembers(business.id, id, ids);
    return NextResponse.json({ ok: true, count });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
