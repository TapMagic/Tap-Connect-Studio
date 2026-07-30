import "server-only";

import { Prisma } from "@prisma/client";
import {
  KNOWLEDGE_FACT_SCHEMA_VERSION,
  type KnowledgeFact as GovernedKnowledgeFact,
} from "@/lib/fusion/autopilot/knowledge-fact";
import { prisma } from "@/lib/db";

export const ONBOARDING_FACT_KEYS = [
  "businessName",
  "website",
  "phone",
  "email",
  "description",
  "address",
  "city",
  "state",
  "mapUrl",
  "reviewUrl",
  "bookingUrl",
  "offerTitle",
  "offerDescription",
  "offerUrl",
  "faq",
  "socialLinks",
  "services",
] as const;

export type OnboardingFactKey = (typeof ONBOARDING_FACT_KEYS)[number];

function boundedJson(value: unknown, maxBytes = 8_000): Prisma.InputJsonValue {
  const encoded = JSON.stringify(value);
  if (encoded === undefined || Buffer.byteLength(encoded, "utf8") > maxBytes) {
    throw new Error("Fact value is invalid or too large.");
  }
  return value as Prisma.InputJsonValue;
}

export async function listBusinessKnowledge(businessId: string) {
  return prisma.knowledgeFact.findMany({
    where: { businessId },
    include: {
      source: {
        select: {
          id: true,
          kind: true,
          displayLabel: true,
          normalizedUri: true,
          ingestionStatus: true,
          rightsNote: true,
          lastVerifiedAt: true,
        },
      },
    },
    orderBy: [{ factKey: "asc" }, { version: "desc" }],
  });
}

export async function createKnowledgeFacts(input: {
  businessId: string;
  locationId?: string | null;
  source: {
    kind: "OWNER" | "WEBSITE" | "UPLOAD" | "SOCIAL" | "BRAND_ASSET" | "SYSTEM";
    displayLabel: string;
    normalizedUri?: string | null;
    contentHash?: string | null;
    rightsNote?: string | null;
    metadata?: unknown;
  };
  facts: Array<{
    factKey: OnboardingFactKey;
    value: unknown;
    confidence: number;
    approvalStatus: "SUGGESTED" | "APPROVED";
    evidenceClass: "HOST_DECLARED" | "SYSTEM_OBSERVED" | "DERIVED" | "INFERRED";
    contradictionStatus?: "NONE" | "SUSPECTED" | "CONFIRMED";
    contradictionGroup?: string | null;
  }>;
  actorId?: string;
}) {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const source = await tx.knowledgeSource.create({
      data: {
        businessId: input.businessId,
        locationId: input.locationId,
        kind: input.source.kind,
        displayLabel: input.source.displayLabel,
        normalizedUri: input.source.normalizedUri,
        contentHash: input.source.contentHash,
        rightsNote: input.source.rightsNote,
        metadata: boundedJson(input.source.metadata ?? {}),
        ingestionStatus: "READY",
        capturedAt: now,
        lastVerifiedAt: now,
      },
    });

    const facts = [];
    for (const fact of input.facts) {
      const latest = await tx.knowledgeFact.findFirst({
        where: { businessId: input.businessId, factKey: fact.factKey },
        orderBy: { version: "desc" },
        select: { id: true, version: true },
      });
      facts.push(
        await tx.knowledgeFact.create({
          data: {
            businessId: input.businessId,
            locationId: input.locationId,
            sourceId: source.id,
            factKey: fact.factKey,
            value: boundedJson(fact.value),
            confidence: Math.max(0, Math.min(1, fact.confidence)),
            approvalStatus: fact.approvalStatus,
            contradictionStatus: fact.contradictionStatus ?? "NONE",
            contradictionGroup: fact.contradictionGroup,
            evidenceClass: fact.evidenceClass,
            version: (latest?.version ?? 0) + 1,
            supersedesId: latest?.id,
            approvedById: fact.approvalStatus === "APPROVED" ? input.actorId : null,
            approvedAt: fact.approvalStatus === "APPROVED" ? now : null,
            lastVerifiedAt: now,
          },
          include: { source: true },
        })
      );
    }
    return { source, facts };
  });
}

export async function decideKnowledgeFact(input: {
  businessId: string;
  factId: string;
  decision: "APPROVED" | "REJECTED";
  actorId: string;
}) {
  const fact = await prisma.knowledgeFact.findFirst({
    where: { id: input.factId, businessId: input.businessId },
  });
  if (!fact) return null;
  return prisma.knowledgeFact.update({
    where: { id: fact.id },
    data: {
      approvalStatus: input.decision,
      approvedById: input.decision === "APPROVED" ? input.actorId : null,
      approvedAt: input.decision === "APPROVED" ? new Date() : null,
      lastVerifiedAt: new Date(),
    },
    include: { source: true },
  });
}

export function toGovernedKnowledgeFact(
  fact: Awaited<ReturnType<typeof listBusinessKnowledge>>[number]
): GovernedKnowledgeFact {
  const sourceKinds: Record<string, GovernedKnowledgeFact["source"]["kind"]> = {
    OWNER: "host",
    WEBSITE: "import",
    UPLOAD: "import",
    SOCIAL: "import",
    BRAND_ASSET: "brand_kit",
    SYSTEM: "system",
  };
  return {
    id: fact.id,
    schemaVersion: KNOWLEDGE_FACT_SCHEMA_VERSION,
    kind: fact.factKey,
    scope: {
      businessId: fact.businessId,
      locationId: fact.locationId ?? undefined,
    },
    value: fact.value,
    source: {
      kind: sourceKinds[fact.source.kind] || "system",
      ref: fact.source.normalizedUri ?? fact.source.id,
      label: fact.source.displayLabel,
    },
    confidence: fact.confidence,
    approvalState:
      fact.approvalStatus === "APPROVED"
        ? "approved"
        : fact.approvalStatus === "REJECTED"
          ? "rejected"
          : fact.approvalStatus === "STALE"
            ? "retired"
            : "unapproved",
    lastVerifiedAt: fact.lastVerifiedAt.toISOString(),
    contradictionState:
      fact.contradictionStatus === "CONFIRMED"
        ? "confirmed"
        : fact.contradictionStatus === "SUSPECTED"
          ? "suspected"
          : "none",
    whereUsed: Array.isArray(fact.whereUsed)
      ? fact.whereUsed.filter((item): item is string => typeof item === "string")
      : [],
    evidenceClass:
      fact.evidenceClass === "HOST_DECLARED"
        ? "host_declared"
        : fact.evidenceClass === "SYSTEM_OBSERVED"
          ? "system_observed"
          : fact.evidenceClass === "DERIVED"
            ? "derived"
            : "inferred",
    version: fact.version,
    supersedesFactId: fact.supersedesId,
  };
}
