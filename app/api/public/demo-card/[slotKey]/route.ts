import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const PRIVATE_KEYS = /secret|token|password|credential|internalnote|stripe|clerk|audit|permission/i;

function publicSafe(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(publicSafe);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !PRIVATE_KEYS.test(key))
        .map(([key, child]) => [key, publicSafe(child)]),
    );
  }
  return value;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slotKey: string }> },
) {
  const { slotKey } = await context.params;
  const binding = await prisma.landingDemoBinding.findFirst({
    where: { slotKey, active: true },
    orderBy: { activatedAt: "desc" },
    include: {
      demoMetadata: true,
      business: { select: { name: true, workspaceKind: true } },
    },
  });
  if (!binding) {
    return NextResponse.json(
      {
        bound: false,
        slotKey,
        fallback: "No published Demo Card is currently bound.",
      },
      {
        status: 404,
        headers: { "Cache-Control": "public, max-age=0, s-maxage=30" },
      },
    );
  }
  const publication = await prisma.demoPublication.findFirst({
    where: {
      id: binding.demoPublicationId,
      demoMetadataId: binding.demoMetadataId,
      status: "PUBLISHED",
    },
  });
  if (!publication || binding.business.workspaceKind !== "DEMO") {
    return NextResponse.json(
      { bound: false, slotKey, fallback: "The bound Demo Card revision is unavailable." },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }
  const snapshot = await prisma.publicationSnapshot.findUnique({
    where: { id: publication.publicationSnapshotId },
  });
  if (!snapshot) {
    return NextResponse.json(
      { bound: false, slotKey, fallback: "The immutable Demo Card snapshot is unavailable." },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }
  const etag = `"${publication.contentHash}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
      },
    });
  }
  const manifest = publicSafe(snapshot.manifest) as Record<string, unknown>;
  return NextResponse.json(
    {
      bound: true,
      slotKey,
      demo: {
        name: binding.business.name,
        description: binding.demoMetadata.description,
        fixtureProvenance: binding.demoMetadata.fixtureProvenance,
      },
      revision: {
        id: publication.id,
        version: publication.version,
        publishedAt: publication.publishedAt?.toISOString() ?? null,
        contentHash: publication.contentHash,
      },
      card: manifest.tapCard ?? null,
    },
    {
      headers: {
        ETag: etag,
        "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
        "Content-Security-Policy": "default-src 'none'; frame-ancestors 'self'",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

