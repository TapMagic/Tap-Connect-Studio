import type { MediaLicenseCode } from "@prisma/client";

export type MediaProviderId = "pexels" | "logo_dev";

export type ProviderCandidate = {
  provider: MediaProviderId;
  providerAssetId: string;
  previewUrl: string;
  thumbnailUrl: string;
  altText: string;
  sourcePageUrl: string;
  creatorName?: string;
  creatorUrl?: string;
  width?: number;
  height?: number;
  mimeType: string;
  licenseCode: MediaLicenseCode;
  licenseUrl?: string;
  attributionText: string;
  rightsNote: string;
  importDescriptor: Record<string, string | number | boolean>;
  treatment?: {
    theme?: "auto" | "light" | "dark";
    greyscale?: boolean;
  };
};

export type ProviderFailureCode =
  | "not_configured"
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
  | "outage"
  | "timeout"
  | "invalid_response";

export type ProviderSearchSuccess = {
  ok: true;
  provider: MediaProviderId;
  candidates: ProviderCandidate[];
  page: number;
  nextPage: number | null;
};

export type ProviderSearchFailure = {
  ok: false;
  provider: MediaProviderId;
  code: ProviderFailureCode;
  message: string;
  status: number;
  retryAfterSeconds?: number;
};

export type ProviderSearchResult = ProviderSearchSuccess | ProviderSearchFailure;

export type ProviderFetch = typeof fetch;

export const PROVIDER_REQUEST_TIMEOUT_MS = 8_000;

export function providerFixtureModeEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.CREATIVE_PROVIDER_MODE?.trim().toLowerCase() === "fixture"
  );
}
