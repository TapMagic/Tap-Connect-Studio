/** Bounded operator registration of Rich's existing object. No upload or publication. */
import { parseArgs } from "node:util";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db";
import { appendAuditEvent } from "../lib/control/audit";
import { privateMediaMetadata, readMediaObject } from "../lib/media/storage";
import { sniffNativeMedia } from "../lib/media/native-media";
import { PRIVATE_NATIVE_OBJECT_CONTRACT, isPrivateNativeAsset } from "../lib/media/private-native-asset";

const bucket = "tap-connect-studio-media";
const storageKey = "MAP-every-single-mile.m4a";
const expectedHash = "d0652232052eec54d16dc2da9d7065aefa5f37becbc5c693472d5ce60a1b6f49";
const { values } = parseArgs({ options: {
  tenant: { type: "string" }, actor: { type: "string" }, execute: { type: "boolean" },
} });

async function main() {
  const businessId = values.tenant, actorId = values.actor;
  if (!businessId || !actorId) throw new Error("Explicit --tenant and --actor OWNER identifiers required");
  if (process.env.R2_PRIVATE_MEDIA_BUCKET_NAME?.trim() !== bucket)
    throw new Error("Configure the approved private media bucket before registration");
  // Verify authorization before spending storage reads, then recheck inside the transaction.
  async function owner(tx: Pick<typeof prisma, "businessUser">) {
    const member = await tx.businessUser.findUnique({
      where: { businessId_userId: { businessId: businessId!, userId: actorId! } },
      include: { user: true, business: true },
    });
    if (!member || member.role !== "OWNER" || member.user.platformStatus !== "ACTIVE"
      || member.business.lifecycleState !== "ACTIVE") throw new Error("Active target OWNER authorization required");
  }
  await owner(prisma);
  const metadata = await privateMediaMetadata(storageKey);
  if (metadata.sizeBytes !== 9852222) throw new Error("Approved object size differs; do not register");
  const bytes = await readMediaObject(storageKey, { privateNative: true });
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hash !== expectedHash || sniffNativeMedia(bytes, storageKey)?.mimeType !== "audio/mp4")
    throw new Error("Approved object content differs; do not register");
  const id = "native_" + createHash("sha256").update(`${businessId}:${bucket}:${storageKey}`).digest("hex").slice(0, 24);
  const result = await prisma.$transaction(async tx => {
    if (!values.execute) await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    await owner(tx);
    const references = await tx.mediaAsset.findMany({ where: { OR: [{ storageKey }, { id }] } });
    if (references.length) {
      const existing = references.find(a => a.id === id && a.businessId === businessId
        && a.contentHash === hash && isPrivateNativeAsset(a)
        && a.url === `/api/public/native-media/${id}` && a.approvalStatus !== "REJECTED");
      if (!existing || references.some(a => a.businessId !== businessId))
        throw new Error("Existing object binding conflicts with target ownership; nothing changed");
      return { status: "already-registered", mediaAssetId: existing.id };
    }
    if (!values.execute) return { status: "validated-plan", mediaAssetId: id };
    await tx.mediaAsset.create({ data: {
      id, businessId, storageKey, contentHash: hash, filename: storageKey,
      url: `/api/public/native-media/${id}`, sourceUrl: `/api/public/native-media/${id}`,
      mimeType: "audio/mp4", sizeBytes: bytes.byteLength, source: "upload",
      renditionKind: "original", licenseCode: "OWNER_SUPPLIED", approvalStatus: "UNREVIEWED",
      rightsNote: "Owner supplied private audio, registered in place without copying.",
      importedAt: new Date(), derivationRecipe: {
        contractId: PRIVATE_NATIVE_OBJECT_CONTRACT, businessId, bucket, storageKey, contentHash: hash,
      },
    } });
    await appendAuditEvent({ client: tx, actorId, businessId, action: "studio.media.existing_object_registered",
      permissionUsed: "brand.propose", resourceType: "MediaAsset", resourceId: id,
      newValue: { storageKey, sizeBytes: bytes.byteLength, mimeType: "audio/mp4", copied: false } });
    return { status: "registered", mediaAssetId: id };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  console.log(JSON.stringify({ ...result, businessId, bytes: bytes.byteLength, mimeType: "audio/mp4", copied: false }));
}
main().catch(error => { console.error(error instanceof Error && error.name === "Error" ? error.message : "Registration failed; no storage objects were modified."); process.exitCode = 1; })
  .finally(async () => {
    await prisma.$disconnect();
    // The operator CLI owns this process; the shared externally supplied PG pool
    // otherwise keeps it alive after its transaction and audit have completed.
    process.exit(process.exitCode ?? 0);
  });
