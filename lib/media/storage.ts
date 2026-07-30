import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { isMediaUploadReady } from "@/lib/config/integrations";

let client: S3Client | null = null;

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
  return `${process.env.R2_PUBLIC_URL!.replace(/\/$/, "")}/${storageKey}`;
}

export async function putMediaObject(input: {
  storageKey: string;
  bytes: Buffer;
  mimeType: string;
}): Promise<string> {
  requireMediaStorage();
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
  await r2Client().send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: storageKey,
    })
  );
}
