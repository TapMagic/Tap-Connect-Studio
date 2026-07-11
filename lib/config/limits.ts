import type { PlanTier } from "@prisma/client";

/** Hard caps to stay within free tiers — enforced server-side when uploads go live */
export const FREE_TIER_LIMITS = {
  maxImageSizeMb: 5,
  maxPdfSizeMb: 10,
  maxVideoUploadMb: 0, // 0 = YouTube/Vimeo URL only until premium
  maxFilesPerBusiness: 50,
  maxStorageMbPerBusiness: 500,
} as const;

export const PLAN_MEDIA_LIMITS: Record<
  PlanTier,
  { maxFiles: number; maxStorageMb: number; maxImageMb: number; videoUpload: boolean; aiRequestsPerMonth: number }
> = {
  BASIC: { maxFiles: 10, maxStorageMb: 100, maxImageMb: 2, videoUpload: false, aiRequestsPerMonth: 0 },
  STUDIO: { maxFiles: 50, maxStorageMb: 500, maxImageMb: 5, videoUpload: false, aiRequestsPerMonth: 10 },
  PRO: { maxFiles: 200, maxStorageMb: 2000, maxImageMb: 10, videoUpload: true, aiRequestsPerMonth: 50 },
  GROWTH: { maxFiles: 500, maxStorageMb: 5000, maxImageMb: 15, videoUpload: true, aiRequestsPerMonth: 200 },
  ENTERPRISE: { maxFiles: 2000, maxStorageMb: 20000, maxImageMb: 25, videoUpload: true, aiRequestsPerMonth: 1000 },
};

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
export const ALLOWED_DOC_TYPES = ["application/pdf"];
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"]; // tier-gated
