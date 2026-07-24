/** Provider-neutral background removal contracts (local mock OK until live provider). */

export type BgRemoveProviderId = "local-mock" | "none";

export type BgRemovePreviewMode = "light" | "dark" | "checker";

export type BgRemoveProvenance = {
  provider: BgRemoveProviderId;
  originalUrl: string;
  derivedUrl: string;
  createdAt: string;
  refined: boolean;
  crop?: { x: number; y: number; w: number; h: number };
  focal?: { x: number; y: number };
  paddingPx?: number;
  shadow?: boolean;
};

export type BgRemoveRequest = {
  imageUrl: string;
  /** 0–1 threshold for near-corner chroma key (local mock). */
  threshold?: number;
  paddingPx?: number;
  shadow?: boolean;
  crop?: { x: number; y: number; w: number; h: number };
  focal?: { x: number; y: number };
  refine?: boolean;
};

export type BgRemoveResult = {
  ok: true;
  derivedUrl: string;
  provenance: BgRemoveProvenance;
  mimeType: "image/png";
} | {
  ok: false;
  error: string;
  code: "unsupported" | "load_failed" | "process_failed" | "provider_off";
};

export type BgRemoveAdapter = {
  id: BgRemoveProviderId;
  label: string;
  /** Honest disable reason when not available. */
  unavailableReason?: string;
  removeBackground: (req: BgRemoveRequest) => Promise<BgRemoveResult>;
};
