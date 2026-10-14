import { NextResponse } from "next/server";
import { requireBusinessCapability } from "@/lib/fusion/authz/business-capability";
import {
  createBackgroundVariant,
  resolveBackgroundAsset,
  type BackgroundTreatmentRecipe,
} from "@/lib/media/background-treatment";
import { MediaServiceError } from "@/lib/media/service";

export const runtime = "nodejs";

function jsonError(error: unknown) {
  if (error instanceof MediaServiceError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  console.error("Background treatment error:", error);
  return NextResponse.json(
    {
      error: "Background cleanup could not be completed. The original remains unchanged.",
      code: "background_treatment_failed",
    },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  try {
    const { business } = await requireBusinessCapability("brand.propose");
    const mediaAssetId = new URL(request.url).searchParams.get("mediaAssetId")?.trim();
    if (!mediaAssetId) {
      return NextResponse.json({ error: "mediaAssetId required" }, { status: 400 });
    }
    const result = await resolveBackgroundAsset(business.id, mediaAssetId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { business } = await requireBusinessCapability("brand.propose");
    const body = (await request.json()) as {
      mediaAssetId?: string;
      recipe?: Partial<BackgroundTreatmentRecipe>;
    };
    if (!body.mediaAssetId?.trim()) {
      return NextResponse.json({ error: "mediaAssetId required" }, { status: 400 });
    }
    const result = await createBackgroundVariant({
      businessId: business.id,
      mediaAssetId: body.mediaAssetId,
      recipe: body.recipe || {},
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return jsonError(error);
  }
}
