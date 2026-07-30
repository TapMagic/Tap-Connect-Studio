import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { isMediaUploadReady } from "@/lib/config/integrations";

let client: S3Client | null = null;
const LOCAL_STORAGE_ROOT = path.join(
  process.cwd(),
  "tmp",
  "creative-media-storage"
);

export function localMediaStorageEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.CREATIVE_PROVIDER_MODE?.trim().toLowerCase() === "fixture"
  );
}

function localMediaPath(storageKey: string): string {
  const resolved = path.resolve(LOCAL_STORAGE_ROOT, storageKey);
  if (!resolved.startsWith(`${LOCAL_STORAGE_ROOT}${path.sep}`)) {
    throw new Error("Invalid local media storage key");
  }
  return resolved;
}

function r2Client(): S3Client {
  if (client) return client;
  client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return client;
}

export function requireMediaStorage(): void {
  if (!isMediaUploadReady()) {
    throw new Error("Media storage is not configured");
  }
}

export function extensionForMime(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "jpg";
}

export function publicMediaUrl(storageKey: string): string {
  if (localMediaStorageEnabled()) {
    return `/api/media/local?key=${encodeURIComponent(storageKey)}`;
  }
  return `${process.env.R2_PUBLIC_URL!.replace(/\/$/, "")}/${storageKey}`;
}

export async function readLocalMediaObject(storageKey: string): Promise<Buffer> {
  if (!localMediaStorageEnabled()) {
    throw new Error("Local media storage is disabled");
  }
  return readFile(localMediaPath(storageKey));
}

export async function putMediaObject(input: {
  storageKey: string;
  bytes: Buffer;
  mimeType: string;
}): Promise<string> {
  requireMediaStorage();
  if (localMediaStorageEnabled()) {
    const filePath = localMediaPath(input.storageKey);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, input.bytes, { flag: "wx", mode: 0o600 }).catch(async (error) => {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      await writeFile(filePath, input.bytes);
    });
    return publicMediaUrl(input.storageKey);
  }
  await r2Client().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: input.storageKey,
      Body: input.bytes,
      ContentType: input.mimeType,
    })
  );
  return publicMediaUrl(input.storageKey);
}

export async function deleteMediaObject(storageKey: string): Promise<void> {
  if (!isMediaUploadReady()) return;
  if (localMediaStorageEnabled()) {
    await rm(localMediaPath(storageKey), { force: true });
    return;
  }
  await r2Client().send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: storageKey,
    })
  );
}
