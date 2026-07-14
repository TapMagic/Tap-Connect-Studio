import { nanoid } from "nanoid";
import type { ContentBlock } from "@/lib/types/campaign";
import {
  defaultEmailPromo,
  parseEmailPromo,
  type EmailPromoTemplate,
} from "@/lib/email-promo";

export type CampaignEmailResponse = EmailPromoTemplate & {
  /** When true, contact capture sends this offer email */
  sendOnCapture: boolean;
};

export function defaultCampaignEmailResponse(businessName: string): CampaignEmailResponse {
  const base = defaultEmailPromo(businessName);
  return {
    ...base,
    enabled: true,
    sendOnCapture: true,
    subject: `Your offer from ${businessName}`,
    blocks: [
      {
        id: nanoid(8),
        type: "headline",
        order: 0,
        enabled: true,
        label: "Thanks",
        channel: "email",
        data: {
          headline: `Thanks for tapping in, {{name}}`,
          subheadline: "Here’s the offer you unlocked.",
          alignment: "center",
        },
      },
      {
        id: nanoid(8),
        type: "offer_coupon",
        order: 1,
        enabled: true,
        label: "Offer",
        channel: "email",
        data: {
          title: "Your exclusive offer",
          description: "Show this email in store or use the code below.",
          code: "TAP10",
          ctaLabel: "Got it",
          lockedUntilContact: false,
        },
      },
      {
        id: nanoid(8),
        type: "rich_text",
        order: 2,
        enabled: true,
        label: "Note",
        channel: "email",
        data: {
          body: "Hi {{name}},\n\nWe’re glad you stopped by. Reply to this email anytime.",
        },
      },
    ],
  };
}

export function parseCampaignEmailResponse(
  raw: unknown,
  businessName = "us"
): CampaignEmailResponse {
  const promo = parseEmailPromo(raw, businessName);
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  if (!raw || (typeof raw === "object" && !Array.isArray(o.blocks) && !o.subject)) {
    return defaultCampaignEmailResponse(businessName);
  }
  return {
    ...promo,
    sendOnCapture: o.sendOnCapture !== false,
  };
}

export function parseFormSettingsEmail(formSettings: unknown, businessName: string) {
  if (!formSettings || typeof formSettings !== "object") {
    return defaultCampaignEmailResponse(businessName);
  }
  const fs = formSettings as Record<string, unknown>;
  return parseCampaignEmailResponse(fs.emailResponse ?? fs.emailPromo, businessName);
}

/** Blocks that belong on the public tap page */
export function pageVisibleBlocks(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.filter((b) => {
    const ch = b.channel ?? "page";
    return ch === "page" || ch === "both";
  });
}

/** Blocks destined for the follow-up email (dedicated list or channel=email|both) */
export function resolveEmailOfferBlocks(params: {
  emailResponse: CampaignEmailResponse;
  pageBlocks: ContentBlock[];
}): ContentBlock[] {
  const dedicated = (params.emailResponse.blocks ?? []).filter((b) => b.enabled);
  if (dedicated.length) return dedicated.sort((a, b) => a.order - b.order);

  return params.pageBlocks
    .filter((b) => b.enabled && (b.channel === "email" || b.channel === "both"))
    .sort((a, b) => a.order - b.order);
}
