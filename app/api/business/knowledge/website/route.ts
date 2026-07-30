import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  BusinessCapabilityError,
  requireBusinessCapability,
} from "@/lib/fusion/authz/business-capability";
import { createKnowledgeFacts } from "@/lib/fusion/knowledge/repository";
import {
  intakeHomepage,
  normalizeHomepageUrl,
  WebsiteIntakeError,
} from "@/lib/fusion/knowledge/website-intake";

export const runtime = "nodejs";

const schema = z.object({
  website: z.string().trim().min(1).max(500),
});

const globalRateState = globalThis as typeof globalThis & {
  __onboardingWebsiteRate?: Map<string, number[]>;
};

function consumeRateLimit(businessId: string): boolean {
  const store =
    globalRateState.__onboardingWebsiteRate ??
    (globalRateState.__onboardingWebsiteRate = new Map<string, number[]>());
  const cutoff = Date.now() - 60_000;
  const recent = (store.get(businessId) || []).filter((time) => time > cutoff);
  if (recent.length >= 5) return false;
  recent.push(Date.now());
  store.set(businessId, recent);
  return true;
}

export async function POST(request: Request) {
  let businessId: string | null = null;
  let requestedWebsite = "";
  try {
    const { business } = await requireBusinessCapability("knowledge.propose");
    businessId = business.id;
    if (!consumeRateLimit(business.id)) {
      return NextResponse.json(
        {
          error: "Website review is temporarily limited.",
          recovery: "Wait a minute or continue with manual entry.",
        },
        { status: 429 }
      );
    }
    const body = schema.parse(await request.json());
    requestedWebsite = body.website;
    const result = await intakeHomepage(body.website);
    const saved = await createKnowledgeFacts({
      businessId: business.id,
      source: {
        kind: "WEBSITE",
        displayLabel: new URL(result.finalUrl).hostname,
        normalizedUri: result.finalUrl,
        contentHash: result.contentHash,
        rightsNote: "Homepage facts are suggestions until Owner approval.",
        metadata: {
          scope: "homepage_only",
          requestedUrl: result.requestedUrl,
          fetchedAt: result.fetchedAt,
        },
      },
      facts: result.findings.map((finding) => ({
        factKey: finding.factKey,
        value: finding.value,
        confidence: finding.confidence,
        approvalStatus: "SUGGESTED",
        evidenceClass: "HOST_DECLARED",
      })),
    });
    return NextResponse.json({
      source: saved.source,
      facts: saved.facts,
      status: "Suggested",
      notice: "Review and approve each website finding before TapConnect uses it.",
    });
  } catch (error) {
    if (businessId && requestedWebsite && error instanceof WebsiteIntakeError) {
      let normalizedUri: string | null = null;
      try {
        normalizedUri = normalizeHomepageUrl(requestedWebsite).toString();
      } catch {
        // Invalid input has no normalized source URI.
      }
      await prisma.knowledgeSource
        .create({
          data: {
            businessId,
            kind: "WEBSITE",
            normalizedUri,
            displayLabel: normalizedUri
              ? new URL(normalizedUri).hostname
              : "Website review",
            ingestionStatus: "FAILED",
            metadata: { code: error.code, scope: "homepage_only" },
          },
        })
        .catch(() => undefined);
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          recovery: "Continue with manual entry or correct the website and try again.",
        },
        { status: 422 }
      );
    }
    if (error instanceof BusinessCapabilityError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Enter a valid website or domain.", detail: error.flatten() },
        { status: 400 }
      );
    }
    console.error("Website intake error:", error);
    return NextResponse.json(
      {
        error: "The homepage could not be reviewed.",
        recovery: "Continue with manual entry and try the website again later.",
      },
      { status: 500 }
    );
  }
}
