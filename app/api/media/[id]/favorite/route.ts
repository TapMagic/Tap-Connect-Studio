import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import { MediaServiceError, setMediaFavorite } from "@/lib/media/service";

async function updateFavorite(
  favorite: boolean,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user, business } = await requireBusiness();
    const { id } = await context.params;
    await setMediaFavorite({
      businessId: business.id,
      userId: user.id,
      mediaAssetId: id,
      favorite,
    });
    return NextResponse.json({ ok: true, favorite });
  } catch (error) {
    if (error instanceof MediaServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Media favorite error:", error);
    return NextResponse.json({ error: "Unable to update favorite" }, { status: 500 });
  }
}

export async function PUT(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return updateFavorite(true, context);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return updateFavorite(false, context);
}
