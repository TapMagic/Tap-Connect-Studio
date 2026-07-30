export type MediaAssetSource =
  | "upload"
  | "brand"
  | "studio"
  | "recent"
  | "favorite"
  | "pexels"
  | "logo_dev"
  | "url";

export type MediaOrientation = "all" | "landscape" | "portrait" | "square";

export type MediaAssetCandidate = {
  id: string;
  mediaAssetId?: string;
  url: string;
  thumbUrl: string;
  label: string;
  source: MediaAssetSource;
  sourceLabel: string;
  sourceUrl?: string;
  providerId?: string;
  attributionName?: string;
  attributionUrl?: string;
  width?: number;
  height?: number;
  mimeType?: string;
  rights?: string;
  licenseCode?: string;
  licenseUrl?: string;
  attributionText?: string;
  approvalStatus?: "UNREVIEWED" | "APPROVED" | "REJECTED";
  isBrandApproved?: boolean;
  isFavorite?: boolean;
  recentAt?: string;
  candidateToken?: string;
  importKind?: "provider" | "external_url";
};

export type MediaProviderStatus = {
  available: boolean;
  provider: "pexels" | "logo_dev" | "library";
  message?: string;
  retryAfterSeconds?: number;
};

