/**
 * TapCanvas hooks — Campaign distribution graph nodes/actions.
 */

import { createCanvas, requireCanvas, addNode, addEdge, updateNode } from "@/lib/fusion/canvas/graph";
import type { TapCanvas } from "@/lib/fusion/canvas/types";
import {
  approveVariant,
  createMultiChannelVariants,
  openProviderComposer,
  publishCampaignChannels,
  publishVariantMock,
  reAdaptVariant,
  refreshVariantAnalytics,
  retryVariant,
  scheduleVariant,
} from "./adapter";
import type { CampaignSource } from "./adapt";
import { listVariants } from "./store";
import type { CampaignChannelVariant } from "./types";

export type DistributionGraphResult = {
  canvas: TapCanvas;
  campaignNodeId: string;
  variantNodeIds: string[];
  variants: CampaignChannelVariant[];
};

function layoutVariant(index: number): { x: number; y: number } {
  const col = index % 4;
  const row = Math.floor(index / 4);
  return { x: 280 + col * 220, y: 80 + row * 140 };
}

/** Build or refresh a Campaign → channel-variant distribution graph on a canvas */
export function buildCampaignDistributionGraph(opts: {
  businessId: string;
  campaignId: string;
  campaignTitle: string;
  channelIds: string[];
  source: CampaignSource;
  canvasId?: string;
  canvasName?: string;
}): DistributionGraphResult {
  const created = createMultiChannelVariants({
    businessId: opts.businessId,
    campaignId: opts.campaignId,
    channelIds: opts.channelIds,
    source: { ...opts.source, id: opts.campaignId },
  });
  const variants = created.ok ? created.data.variants : [];

  const canvas = opts.canvasId
    ? requireCanvas(opts.canvasId)
    : createCanvas({
        businessId: opts.businessId,
        name: opts.canvasName ?? `Distribution · ${opts.campaignTitle}`,
        mode: "build",
      });

  const { node: campaignNode } = addNode(canvas.id, {
    kind: "campaign",
    label: opts.campaignTitle,
    x: 40,
    y: 160,
    linked: { type: "campaign", id: opts.campaignId },
    data: {
      distributionRoot: true,
      campaignId: opts.campaignId,
    },
  });

  const variantNodeIds: string[] = [];
  variants.forEach((v, i) => {
    const pos = layoutVariant(i);
    const { node } = addNode(canvas.id, {
      kind: "channel_variant",
      label: `${v.channelId} · ${v.status}`,
      x: pos.x,
      y: pos.y,
      linked: { type: "channel_variant", id: v.id, provider: v.channelId },
      data: {
        variantId: v.id,
        channelId: v.channelId,
        publishPath: v.readiness.publishPath,
        campaignId: v.campaignId,
        tikTokCastId: v.tikTokCastId,
      },
    });
    updateNode(canvas.id, node.id, { liveStatus: v.status });
    variantNodeIds.push(node.id);
    addEdge(canvas.id, {
      source: campaignNode.id,
      target: node.id,
      kind: "association",
      label: v.readiness.publishPath,
    });
  });

  return {
    canvas: requireCanvas(canvas.id),
    campaignNodeId: campaignNode.id,
    variantNodeIds,
    variants,
  };
}

export type DistributionActionId =
  | "create_variant"
  | "adapt"
  | "approve"
  | "schedule"
  | "publish"
  | "retry"
  | "open_provider"
  | "performance";

export type DistributionActionResult = {
  ok: boolean;
  action: DistributionActionId;
  canvas?: TapCanvas;
  variant?: CampaignChannelVariant;
  error?: string;
  extra?: Record<string, unknown>;
};

/** Execute a distribution graph action and refresh node liveStatus */
export function runDistributionAction(opts: {
  canvasId: string;
  action: DistributionActionId;
  variantId?: string;
  channelId?: string;
  campaignId?: string;
  businessId: string;
  source?: CampaignSource;
  scheduledAt?: string;
  decision?: "approve" | "reject";
}): DistributionActionResult {
  const canvas = requireCanvas(opts.canvasId);

  if (opts.action === "create_variant") {
    if (!opts.campaignId || !opts.channelId || !opts.source) {
      return {
        ok: false,
        action: opts.action,
        error: "campaignId, channelId, and source required",
      };
    }
    const graph = buildCampaignDistributionGraph({
      businessId: opts.businessId,
      campaignId: opts.campaignId,
      campaignTitle: opts.source.title,
      channelIds: [opts.channelId],
      source: opts.source,
      canvasId: opts.canvasId,
    });
    return {
      ok: true,
      action: opts.action,
      canvas: graph.canvas,
      variant: graph.variants[0],
    };
  }

  if (!opts.variantId) {
    return { ok: false, action: opts.action, error: "variantId required" };
  }

  let variant: CampaignChannelVariant | undefined;
  let extra: Record<string, unknown> | undefined;

  switch (opts.action) {
    case "adapt": {
      if (!opts.source) {
        return { ok: false, action: opts.action, error: "source required" };
      }
      const r = reAdaptVariant(opts.variantId, opts.source);
      if (!r.ok) return { ok: false, action: opts.action, error: r.error };
      variant = r.data;
      break;
    }
    case "approve": {
      const r = approveVariant(opts.variantId, opts.decision ?? "approve");
      if (!r.ok) return { ok: false, action: opts.action, error: r.error };
      variant = r.data;
      break;
    }
    case "schedule": {
      if (!opts.scheduledAt) {
        return { ok: false, action: opts.action, error: "scheduledAt required" };
      }
      const r = scheduleVariant(opts.variantId, opts.scheduledAt);
      if (!r.ok) return { ok: false, action: opts.action, error: r.error };
      variant = r.data;
      break;
    }
    case "publish": {
      const r = publishVariantMock(opts.variantId);
      if (!r.ok) return { ok: false, action: opts.action, error: r.error };
      variant = r.data;
      break;
    }
    case "retry": {
      const r = retryVariant(opts.variantId);
      if (!r.ok) return { ok: false, action: opts.action, error: r.error };
      variant = r.data;
      break;
    }
    case "open_provider": {
      const r = openProviderComposer(opts.variantId);
      if (!r.ok) return { ok: false, action: opts.action, error: r.error };
      extra = r.data;
      break;
    }
    case "performance": {
      const r = refreshVariantAnalytics(opts.variantId);
      if (!r.ok) return { ok: false, action: opts.action, error: r.error };
      variant = r.data;
      extra = { analytics: r.data.analytics };
      break;
    }
    default:
      return { ok: false, action: opts.action, error: "unknown action" };
  }

  const node = canvas.nodes.find(
    (n) => n.data?.variantId === opts.variantId || n.linked?.id === opts.variantId
  );
  if (node && variant) {
    updateNode(opts.canvasId, node.id, {
      label: `${variant.channelId} · ${variant.status}`,
      liveStatus: variant.status,
      data: {
        ...node.data,
        variantId: variant.id,
        channelId: variant.channelId,
        publishPath: variant.readiness.publishPath,
        externalPostId: variant.externalPostId,
      },
    });
  }

  return {
    ok: true,
    action: opts.action,
    canvas: requireCanvas(opts.canvasId),
    variant,
    extra,
  };
}

/** Sync liveStatus on all channel_variant nodes from variant store */
export function syncDistributionGraphStatus(
  canvasId: string,
  businessId: string,
  campaignId: string
): TapCanvas {
  const canvas = requireCanvas(canvasId);
  const variants = listVariants(businessId, { campaignId });
  const byId = new Map(variants.map((v) => [v.id, v]));
  for (const node of canvas.nodes) {
    if (node.kind !== "channel_variant") continue;
    const vid = (node.data?.variantId as string) ?? node.linked?.id;
    if (!vid) continue;
    const v = byId.get(vid);
    if (!v) continue;
    updateNode(canvasId, node.id, {
      label: `${v.channelId} · ${v.status}`,
      liveStatus: v.status,
    });
  }
  return requireCanvas(canvasId);
}

export function publishDistributionWithIsolation(opts: {
  businessId: string;
  campaignId: string;
  canvasId?: string;
  forceFailChannels?: string[];
}) {
  const result = publishCampaignChannels({
    businessId: opts.businessId,
    campaignId: opts.campaignId,
    forceFailChannels: opts.forceFailChannels,
  });
  if (opts.canvasId && result.ok) {
    syncDistributionGraphStatus(opts.canvasId, opts.businessId, opts.campaignId);
  }
  return result;
}

/** Catalog of distribution actions for UI / API discovery */
export const DISTRIBUTION_ACTIONS: Array<{
  id: DistributionActionId;
  label: string;
  description: string;
}> = [
  {
    id: "create_variant",
    label: "Create variant",
    description: "Create a channel-native campaign variant node",
  },
  {
    id: "adapt",
    label: "Adapt",
    description: "Re-adapt copy/media/dimensions for the channel",
  },
  {
    id: "approve",
    label: "Approve",
    description: "Approve or reject the variant for publish",
  },
  {
    id: "schedule",
    label: "Schedule",
    description: "Schedule publish when channel supports it",
  },
  {
    id: "publish",
    label: "Publish (mock)",
    description: "Run mock publish path for this channel",
  },
  {
    id: "retry",
    label: "Retry",
    description: "Retry a failed channel without affecting others",
  },
  {
    id: "open_provider",
    label: "Open provider",
    description: "Open composer / manual checklist for the provider",
  },
  {
    id: "performance",
    label: "Performance",
    description: "Refresh analytics / attribution stubs",
  },
];
