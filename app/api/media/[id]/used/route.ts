import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import { MediaServiceError, recordMediaRecent } from "@/lib/media/service";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user, business } = await requireBusiness();
    const { id } = await context.params;
    await recordMediaRecent({
      businessId: business.id,
      userId: user.id,
      mediaAssetId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof MediaServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Media recent error:", error);
    return NextResponse.json({ error: "Unable to record media use" }, { status: 500 });
  }
}
