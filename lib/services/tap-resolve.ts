import { CampaignStatus, type Campaign, type BrandKit } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  endExperienceAsBlocks,
  parseEndExperience,
  type EndExperience,
} from "@/lib/end-experience";
import { isCampaignLive, parseContentBlocks } from "@/lib/services/devices";
import type { ContentBlock } from "@/lib/types/campaign";

export type ResolvedTapContent = {
  kind: "campaign" | "end";
  campaign: Campaign | null;
  blocks: ContentBlock[];
  themeOverrides: Record<string, string>;
  source: "live" | "campaign_end" | "group_end" | "brand_end";
  redirectUrl?: string;
};

/**
 * After getDeviceWithActiveCampaign: if no live campaign, try end experiences.
 */
export async function resolveTapContent(params: {
  campaign: Campaign | null;
  campaignGroupId?: string | null;
  brandKit?: BrandKit | null;
}): Promise<ResolvedTapContent | null> {
  const { campaign, brandKit } = params;

  if (campaign && isCampaignLive(campaign)) {
    return {
      kind: "campaign",
      campaign,
      blocks: parseContentBlocks(campaign.contentBlocks),
      themeOverrides: (campaign.themeOverrides as Record<string, string>) ?? {},
      source: "live",
    };
  }

  // Assigned campaign past window / paused — use its end experience
  if (campaign) {
    const exp = parseEndExperience(campaign.endExperience);
    if (exp.enabled) {
      if (exp.mode === "redirect" && exp.redirectUrl) {
        return {
          kind: "end",
          campaign,
          blocks: endExperienceAsBlocks(exp),
          themeOverrides: (campaign.themeOverrides as Record<string, string>) ?? {},
          source: "campaign_end",
          redirectUrl: exp.redirectUrl,
        };
      }
      return {
        kind: "end",
        campaign,
        blocks: endExperienceAsBlocks(exp),
        themeOverrides: (campaign.themeOverrides as Record<string, string>) ?? {},
        source: "campaign_end",
      };
    }
  }

  // Group end page campaign
  if (params.campaignGroupId) {
    try {
      const group = await prisma.campaignGroup.findUnique({
        where: { id: params.campaignGroupId },
        include: { endCampaign: true },
      });
      if (group?.endCampaign && !["ARCHIVED", "CLOSED"].includes(group.endCampaign.status)) {
        return {
          kind: "end",
          campaign: group.endCampaign,
          blocks: parseContentBlocks(group.endCampaign.contentBlocks),
          themeOverrides: (group.endCampaign.themeOverrides as Record<string, string>) ?? {},
          source: "group_end",
        };
      }
    } catch {
      /* column may not exist yet */
    }
  }

  // Brand default end experience
  if (brandKit) {
    const raw = (brandKit as BrandKit & { endExperience?: unknown }).endExperience;
    const exp: EndExperience = parseEndExperience(raw);
    // Empty {} from DB still yields default enabled experience
    if (exp.enabled) {
      return {
        kind: "end",
        campaign: null,
        blocks: endExperienceAsBlocks(exp),
        themeOverrides: {
          primaryColor: brandKit.primaryColor,
          secondaryColor: brandKit.secondaryColor,
          backgroundColor: brandKit.backgroundColor,
          textColor: brandKit.textColor,
        },
        source: "brand_end",
      };
    }
  }

  return null;
}

export function campaignWindowExpired(campaign: {
  status: CampaignStatus;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
}): boolean {
  const now = new Date();
  if (campaign.scheduledEnd && campaign.scheduledEnd < now) return true;
  if (["PAUSED", "CLOSED", "ARCHIVED"].includes(campaign.status)) return true;
  return false;
}
