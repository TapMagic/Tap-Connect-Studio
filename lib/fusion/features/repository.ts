/**
 * Feature override persistence contract.
 * Production path: PrismaFeatureOverrideRepository (Postgres).
 * Development-only fallback: FileFeatureOverrideRepository (.fusion/, gitignored).
 */

export type StoredFeatureOverride = {
  featureId: string;
  scope: string;
  enabled: boolean;
  reason?: string;
  actorId?: string;
  actorEmail?: string;
  actor?: string;
  updatedAt?: string;
};

export type SetFeatureOverrideInput = {
  featureId: string;
  enabled: boolean;
  scope?: string;
  reason?: string;
  actorId?: string;
  actorEmail?: string;
};

export type SetFeatureOverrideResult =
  | { ok: true; storage: "prisma" | "file"; override: StoredFeatureOverride }
  | { ok: false; error: string };

export interface FeatureOverrideRepository {
  readonly kind: "prisma" | "file";
  list(): Promise<StoredFeatureOverride[]>;
  set(input: SetFeatureOverrideInput): Promise<SetFeatureOverrideResult>;
}
