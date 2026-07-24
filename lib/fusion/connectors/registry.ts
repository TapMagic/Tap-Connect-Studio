/**
 * Provider-neutral connector contracts.
 * Productivity & Work Management lives in ./productivity (ExternalWorkItem + adapters).
 * TapCast channels (TikTok first-class + omnichannel registry) are media connectors.
 */

import {
  PRODUCTIVITY_PROVIDERS,
  type WorkCapability,
  type ExternalWorkItem as ProductivityWorkItem,
} from "./productivity/types";
import { productivityProviderLiveReady } from "./productivity/types";
import { evaluateTikTokReadiness } from "@/lib/fusion/tapcast/tiktok/readiness";
import {
  listTapCastChannels,
  channelLiveConfigured,
  getTapCastChannel,
} from "@/lib/fusion/tapcast/registry";

export type ConnectorCapability =
  | "oauth"
  | "import"
  | "export"
  | "sync"
  | "webhooks"
  | "create_task"
  | "update_task"
  | "comments"
  | "files"
  | WorkCapability
  | "direct_post"
  | "draft_upload"
  | "schedule_post"
  | "prepared_package"
  | "open_composer"
  | "messaging"
  | "community_ops";

/** @deprecated Prefer Productivity ExternalWorkItem — kept for Admin compatibility */
export type ExternalWorkItem = ProductivityWorkItem;

export type ConnectorDefinition = {
  id: string;
  name: string;
  category: "productivity" | "crm" | "comms" | "payments" | "media" | "other";
  categoryLabel?: string;
  capabilities: ConnectorCapability[];
  requiredEnvVars: string[];
  oauth?: boolean;
  documentation: string;
  kind?: string;
  supportsMock?: boolean;
};

function tapCastCapabilityMap(channelId: string): ConnectorCapability[] {
  const def = getTapCastChannel(channelId);
  if (!def) return [];
  const caps: ConnectorCapability[] = [];
  if (def.capabilities.oauth) caps.push("oauth");
  if (def.capabilities.publishPaths.includes("direct")) caps.push("direct_post");
  if (def.capabilities.publishPaths.includes("draft_upload")) caps.push("draft_upload");
  if (def.capabilities.scheduling) caps.push("schedule_post");
  if (def.capabilities.publishPaths.includes("prepared_package")) caps.push("prepared_package");
  if (def.capabilities.publishPaths.includes("open_composer")) caps.push("open_composer");
  if (def.capabilities.messaging) caps.push("messaging");
  if (def.capabilities.communityOps) caps.push("community_ops");
  if (def.capabilities.webhooks) caps.push("webhooks");
  return caps;
}

/** Full Productivity & Work Management catalog + TapCast channels projected into Admin Connectors */
export const CONNECTOR_DEFINITIONS: ConnectorDefinition[] = [
  ...PRODUCTIVITY_PROVIDERS.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.kind === "collab_chat" ? ("comms" as const) : ("productivity" as const),
    categoryLabel: p.categoryLabel,
    capabilities: p.capabilities as ConnectorCapability[],
    requiredEnvVars: p.requiredEnvVars,
    oauth: p.oauth,
    documentation: p.documentation,
    kind: p.kind,
    supportsMock: p.supportsMock,
  })),
  ...listTapCastChannels().map((c) => ({
    id: c.id,
    name: c.firstClass ? `${c.name} (TapCast)` : `TapCast · ${c.name}`,
    category: "media" as const,
    categoryLabel: `TapCast · ${c.categoryLabel}`,
    capabilities: tapCastCapabilityMap(c.id),
    requiredEnvVars: [...c.requiredEnvVars],
    oauth: c.capabilities.oauth,
    documentation: c.documentation,
    kind: "tapcast",
    supportsMock: c.supportsMock,
  })),
];

export function connectorReady(id: string): boolean {
  if (id === "tiktok") {
    return evaluateTikTokReadiness().liveConfigured;
  }
  const channel = getTapCastChannel(id);
  if (channel) {
    return channelLiveConfigured(channel);
  }
  return productivityProviderLiveReady(id);
}

export function listProductivityConnectorDefinitions(): ConnectorDefinition[] {
  return CONNECTOR_DEFINITIONS.filter(
    (c) => c.category === "productivity" || c.category === "comms"
  );
}

export function listTapCastConnectorDefinitions(): ConnectorDefinition[] {
  return CONNECTOR_DEFINITIONS.filter((c) => c.kind === "tapcast");
}
