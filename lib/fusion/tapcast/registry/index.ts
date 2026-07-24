/**
 * Channel readiness probes — live always VERIFIED — CREDENTIALS REQUIRED until env present.
 */

import { DISPLAY_READINESS_LABEL } from "@/lib/fusion/readiness/display-status";
import { getTapCastChannel, listTapCastChannels, TAPCAST_CHANNELS } from "./channels";
import type { ChannelReadiness, TapCastChannelDefinition } from "./types";

export function missingEnvForChannel(def: TapCastChannelDefinition): string[] {
  return def.requiredEnvVars.filter((k) => !process.env[k]?.trim());
}

export function channelLiveConfigured(def: TapCastChannelDefinition): boolean {
  return missingEnvForChannel(def).length === 0;
}

export function evaluateChannelReadiness(
  channelId: string,
  connection?: { mode: "mock" | "live" } | null
): ChannelReadiness {
  const def = getTapCastChannel(channelId);
  if (!def) {
    return {
      channelId,
      displayStatus: "development",
      liveConfigured: false,
      missingEnvVars: [],
      oauthReady: false,
      mockReady: false,
      connected: false,
      note: `Unknown channel: ${channelId}`,
    };
  }
  const missing = missingEnvForChannel(def);
  const liveConfigured = missing.length === 0;
  return {
    channelId,
    displayStatus: "verified_credentials_required",
    liveConfigured,
    missingEnvVars: missing,
    oauthReady: def.capabilities.oauth ? liveConfigured : liveConfigured,
    mockReady: def.supportsMock,
    connected: Boolean(connection),
    connectionMode: connection?.mode,
    note: liveConfigured
      ? `${def.name}: live env present — still ${DISPLAY_READINESS_LABEL.verified_credentials_required} until owner certifies live publish.`
      : `${def.name}: mock OK. Live = ${DISPLAY_READINESS_LABEL.verified_credentials_required}. Missing: ${missing.join(", ") || "none"}.`,
  };
}

export function evaluateAllChannelReadiness(
  connections: Map<string, { mode: "mock" | "live" }>
): ChannelReadiness[] {
  return listTapCastChannels().map((c) =>
    evaluateChannelReadiness(c.id, connections.get(c.id) ?? null)
  );
}

export function registrySnapshot() {
  return {
    channelCount: TAPCAST_CHANNELS.length,
    byCategory: {
      publishing_social: listTapCastChannels("publishing_social").length,
      conversation_relationship: listTapCastChannels("conversation_relationship").length,
      community_ops: listTapCastChannels("community_ops").length,
    },
    firstClass: listTapCastChannels().filter((c) => c.firstClass).map((c) => c.id),
    liveClassificationLabel: DISPLAY_READINESS_LABEL.verified_credentials_required,
    channels: TAPCAST_CHANNELS.map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      categoryLabel: c.categoryLabel,
      firstClass: c.firstClass,
      href: c.href,
      supportsMock: c.supportsMock,
      liveClassification: c.liveClassification,
      requiredEnvVars: c.requiredEnvVars,
      missingEnvVars: missingEnvForChannel(c),
      liveConfigured: channelLiveConfigured(c),
      capabilities: c.capabilities,
      notes: c.notes,
      documentation: c.documentation,
    })),
  };
}

export * from "./types";
export * from "./channels";
