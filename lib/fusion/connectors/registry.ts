/**
 * Provider-neutral connector contracts.
 * Productivity & Work Management lives in ./productivity (ExternalWorkItem + adapters).
 * TapCast TikTok is a media connector (mock OK / live credentials required).
 */

import {
  PRODUCTIVITY_PROVIDERS,
  type WorkCapability,
  type ExternalWorkItem as ProductivityWorkItem,
} from "./productivity/types";
import { productivityProviderLiveReady } from "./productivity/types";
import { evaluateTikTokReadiness } from "@/lib/fusion/tapcast/tiktok/readiness";

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
  | "schedule_post";

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

/** Full Productivity & Work Management catalog projected into Admin Connectors */
export const CONNECTOR_DEFINITIONS: ConnectorDefinition[] = [
  ...PRODUCTIVITY_PROVIDERS.map(
    (p) => ({
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
    })
  ),
  {
    id: "tiktok",
    name: "TikTok (TapCast)",
    category: "media",
    categoryLabel: "TapCast · Social",
    capabilities: ["oauth", "draft_upload", "direct_post", "schedule_post"],
    requiredEnvVars: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
    oauth: true,
    documentation: "Experiences → TapCast → TikTok",
    kind: "tapcast",
    supportsMock: true,
  },
];

export function connectorReady(id: string): boolean {
  if (id === "tiktok") {
    return evaluateTikTokReadiness().liveConfigured;
  }
  return productivityProviderLiveReady(id);
}

export function listProductivityConnectorDefinitions(): ConnectorDefinition[] {
  return CONNECTOR_DEFINITIONS.filter((c) => c.category === "productivity" || c.category === "comms");
}
