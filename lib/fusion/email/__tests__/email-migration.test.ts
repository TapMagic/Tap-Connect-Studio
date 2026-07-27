/**
 * Email Builder migration — unit proofs.
 * Maturity: IMPLEMENTED BUT NOT OWNER-READY.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ContentBlock } from "@/lib/types/campaign";
import {
  defaultEmailDocument,
  parseEmailDocument,
  serializeEmailDocument,
} from "@/lib/fusion/email/document";
import {
  bindEmailToCampaignOffer,
  detectEmailOfferProjectionState,
  refreshEmailOfferFacts,
  fingerprintOfferFacts,
} from "@/lib/fusion/email/offer-binding";
import {
  renderEmailPlainText,
  markPlainTextStale,
  resolvePlainTextForDocument,
  subjectPreheaderGuidance,
} from "@/lib/fusion/email/plain-text";
import { htmlSafetyWarnings, emailSafeFontStack } from "@/lib/fusion/email/compatibility";
import { renderEmailHtml, validateEmailHtml } from "@/lib/fusion/email/html-render";
import {
  approveEmailLocally,
  canLiveSend,
  emailApprovalHostMessage,
} from "@/lib/fusion/email/approval";
import { summarizeEmailAudienceReadiness } from "@/lib/fusion/email/audience-readiness";
import {
  EMAIL_AUTHORING_TOOLS,
  getWorkspaceTools,
  ensureDefaultToolRegistries,
} from "@/lib/fusion/authoring/workspace-tools";

function couponBlock(id: string, data: Record<string, unknown> = {}): ContentBlock {
  return {
    id,
    type: "offer_coupon",
    order: 0,
    enabled: true,
    label: "Offer",
    channel: "email",
    data: {
      title: (data.title as string) ?? "20% off",
      description: (data.description as string) ?? "Save on your next visit",
      code: (data.code as string) ?? "SAVE20",
      ctaLabel: (data.ctaLabel as string) ?? "Claim",
      lockedUntilContact: false,
      ...data,
    },
  };
}

describe("Email document adapter", () => {
  it("parses extended fields from JSON", () => {
    const doc = parseEmailDocument({
      subject: "Hello",
      preheader: "Peek inside",
      approvalState: "approved",
      visualTheme: { backgroundColor: "#112233" },
      blocks: [],
    });
    assert.equal(doc.subject, "Hello");
    assert.equal(doc.preheader, "Peek inside");
    assert.equal(doc.approvalState, "approved");
    assert.equal(doc.visualTheme?.backgroundColor, "#112233");
  });

  it("defaults without inventing parallel storage", () => {
    const doc = defaultEmailDocument("Acme");
    assert.ok(doc.blocks.length > 0);
    assert.equal(doc.fromName, "Acme");
  });
});

describe("Campaign offer binding", () => {
  it("binds authoritative offer facts from Campaign blocks", () => {
    const doc = defaultEmailDocument("Acme");
    const { document, offer } = bindEmailToCampaignOffer({
      document: doc,
      campaignId: "c1",
      campaignTitle: "Summer",
      campaignStatus: "LIVE",
      pageBlocks: [couponBlock("offer_1")],
    });
    assert.ok(offer);
    assert.equal(document.offerBlockId, "offer_1");
    assert.ok(document.offerFactsFingerprint);
    const offerBlock = document.blocks?.find((b) => b.id === "offer_1");
    assert.ok(offerBlock);
  });

  it("detects stale variant when fingerprint changes", () => {
    const fp = fingerprintOfferFacts({
      title: "A",
      description: "B",
      ctaLabel: "Go",
    });
    const doc = parseEmailDocument({
      offerBlockId: "o1",
      offerFactsFingerprint: fp,
      blocks: [],
    });
    const offer = {
      campaignId: "c1",
      campaignTitle: "T",
      campaignStatus: "LIVE",
      offerBlockId: "o1",
      title: "Changed",
      description: "B",
      ctaLabel: "Go",
      lockedUntilContact: false,
      factsFingerprint: fingerprintOfferFacts({
        title: "Changed",
        description: "B",
        ctaLabel: "Go",
      }),
    };
    assert.equal(detectEmailOfferProjectionState({ document: doc, offer }), "stale");
  });

  it("refresh preserves presentation overrides", () => {
    const offer = {
      campaignId: "c1",
      campaignTitle: "T",
      campaignStatus: "LIVE",
      offerBlockId: "o1",
      title: "New title",
      description: "New desc",
      ctaLabel: "Go",
      lockedUntilContact: false,
      factsFingerprint: "abc",
    };
    const doc = parseEmailDocument({
      blocks: [
        couponBlock("o1", { title: "Custom presentation", description: "Host copy" }),
      ],
      offerFactsFingerprint: "old",
      approvalState: "approved",
    });
    const next = refreshEmailOfferFacts({ document: doc, offer, preservePresentation: true });
    const block = next.blocks?.[0]?.data as { title?: string };
    assert.equal(block.title, "Custom presentation");
    assert.equal(next.offerFactsFingerprint, "abc");
    assert.equal(next.plainTextStale, true);
  });
});

describe("Plain text output", () => {
  it("generates deterministic plain text", () => {
    const doc = defaultEmailDocument("Acme");
    const text = renderEmailPlainText({ document: doc, businessName: "Acme" });
    assert.match(text, /Acme/);
    assert.match(text, /Unsubscribe/);
  });

  it("detects stale plain text override", () => {
    const doc = markPlainTextStale(
      parseEmailDocument({ plainTextOverride: "Custom", blocks: [] })
    );
    const resolved = resolvePlainTextForDocument(doc, "Acme");
    assert.equal(resolved.stale, true);
    assert.equal(resolved.source, "override");
  });
});

describe("HTML output safety", () => {
  it("renders email HTML without scripts", () => {
    const doc = defaultEmailDocument("Acme");
    const html = renderEmailHtml({ template: doc, businessName: "Acme" });
    assert.ok(html.includes("Acme"));
    const validation = validateEmailHtml(html);
    assert.equal(validation.safe, true);
  });

  it("applies Email background theme into HTML plate", () => {
    const doc = defaultEmailDocument("Acme");
    const html = renderEmailHtml({
      template: doc,
      businessName: "Acme",
      theme: { backgroundColor: "#224466" },
    });
    assert.match(html, /background:#224466/);
  });

  it("flags unsafe HTML", () => {
    const warnings = htmlSafetyWarnings('<div onclick="x()">bad</div><script></script>');
    assert.ok(warnings.length >= 2);
  });
});

describe("Audience readiness", () => {
  it("does not claim eligibility when consent was not loaded", () => {
    const summary = summarizeEmailAudienceReadiness({
      contacts: [
        { email: "a@test.com", consentEmail: true, consentKnown: true },
        { email: "b@test.com", consentEmail: false, consentKnown: true },
      ],
      featureEmailEnabled: true,
      consentLoaded: false,
      suppressionLoaded: false,
    });
    assert.equal(summary.evidence, "incomplete");
    assert.equal(summary.eligibleCount, null);
    assert.ok(summary.lines.some((l) => /not fully calculated/i.test(l)));
    assert.equal(summary.canSend, false);
  });

  it("explains consent exclusions when consent + suppression are loaded", () => {
    const summary = summarizeEmailAudienceReadiness({
      contacts: [
        { email: "a@test.com", consentEmail: true, consentKnown: true },
        { email: "b@test.com", consentEmail: false, consentKnown: true },
        { email: "c@test.com", consentEmail: true, consentKnown: true, suppressed: true },
      ],
      featureEmailEnabled: true,
      consentLoaded: true,
      suppressionLoaded: true,
    });
    assert.equal(summary.evidence, "authoritative");
    assert.equal(summary.eligibleCount, 1);
    assert.equal(summary.excludedSuppressed, 1);
    assert.ok(summary.lines.some((l) => /excluded/i.test(l) || /approved email/i.test(l)));
    assert.equal(summary.canSend, false);
  });

  it("does not mark eligible merely because an email address exists", () => {
    const summary = summarizeEmailAudienceReadiness({
      contacts: [{ email: "only@address.com", consentKnown: false }],
      consentLoaded: true,
      suppressionLoaded: true,
    });
    assert.notEqual(summary.evidence, "authoritative");
    assert.equal(summary.eligibleCount, null);
  });

  it("does not block authoring when provider missing", () => {
    const summary = summarizeEmailAudienceReadiness({
      contacts: [],
      consentLoaded: true,
      suppressionLoaded: true,
    });
    assert.equal(summary.canAuthor, true);
    assert.equal(summary.providerConnected, false);
  });
});

describe("Local approval only", () => {
  it("never allows live send", () => {
    assert.equal(canLiveSend(), false);
  });

  it("approves locally with host message", () => {
    const doc = approveEmailLocally(defaultEmailDocument("Acme"));
    assert.equal(doc.approvalState, "approved");
    assert.match(emailApprovalHostMessage(doc), /prepared and ready/);
  });
});

describe("Email tool registry", () => {
  it("registers email-authoring tools", () => {
    ensureDefaultToolRegistries();
    const tools = getWorkspaceTools("email-authoring");
    assert.ok(tools.length >= EMAIL_AUTHORING_TOOLS.length);
    assert.ok(tools.some((t) => t.id === "subject"));
    assert.ok(tools.some((t) => t.id === "plain_text"));
  });
});

describe("Typography fallback", () => {
  it("warns about email font fallback", () => {
    const stack = emailSafeFontStack("Inter, sans-serif");
    assert.match(stack.emailSafe, /Arial/);
    assert.ok(stack.warning.length > 0);
  });
});

describe("Subject guidance", () => {
  it("warns on missing preheader", () => {
    const tips = subjectPreheaderGuidance("Short", "");
    assert.ok(tips.some((t) => t.toLowerCase().includes("preheader")));
  });
});

describe("Serialize", () => {
  it("updates version and timestamp on save payload", () => {
    const out = serializeEmailDocument(defaultEmailDocument("Acme"));
    assert.ok(out.updatedAt);
    assert.equal(out.version, 1);
  });
});
