/**
 * TikTok → relationship funnel architecture
 * content → Card → Keep → Wallet → loyalty → measurable outcome
 */

import {
  createTikTokCast,
  associateTikTokCast,
  composeTikTok916,
  uploadTikTokDraft,
  updateTikTokStoryboard,
  setTikTokCaption,
  refreshTikTokAnalytics,
} from "./adapter";
import { getCast } from "./store";
import { createExternalWorkItem } from "@/lib/fusion/connectors/productivity/adapter";
import type { TikTokAdapterResult, TikTokCast } from "./types";
import { nanoid } from "nanoid";

export type TikTokFunnelWorkflowResult = {
  cast: TikTokCast;
  cardStubId: string;
  campaignStubId: string;
  tapPointStubId: string;
  approvalWorkItemId?: string;
  funnelPath: string[];
};

/**
 * Mock path: build a full funnel-linked TikTok cast ready for draft upload.
 */
export function runTikTokRelationshipFunnel(opts: {
  businessId: string;
  title: string;
  script?: string;
}): TikTokAdapterResult<TikTokFunnelWorkflowResult> {
  const cardStubId = `card_${nanoid(8)}`;
  const campaignStubId = `campaign_${nanoid(8)}`;
  const tapPointStubId = `tap_point_${nanoid(8)}`;

  const created = createTikTokCast({
    businessId: opts.businessId,
    title: opts.title,
    script: opts.script ?? "Hook → offer → Keep Card CTA → wallet reminder",
    caption: `${opts.title} — Keep this Card. Powered by Tap The Magic.`,
    hashtags: ["#TapConnect", "#Keep", "#WeeklySpecial"],
    campaignId: campaignStubId,
    cardId: cardStubId,
    tapPointId: tapPointStubId,
  });
  if (!created.ok) return created;

  let cast = created.data;
  updateTikTokStoryboard(cast.id, [
    { order: 0, narration: "Hook", visual: "Product close-up", durationSec: 3 },
    { order: 1, narration: "Offer", visual: "Special reveal", durationSec: 8 },
    { order: 2, narration: "CTA Keep", visual: "Tap Point + Card", durationSec: 5 },
  ]);
  composeTikTok916(cast.id, { durationSec: 16, coverNote: "Cover: offer frame" });
  setTikTokCaption(
    cast.id,
    cast.caption,
    cast.hashtags
  );
  associateTikTokCast(cast.id, {
    campaignId: campaignStubId,
    cardId: cardStubId,
    tapPointId: tapPointStubId,
  });
  uploadTikTokDraft(cast.id);
  refreshTikTokAnalytics(cast.id);

  const approval = createExternalWorkItem({
    provider: "monday",
    businessId: opts.businessId,
    title: `Approve TikTok cast: ${opts.title}`,
    description: "TapCast TikTok draft ready for review before Direct Post",
    sourceType: "campaign_approval",
    sourceId: cast.id,
  });

  cast = getCast(cast.id)!;

  return {
    ok: true,
    mode: cast.mode,
    data: {
      cast,
      cardStubId,
      campaignStubId,
      tapPointStubId,
      approvalWorkItemId: approval.ok ? approval.data.id : undefined,
      funnelPath: [
        "content",
        "card",
        "keep",
        "wallet",
        "loyalty",
        "outcome",
      ],
    },
  };
}
