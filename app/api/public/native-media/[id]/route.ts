import { publiclyReferencedMediaIds } from "@/lib/media/public-native-media";
import { prisma } from "@/lib/db";
import { requireBusiness } from "@/lib/auth";
import { getPreviewSession } from "@/lib/fusion/creative-studio/preview/tokens";
import { getSavedPhonePreviewDraft } from "@/lib/fusion/creative-studio/preview/saved-draft";
import { collectDocumentMediaReferences } from "@/lib/media/document-usage";
import { mediaByteRange } from "@/lib/media/native-media";
import { readMediaObject } from "@/lib/media/storage";
import { isPrivateNativeAsset } from "@/lib/media/private-native-asset";

export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const query = new URL(request.url).searchParams;
  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (
    !asset || !isPrivateNativeAsset(asset) ||
    asset.approvalStatus === "REJECTED"
  )
    return new Response(null, { status: 404 });
  let authorized = false;
  const referencesAsset = (document: unknown) =>
    collectDocumentMediaReferences(document).some(
      (ref) => ref.mediaAssetId === id,
    );
  if (query.has("preview")) {
    const session = getPreviewSession(query.get("preview") || "");
    if (session.ok && session.record.businessId === asset.businessId) {
      const current =
        session.record.mode === "follow" && session.record.documentId
          ? await getSavedPhonePreviewDraft({
              businessId: asset.businessId,
              documentId: session.record.documentId,
            })
          : null;
      authorized = referencesAsset(
        current?.config ?? JSON.parse(session.record.snapshotJson),
      );
    }
  } else if (query.has("publication")) {
    const destination = await prisma.experiencePublicDestination.findUnique({
      where: { slug: query.get("publication") || "" },
      include: { experience: true },
    });
    const document = destination?.experience;
    if (
      destination?.accessActive &&
      document?.publicationActive &&
      !document.archivedAt &&
      document.businessId === asset.businessId &&
      document.currentPublicationSnapshotId
    ) {
      const snapshot = await prisma.publicationSnapshot.findFirst({
        where: {
          id: document.currentPublicationSnapshotId,
          businessId: asset.businessId,
          subjectId: document.id,
          subjectType: "experience",
        },
      });
      authorized = publiclyReferencedMediaIds(snapshot?.manifest).has(id);
    }
  } else {
    try {
      const { business } = await requireBusiness();
      authorized = business.id === asset.businessId;
    } catch {
      /* Anonymous requests without a delivery credential fail closed. */
    }
  }
  if (!authorized && !query.has("preview") && !query.has("publication")) {
    const kit = await prisma.brandKit.findUnique({
      where: { businessId: asset.businessId },
      select: { currentCardPublicationId: true },
    });
    const publication = kit?.currentCardPublicationId
      ? await prisma.cardPublication.findFirst({
          where: {
            id: kit.currentCardPublicationId,
            businessId: asset.businessId,
            status: "PUBLISHED",
          },
        })
      : null;
    const snapshot = publication
      ? await prisma.publicationSnapshot.findFirst({
          where: {
            id: publication.publicationSnapshotId,
            businessId: asset.businessId,
            subjectType: "card",
          },
        })
      : null;
    authorized = publiclyReferencedMediaIds(snapshot?.manifest).has(id);
  }
  if (!authorized) return new Response(null, { status: 404 });
  try {
    const bytes = await readMediaObject(asset.storageKey!, { privateNative: true });
    const range = mediaByteRange(
      request.headers.get("range"),
      bytes.byteLength,
    );
    if (range === false)
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${bytes.byteLength}` },
      });
    const body = range ? bytes.subarray(range.start, range.end + 1) : bytes;
    return new Response(Uint8Array.from(body), {
      status: range ? 206 : 200,
      headers: {
        "Content-Type": asset.mimeType,
        "Content-Length": String(body.byteLength),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        ...(range
          ? {
              "Content-Range": `bytes ${range.start}-${range.end}/${bytes.byteLength}`,
            }
          : {}),
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
