/**
 * Feature override service facade.
 * Selects Prisma (authoritative) when an isolated fusion DATABASE_URL is configured;
 * otherwise uses development-only file repository.
 */

import { prisma } from "@/lib/db";
import { assertSafeFusionDatabaseUrl } from "@/lib/fusion/db/safety";
import { FileFeatureOverrideRepository } from "./file-repository";
import {
  PrismaFeatureOverrideRepository,
  type FeatureOverridePrismaLike,
} from "./prisma-repository";
import type {
  FeatureOverrideRepository,
  SetFeatureOverrideInput,
  SetFeatureOverrideResult,
  StoredFeatureOverride,
} from "./repository";
import type { FeatureOverride } from "./resolve";

export type { StoredFeatureOverride };

function createRepository(): FeatureOverrideRepository {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    return new FileFeatureOverrideRepository();
  }

  const safety = assertSafeFusionDatabaseUrl(url);
  if (!safety.ok) {
    console.warn(`[features] ${safety.reason}; using development file repository`);
    return new FileFeatureOverrideRepository();
  }

  return new PrismaFeatureOverrideRepository(prisma as unknown as FeatureOverridePrismaLike);
}

let cached: FeatureOverrideRepository | null = null;

export function getFeatureOverrideRepository(): FeatureOverrideRepository {
  if (!cached) cached = createRepository();
  return cached;
}

/** Test helper — reset cached repository selection */
export function resetFeatureOverrideRepositoryCache() {
  cached = null;
}

export async function listFeatureOverrides(): Promise<StoredFeatureOverride[]> {
  const repo = getFeatureOverrideRepository();
  try {
    return await repo.list();
  } catch (err) {
    if (repo.kind === "prisma") {
      console.warn("[features] Prisma list failed; falling back to file store", err);
      return new FileFeatureOverrideRepository().list();
    }
    throw err;
  }
}

export async function setFeatureOverride(
  input: SetFeatureOverrideInput
): Promise<SetFeatureOverrideResult> {
  const repo = getFeatureOverrideRepository();
  const result = await repo.set(input);
  if (result.ok) return result;

  if (repo.kind === "prisma") {
    console.warn("[features] Prisma set failed; falling back to development file store", result.error);
    return new FileFeatureOverrideRepository().set(input);
  }
  return result;
}

/** Adapter for resolve.ts FeatureOverride shape */
export function toResolveOverrides(rows: StoredFeatureOverride[]): FeatureOverride[] {
  return rows.map((r) => ({
    featureId: r.featureId,
    enabled: r.enabled,
    scope: r.scope,
    reason: r.reason,
    actor: r.actor,
    updatedAt: r.updatedAt,
  }));
}
