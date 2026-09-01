import type { StudioResourceReference } from "./discovery";

export type StudioResourceUsageOperation = "place" | "apply" | "select_for_use";

export type StudioResourceUsageEvent = {
  userId: string;
  businessId: string;
  resource: StudioResourceReference;
  resourceKind: string;
  consumer: string;
  context?: string;
  operation: StudioResourceUsageOperation;
  timestamp: string;
};

export type StudioRecentResource = {
  resource: StudioResourceReference;
  resourceKind: string;
  consumer: string;
  context?: string;
  lastOperation: StudioResourceUsageOperation;
  lastUsedAt: string;
  useCount: number;
};

export function isQualifyingStudioUsageOperation(value: string): value is StudioResourceUsageOperation {
  return value === "place" || value === "apply" || value === "select_for_use";
}

export const LEGACY_STUDIO_RECENCY_SOURCES = [
  { capability: "icons", storageKey: "tapconnect.icon.recent", disposition: "migration_input" },
  { capability: "fonts", storageKey: "tc-creative-studio-recent-fonts", disposition: "migration_input" },
  { capability: "fonts", storageKey: "tapconnect.recent-fonts", disposition: "migration_input" },
] as const;
