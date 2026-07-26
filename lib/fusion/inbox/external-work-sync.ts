/**
 * Bi-directional ExternalWorkItem ↔ TapCase reconciliation contract.
 * Mock adapters stay honest — never claim live monday.com sync when mock.
 */

import type { ExternalWorkItem } from "@/lib/fusion/connectors/productivity/types";
import {
  applyExternalResolution,
  linkExternalWork,
  parseCaseMetadata,
  type CaseExternalWorkLink,
  type TapCaseMetadata,
} from "@/lib/fusion/inbox/case-metadata";

export type ExternalSyncDirection = "tap_to_external" | "external_to_tap";

export type ExternalSyncResult = {
  ok: boolean;
  direction: ExternalSyncDirection;
  mode: "mock" | "live";
  caseMeta: TapCaseMetadata;
  suggestReadyToClose?: boolean;
  autoClose?: boolean;
  error?: string;
  message: string;
};

export function externalWorkLinkFromItem(
  item: ExternalWorkItem,
  mode: "mock" | "live"
): CaseExternalWorkLink {
  return {
    provider: item.provider,
    workspaceExternalId: item.workspaceExternalId,
    projectExternalId: item.projectExternalId,
    externalId: item.externalId,
    deepLink: item.url,
    status: item.status,
    assignee: item.assigneeExternalIds?.[0],
    priority: typeof item.priority === "string" ? item.priority : undefined,
    dueAt: item.dueAt ?? null,
    lastSyncAt: new Date().toISOString(),
    syncHealth: mode === "mock" ? "mock" : "ok",
    conflict: null,
    error: null,
    retryCount: 0,
    mode,
    autoCloseOnExternalResolve: false,
  };
}

/** TapCase created/updated an external item */
export function syncCaseToExternal(input: {
  caseMeta: unknown;
  item: ExternalWorkItem;
  mode: "mock" | "live";
}): ExternalSyncResult {
  const meta = linkExternalWork(
    parseCaseMetadata(input.caseMeta),
    externalWorkLinkFromItem(input.item, input.mode)
  );
  return {
    ok: true,
    direction: "tap_to_external",
    mode: input.mode,
    caseMeta: meta,
    message:
      input.mode === "live"
        ? `Case linked to ${input.item.provider}`
        : `Case linked to mock ${input.item.provider} item (not live sync)`,
  };
}

/** External status/assignee update flows into TapCase */
export function syncExternalToCase(input: {
  caseMeta: unknown;
  externalStatus: string;
  assignee?: string;
  mode: "mock" | "live";
  autoCloseConfigured?: boolean;
}): ExternalSyncResult {
  const base = parseCaseMetadata(input.caseMeta);
  if (!base.externalWork) {
    return {
      ok: false,
      direction: "external_to_tap",
      mode: input.mode,
      caseMeta: base,
      error: "no_external_link",
      message: "This case is not linked to an external work item yet.",
    };
  }

  const withStatus: TapCaseMetadata = {
    ...base,
    externalWork: {
      ...base.externalWork,
      status: input.externalStatus,
      assignee: input.assignee ?? base.externalWork.assignee,
      lastSyncAt: new Date().toISOString(),
      syncHealth: input.mode === "mock" ? "mock" : "ok",
      mode: input.mode,
    },
  };

  const resolved = applyExternalResolution(withStatus, {
    status: input.externalStatus,
    autoCloseConfigured: input.autoCloseConfigured,
  });

  return {
    ok: true,
    direction: "external_to_tap",
    mode: input.mode,
    caseMeta: resolved.meta,
    suggestReadyToClose: resolved.suggestReadyToClose,
    autoClose: resolved.autoClose,
    message: resolved.autoClose
      ? "External item resolved — case marked for automatic close (configured)."
      : resolved.suggestReadyToClose
        ? "External item resolved — case is Ready to close (confirm before closing)."
        : `Synced external status (${input.externalStatus}).`,
  };
}

export function describeSyncHealth(link: CaseExternalWorkLink | null | undefined): string {
  if (!link) return "Not linked to an external work system";
  if (link.mode === "mock" || link.syncHealth === "mock") {
    return `Mock ${link.provider} — not live sync`;
  }
  if (link.syncHealth === "error") {
    return `Sync error${link.error ? `: ${link.error}` : ""}`;
  }
  if (link.syncHealth === "disconnected") return `${link.provider} disconnected`;
  if (link.conflict) return `Conflict: ${link.conflict}`;
  return `${link.provider} · last sync ${link.lastSyncAt ? new Date(link.lastSyncAt).toLocaleString() : "—"}`;
}
