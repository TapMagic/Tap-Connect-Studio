import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusinessCapability } from "@/lib/fusion/authz/business-capability";
import { isMediaUploadReady } from "@/lib/config/integrations";
import { verifyProviderCandidate } from "@/lib/media/candidate-token";
import { RemoteMediaError } from "@/lib/media/remote-image";
import {
  importProviderCandidate,
  MediaServiceError,
} from "@/lib/media/service";

const schema = z.object({
  candidateToken: z.string().min(40).max(16_000),
});

export async function POST(request: Request) {
  try {
    const { business } = await requireBusinessCapability("brand.propose");
    if (!isMediaUploadReady()) {
      return NextResponse.json(
        {
          error: "Media import unavailable",
          message:
            "Durable media storage is not configured. You may preview the source, but TapConnect will not claim it was imported.",
        },
        { status: 503 }
      );
    }
    const body = schema.parse(await request.json());
    const payload = verifyProviderCandidate(body.candidateToken, business.id);
    const asset = await importProviderCandidate(payload);
    return NextResponse.json({ ok: true, url: asset.url, asset });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid import request" }, { status: 400 });
    }
    if (error instanceof RemoteMediaError || error instanceof MediaServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error && /candidate token|Candidate belongs/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Media import error:", error);
    return NextResponse.json({ error: "Media import failed" }, { status: 500 });
  }
}

