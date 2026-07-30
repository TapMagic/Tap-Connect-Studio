import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusinessCapability } from "@/lib/fusion/authz/business-capability";
import { verifyExternalCandidate } from "@/lib/media/candidate-token";
import { RemoteMediaError } from "@/lib/media/remote-image";
import { importExternalImage, MediaServiceError } from "@/lib/media/service";

const schema = z.object({
  candidateToken: z.string().min(40).max(16_000),
});

export async function POST(request: Request) {
  try {
    const { business } = await requireBusinessCapability("brand.propose");
    const body = schema.parse(await request.json());
    const payload = verifyExternalCandidate(body.candidateToken, business.id);
    const asset = await importExternalImage({
      businessId: business.id,
      url: payload.url,
      filename: payload.filename,
    });
    return NextResponse.json({ ok: true, url: asset.url, asset });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid URL import request" }, { status: 400 });
    }
    if (error instanceof RemoteMediaError || error instanceof MediaServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error && /candidate token|Candidate belongs/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Media URL import error:", error);
    return NextResponse.json({ error: "Unable to import external image" }, { status: 500 });
  }
}
