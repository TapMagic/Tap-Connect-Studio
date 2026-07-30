import "server-only";

import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  BRAND_PROPERTY_KEYS,
  type BrandPropertyKey,
} from "@/lib/fusion/brand/property-decisions";
import type { OnboardingFactKey } from "@/lib/fusion/knowledge/repository";
import type {
  WebsiteDiscoveryCandidate,
} from "@/lib/fusion/knowledge/website-discovery";
import { socialAndServiceFacts } from "@/lib/fusion/knowledge/website-discovery";
import type {
  WebsiteIntakeResult,
} from "@/lib/fusion/knowledge/website-intake";
import { websiteReviewFingerprint } from "@/lib/fusion/knowledge/website-intake";

const BRAND_KEYS = new Set<string>(BRAND_PROPERTY_KEYS);
const COLOR_KEYS = new Set([
  "primaryColor",
  "secondaryColor",
  "accentColor",
  "backgroundColor",
  "textColor",
]);
const FONT_STYLES = new Set(["MODERN", "CLASSIC", "PLAYFUL", "PREMIUM", "MINIMAL"]);

function isBrandPropertyKey(value: string | undefined): value is BrandPropertyKey {
  return Boolean(value && BRAND_KEYS.has(value));
}

function boundedJson(value: unknown, maxBytes = 8_000): Prisma.InputJsonValue {
  const encoded = JSON.stringify(value);
  if (encoded === undefined || Buffer.byteLength(encoded, "utf8") > maxBytes) {
    throw new Error("Website discovery value is invalid or too large.");
  }
  return value as Prisma.InputJsonValue;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function normalizedBrandCandidates(candidates: WebsiteDiscoveryCandidate[]) {
  const unique = new Map<string, WebsiteDiscoveryCandidate>();
  for (const candidate of candidates) {
    if (!isBrandPropertyKey(candidate.propertyKey)) continue;
    if (COLOR_KEYS.has(candidate.propertyKey) && !/^#[0-9a-f]{6}$/i.test(candidate.value)) {
      continue;
    }
    if (candidate.propertyKey === "fontStyle" && !FONT_STYLES.has(candidate.value)) {
      continue;
    }
    const key = `${candidate.propertyKey}:${candidate.value}`;
    if (!unique.has(key)) unique.set(key, candidate);
  }
  return [...unique.values()];
}

async function existingResult(
  businessId: string,
  requestFingerprint: string
) {
  return prisma.knowledgeSource.findFirst({
    where: { businessId, kind: "WEBSITE", requestFingerprint },
    include: {
      facts: { include: { source: true } },
      brandDecisions: true,
    },
  });
}

export async function persistWebsiteDiscovery(input: {
  businessId: string;
  actorId: string;
  result: WebsiteIntakeResult;
}) {
  const requestFingerprint = websiteReviewFingerprint(input.result);
  const existing = await existingResult(input.businessId, requestFingerprint);
  if (existing) {
    return {
      source: existing,
      facts: existing.facts,
      brandProposals: existing.brandDecisions.map((decision) => decision.propertyKey),
      idempotent: true,
    };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const raced = await tx.knowledgeSource.findFirst({
        where: {
          businessId: input.businessId,
          kind: "WEBSITE",
          requestFingerprint,
        },
        include: {
          facts: { include: { source: true } },
          brandDecisions: true,
        },
      });
      if (raced) {
        return {
          source: raced,
          facts: raced.facts,
          brandProposals: raced.brandDecisions.map((decision) => decision.propertyKey),
          idempotent: true,
        };
      }

      const candidateKinds = input.result.candidates.reduce<Record<string, number>>(
        (counts, candidate) => {
          counts[candidate.kind] = (counts[candidate.kind] ?? 0) + 1;
          return counts;
        },
        {}
      );
      const candidateDigest = createHash("sha256")
        .update(stableJson(input.result.candidates))
        .digest("hex");
      const source = await tx.knowledgeSource.create({
        data: {
          businessId: input.businessId,
          kind: "WEBSITE",
          normalizedUri: input.result.finalUrl,
          displayLabel: new URL(input.result.finalUrl).hostname,
          contentHash: input.result.contentHash,
          requestFingerprint,
          ingestionStatus: "READY",
          rightsNote: "Homepage findings are suggestions until Owner approval.",
          metadata: boundedJson({
            scope: "homepage_only",
            requestedUrl: input.result.requestedUrl,
            fetchedAt: input.result.fetchedAt,
            candidateCount: input.result.candidates.length,
            candidateKinds,
            candidateDigest,
          }),
          capturedAt: new Date(input.result.fetchedAt),
          lastVerifiedAt: new Date(input.result.fetchedAt),
        },
      });

      const extras = socialAndServiceFacts(input.result.candidates);
      const factInputs: Array<{
        factKey: OnboardingFactKey;
        value: unknown;
        confidence: number;
      }> = input.result.findings.map((finding) => ({
        factKey: finding.factKey,
        value: finding.value,
        confidence: finding.confidence,
      }));
      if (extras.socialLinks.length) {
        factInputs.push({ factKey: "socialLinks", value: extras.socialLinks, confidence: 0.85 });
      }
      if (extras.services.length) {
        factInputs.push({ factKey: "services", value: extras.services, confidence: 0.8 });
      }

      const facts = [];
      for (const fact of factInputs) {
        const latest = await tx.knowledgeFact.findFirst({
          where: { businessId: input.businessId, factKey: fact.factKey },
          orderBy: { version: "desc" },
        });
        if (
          latest &&
          ["APPROVED", "REJECTED"].includes(latest.approvalStatus) &&
          stableJson(latest.value) === stableJson(fact.value)
        ) {
          continue;
        }
        facts.push(
          await tx.knowledgeFact.create({
            data: {
              businessId: input.businessId,
              sourceId: source.id,
              factKey: fact.factKey,
              value: boundedJson(fact.value),
              confidence: Math.max(0, Math.min(1, fact.confidence)),
              approvalStatus: "SUGGESTED",
              contradictionStatus: "NONE",
              evidenceClass: "HOST_DECLARED",
              version: (latest?.version ?? 0) + 1,
              supersedesId: latest?.id,
              lastVerifiedAt: new Date(input.result.fetchedAt),
            },
            include: { source: true },
          })
        );
      }

      const brandKit = await tx.brandKit.findUniqueOrThrow({
        where: { businessId: input.businessId },
        select: { id: true },
      });
      const existingDecisions = await tx.brandPropertyDecision.findMany({
        where: { businessId: input.businessId },
        select: { propertyKey: true, candidate: true, status: true },
      });
      const brandProposals: string[] = [];
      for (const candidate of normalizedBrandCandidates(input.result.candidates)) {
        const candidateValue = {
          value: candidate.value,
          kind: candidate.kind,
          ...(candidate.sourceUrl ? { sourceUrl: candidate.sourceUrl } : {}),
        };
        const prior = existingDecisions.find(
          (decision) =>
            decision.propertyKey === candidate.propertyKey &&
            stableJson(decision.candidate) === stableJson(candidateValue)
        );
        if (prior) continue;

        const needsRights = ["logo", "alternateMark", "imageryDirection"].includes(
          candidate.propertyKey!
        );
        await tx.brandPropertyDecision.create({
          data: {
            businessId: input.businessId,
            brandKitId: brandKit.id,
            propertyKey: candidate.propertyKey!,
            candidate: boundedJson(candidateValue, 16_000),
            scope: "BRAND",
            knowledgeSourceId: source.id,
            provider: "website_homepage",
            confidence: Math.max(0, Math.min(1, candidate.confidence)),
            rationale: candidate.evidence.slice(0, 500),
            rightsStatus: needsRights ? "NEEDS_CONFIRMATION" : "NOT_APPLICABLE",
            actedById: input.actorId,
          },
        });
        brandProposals.push(candidate.propertyKey!);
      }

      return { source, facts, brandProposals, idempotent: false };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await existingResult(input.businessId, requestFingerprint);
      if (raced) {
        return {
          source: raced,
          facts: raced.facts,
          brandProposals: raced.brandDecisions.map((decision) => decision.propertyKey),
          idempotent: true,
        };
      }
    }
    throw error;
  }
}
