import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import {
  canApproveBrandMedia,
  MediaServiceError,
  setMediaApproval,
} from "@/lib/media/service";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user, business } = await requireBusiness();
    if (!canApproveBrandMedia(user, business.id)) {
      return NextResponse.json({ error: "Owner or Manager approval required" }, { status: 403 });
    }
    const { id } = await context.params;
    const asset = await setMediaApproval({
      businessId: business.id,
      userId: user.id,
      mediaAssetId: id,
      approved: true,
    });
    return NextResponse.json({ ok: true, asset });
  } catch (error) {
    if (error instanceof MediaServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Media approval error:", error);
    return NextResponse.json({ error: "Unable to approve media" }, { status: 500 });
  }
}
