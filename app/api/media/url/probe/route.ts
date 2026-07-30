import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { signExternalCandidate } from "@/lib/media/candidate-token";
import { fetchRemoteImage, RemoteMediaError } from "@/lib/media/remote-image";

const schema = z.object({
  url: z.string().url().max(4_000),
});

export async function POST(request: Request) {
  try {
    const { business } = await requireBusiness();
    const { url } = schema.parse(await request.json());
    const image = await fetchRemoteImage(url);
    const filename =
      new URL(image.finalUrl).pathname.split("/").filter(Boolean).pop()?.slice(0, 300) ||
      "external-image";
    const candidateToken = signExternalCandidate(business.id, {
      url: image.finalUrl,
      mimeType: image.mimeType,
      sizeBytes: image.bytes.byteLength,
      filename,
    });
    return NextResponse.json({
      ok: true,
      previewUrl: image.finalUrl,
      mimeType: image.mimeType,
      sizeBytes: image.bytes.byteLength,
      candidateToken,
      rights:
        "External URL ownership and usage rights are unverified. TapConnect will import a durable copy.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "A valid image URL is required" }, { status: 400 });
    }
    if (error instanceof RemoteMediaError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("Media URL probe error:", error);
    return NextResponse.json({ error: "Unable to inspect the image URL" }, { status: 500 });
  }
}
