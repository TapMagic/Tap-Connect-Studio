export const MAX_UPLOAD_SOURCE_BYTES = 32 * 1024 * 1024;
export const MAX_UPLOAD_SOURCE_MEGABYTES = 32;
export const MAX_UPLOAD_REQUEST_BYTES = 34 * 1024 * 1024;
export const MAX_UPLOAD_IMAGE_PIXELS = 80_000_000;
export const RUNTIME_IMAGE_MAX_EDGE_PX = 2560;
export const RUNTIME_IMAGE_WEBP_QUALITY = 84;

export const UPLOAD_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
] as const;

export type UploadImageFile = {
  name: string;
  size: number;
  type: string;
};

export function uploadImageFileError(file: UploadImageFile): string | null {
  if (file.size > MAX_UPLOAD_SOURCE_BYTES) {
    return `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB. The maximum source image size is ${MAX_UPLOAD_SOURCE_MEGABYTES} MB.`;
  }
  const mimeType = file.type.split(";")[0]?.trim().toLowerCase();
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (
    mimeType === "image/heic" ||
    mimeType === "image/heif" ||
    extension === "heic" ||
    extension === "heif"
  ) {
    return `${file.name} is an Apple HEIC/HEIF image. HEIC is not supported yet; export or share it as JPG, PNG, or WebP and upload that file.`;
  }
  if (
    mimeType &&
    !UPLOAD_IMAGE_MIME_TYPES.includes(
      mimeType as (typeof UPLOAD_IMAGE_MIME_TYPES)[number],
    )
  ) {
    return `${file.name} is not a supported image. Use JPG, PNG, WebP, GIF, or SVG.`;
  }
  return null;
}

export type MediaUploadProgress = {
  phase: "uploading" | "processing";
  percent: number;
};

export type MediaUploadResponse<TAsset = unknown> = {
  ok: true;
  url: string;
  asset: TAsset;
  processing?: {
    optimized: boolean;
    originalSizeBytes: number;
    runtimeSizeBytes: number;
    width: number | null;
    height: number | null;
  };
};

export function uploadMediaFile<TAsset = unknown>(
  file: File,
  onProgress?: (progress: MediaUploadProgress) => void,
): Promise<MediaUploadResponse<TAsset>> {
  const validationError = uploadImageFileError(file);
  if (validationError) return Promise.reject(new Error(validationError));

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/media/upload");
    request.responseType = "json";
    request.upload.addEventListener("progress", (event) => {
      const percent = event.lengthComputable
        ? Math.max(
            1,
            Math.min(99, Math.round((event.loaded / event.total) * 100)),
          )
        : 1;
      onProgress?.({ phase: "uploading", percent });
    });
    request.upload.addEventListener("load", () => {
      onProgress?.({ phase: "processing", percent: 100 });
    });
    request.addEventListener("load", () => {
      const payload =
        request.response && typeof request.response === "object"
          ? (request.response as Record<string, unknown>)
          : {};
      if (request.status < 200 || request.status >= 300 || !payload.asset) {
        reject(
          new Error(
            typeof payload.error === "string"
              ? payload.error
              : `Upload failed (HTTP ${request.status || "network"}).`,
          ),
        );
        return;
      }
      resolve(payload as MediaUploadResponse<TAsset>);
    });
    request.addEventListener("error", () =>
      reject(
        new Error(
          "Upload failed because the network connection was interrupted.",
        ),
      ),
    );
    request.addEventListener("abort", () =>
      reject(new Error("Upload was cancelled.")),
    );
    const form = new FormData();
    form.set("file", file);
    request.send(form);
  });
}
