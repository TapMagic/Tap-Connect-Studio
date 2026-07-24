/**
 * Immutable JourneyPublishedVersion snapshots — ACTIVE visitor runs bind here.
 * Draft edits never mutate an existing published version row.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isIsolatedFusionDatabaseConfigured } from "@/lib/fusion/db/safety";
import type { JourneyDefinition } from "./types";

export type PublishedVersionRecord = {
  id: string;
  businessId: string;
  journeyId: string;
  version: number;
  name: string;
  definition: JourneyDefinition;
  publishedAt: string;
  activatedAt: string | null;
};

function parseDefinition(raw: unknown): JourneyDefinition | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as JourneyDefinition;
  if (!Array.isArray(d.nodes) || !Array.isArray(d.edges)) return null;
  return d;
}

/** Deep-freeze via JSON clone — callers must not mutate the returned definition. */
export function cloneImmutableDefinition(def: JourneyDefinition): JourneyDefinition {
  return JSON.parse(JSON.stringify(def)) as JourneyDefinition;
}

/**
 * Create a new immutable published version from the current draft definition.
 * Always increments version — never overwrites prior snapshots.
 */
export async function snapshotJourneyPublishedVersion(input: {
  businessId: string;
  journeyId: string;
  name: string;
  definition: JourneyDefinition;
  activate?: boolean;
}): Promise<PublishedVersionRecord | null> {
  if (!isIsolatedFusionDatabaseConfigured()) return null;

  const definition = cloneImmutableDefinition(input.definition);
  const latest = await prisma.journeyPublishedVersion.findFirst({
    where: { journeyId: input.journeyId, businessId: input.businessId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const version = (latest?.version ?? 0) + 1;
  const now = new Date();
  const row = await prisma.journeyPublishedVersion.create({
    data: {
      businessId: input.businessId,
      journeyId: input.journeyId,
      version,
      name: input.name,
      definition: definition as unknown as Prisma.InputJsonValue,
      publishedAt: now,
      activatedAt: input.activate ? now : null,
    },
  });

  return {
    id: row.id,
    businessId: row.businessId,
    journeyId: row.journeyId,
    version: row.version,
    name: row.name,
    definition,
    publishedAt: row.publishedAt.toISOString(),
    activatedAt: row.activatedAt?.toISOString() ?? null,
  };
}

export async function getLatestPublishedVersion(
  businessId: string,
  journeyId: string
): Promise<PublishedVersionRecord | null> {
  if (!isIsolatedFusionDatabaseConfigured()) return null;
  const row = await prisma.journeyPublishedVersion.findFirst({
    where: { businessId, journeyId },
    orderBy: { version: "desc" },
  });
  if (!row) return null;
  const definition = parseDefinition(row.definition);
  if (!definition) return null;
  return {
    id: row.id,
    businessId: row.businessId,
    journeyId: row.journeyId,
    version: row.version,
    name: row.name,
    definition: cloneImmutableDefinition(definition),
    publishedAt: row.publishedAt.toISOString(),
    activatedAt: row.activatedAt?.toISOString() ?? null,
  };
}

export async function getPublishedVersionById(
  businessId: string,
  id: string
): Promise<PublishedVersionRecord | null> {
  if (!isIsolatedFusionDatabaseConfigured()) return null;
  const row = await prisma.journeyPublishedVersion.findFirst({
    where: { id, businessId },
  });
  if (!row) return null;
  const definition = parseDefinition(row.definition);
  if (!definition) return null;
  return {
    id: row.id,
    businessId: row.businessId,
    journeyId: row.journeyId,
    version: row.version,
    name: row.name,
    definition: cloneImmutableDefinition(definition),
    publishedAt: row.publishedAt.toISOString(),
    activatedAt: row.activatedAt?.toISOString() ?? null,
  };
}
