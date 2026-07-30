import { NextResponse } from "next/server";
import {
  MediaServiceError,
  setMediaApproval,
} from "@/lib/media/service";
import { requireBusinessCapability } from "@/lib/fusion/authz/business-capability";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user, business } =
      await requireBusinessCapability("brand.approve");
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
