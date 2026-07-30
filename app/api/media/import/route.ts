import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { isMediaUploadReady } from "@/lib/config/integrations";
import { prisma } from "@/lib/db";
import { logoDevUpstreamUrl } from "@/lib/services/logo-search";

const MAX_IMPORT_BYTES = 8 * 1024 * 1024;
const ALLOWED_REMOTE_HOSTS = new Set([
  "images.pexels.com",
  "images.unsplash.com",
  "upload.wikimedia.org",
  "commons.wikimedia.org",
]);

const schema = z.object({
  url: z.string().min(1),
  filename: z.string().max(300).optional(),
  source: z.enum(["pexels", "logo_dev", "stock", "url"]),
  providerId: z.string().max(200).optional(),
  sourceUrl: z.string().url().optional(),
  attributionName: z.string().max(300).optional(),
  attributionUrl: z.string().url().optional(),
  rights: z.string().max(1000).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

function r2() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

function logoUpstream(path: string): string | null {
  const parsed = new URL(path, "http://tapconnect.local");
  if (parsed.pathname !== "/api/logos/image") return null;
  return logoDevUpstreamUrl({
    domain: parsed.searchParams.get("domain") || undefined,
    name: parsed.searchParams.get("name") || undefined,
    theme:
      parsed.searchParams.get("theme") === "light" ||
      parsed.searchParams.get("theme") === "dark"
        ? (parsed.searchParams.get("theme") as "light" | "dark")
        : "auto",
    greyscale: parsed.searchParams.get("greyscale") === "1",
    size: Number(parsed.searchParams.get("size") || 512),
  });
}

function safeRemoteUrl(input: z.infer<typeof schema>): string | null {
  if (input.source === "logo_dev") return logoUpstream(input.url);
  try {
    const url = new URL(input.url);
    if (url.protocol !== "https:" || !ALLOWED_REMOTE_HOSTS.has(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const { business } = await requireBusiness();
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
    const remoteUrl = safeRemoteUrl(body);
    if (!remoteUrl) {
      return NextResponse.json({ error: "Unsupported media source" }, { status: 400 });
    }

    const remote = await fetch(remoteUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!remote.ok) {
      return NextResponse.json(
        { error: "Source media unavailable", status: remote.status },
        { status: 502 }
      );
    }
    const mimeType = (remote.headers.get("content-type") || "").split(";")[0];
    if (!mimeType.startsWith("image/")) {
      return NextResponse.json({ error: "Source is not an image" }, { status: 415 });
    }
    const declaredSize = Number(remote.headers.get("content-length") || 0);
    if (declaredSize > MAX_IMPORT_BYTES) {
      return NextResponse.json({ error: "Source image exceeds 8MB" }, { status: 413 });
    }
    const bytes = Buffer.from(await remote.arrayBuffer());
    if (bytes.byteLength > MAX_IMPORT_BYTES) {
      return NextResponse.json({ error: "Source image exceeds 8MB" }, { status: 413 });
    }

    const ext =
      mimeType === "image/png"
        ? "png"
        : mimeType === "image/webp"
          ? "webp"
          : mimeType === "image/svg+xml"
            ? "svg"
            : "jpg";
    const key = `${business.id}/imports/${nanoid(12)}.${ext}`;
    await r2().send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: bytes,
        ContentType: mimeType,
      })
    );
    const url = `${process.env.R2_PUBLIC_URL!.replace(/\/$/, "")}/${key}`;
    const asset = await prisma.mediaAsset.create({
      data: {
        businessId: business.id,
        url,
        filename: body.filename || `${body.source}-${body.providerId || nanoid(6)}.${ext}`,
        mimeType,
        sizeBytes: bytes.byteLength,
        width: body.width,
        height: body.height,
        source: body.source === "logo_dev" ? "logo_dev" : "stock",
        providerId: body.providerId,
        sourceUrl: body.sourceUrl,
        attributionName: body.attributionName,
        attributionUrl: body.attributionUrl,
        rights: body.rights,
        importedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true, url, asset });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid import request" }, { status: 400 });
    }
    console.error("Media import error:", error);
    return NextResponse.json({ error: "Media import failed" }, { status: 500 });
  }
}

