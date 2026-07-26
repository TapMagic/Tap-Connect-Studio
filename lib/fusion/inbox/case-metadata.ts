/**
 * TapCase metadata helpers — internal notes never go to the customer.
 * External work link lives on the case for bi-directional sync.
 */

export type CaseInternalNote = {
  id: string;
  body: string;
  authorId?: string | null;
  authorLabel?: string;
  createdAt: string;
  /** Always true — notes are operator-only */
  internal: true;
};

export type CaseExternalWorkLink = {
  provider: string;
  workspaceExternalId?: string;
  projectExternalId?: string;
  externalId: string;
  deepLink?: string;
  status?: string;
  assignee?: string;
  priority?: string;
  dueAt?: string | null;
  lastSyncAt?: string;
  syncHealth: "ok" | "degraded" | "error" | "disconnected" | "mock";
  conflict?: string | null;
  error?: string | null;
  retryCount?: number;
  mode: "mock" | "live";
  autoCloseOnExternalResolve?: boolean;
};

export type TapCaseMetadata = {
  waitKind?: "customer" | "internal";
  readyToClose?: boolean;
  dueAt?: string | null;
  category?: string;
  sourceCard?: string;
  sourceTapPoint?: string;
  sourceCampaign?: string;
  internalNotes?: CaseInternalNote[];
  externalWork?: CaseExternalWorkLink | null;
  audit?: { at: string; action: string; by?: string; reason?: string }[];
  seeded?: boolean;
  testGenerated?: boolean;
};

export function parseCaseMetadata(raw: unknown): TapCaseMetadata {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as TapCaseMetadata;
}

export function appendInternalNote(
  meta: TapCaseMetadata,
  note: Omit<CaseInternalNote, "internal">
): TapCaseMetadata {
  const entry: CaseInternalNote = { ...note, internal: true };
  return {
    ...meta,
    internalNotes: [...(meta.internalNotes ?? []), entry],
  };
}

/** Strip internal notes before any customer-visible projection. */
export function customerSafeCaseProjection(meta: TapCaseMetadata): Omit<
  TapCaseMetadata,
  "internalNotes"
> {
  const { internalNotes, ...rest } = meta;
  void internalNotes;
  return rest;
}

export function linkExternalWork(
  meta: TapCaseMetadata,
  link: CaseExternalWorkLink
): TapCaseMetadata {
  return {
    ...meta,
    externalWork: link,
    audit: [
      ...(meta.audit ?? []),
      {
        at: new Date().toISOString(),
        action: "external_work_linked",
        reason: `${link.provider} · ${link.mode}`,
      },
    ],
  };
}

export function applyExternalResolution(
  meta: TapCaseMetadata,
  input: { status: string; autoCloseConfigured?: boolean }
): { meta: TapCaseMetadata; suggestReadyToClose: boolean; autoClose: boolean } {
  const resolved =
    /done|complete|closed|resolved/i.test(input.status) ||
    input.status.toLowerCase() === "resolved";
  if (!resolved) {
    return { meta, suggestReadyToClose: false, autoClose: false };
  }
  const autoClose = Boolean(
    input.autoCloseConfigured && meta.externalWork?.autoCloseOnExternalResolve
  );
  return {
    meta: {
      ...meta,
      readyToClose: true,
      externalWork: meta.externalWork
        ? {
            ...meta.externalWork,
            status: input.status,
            lastSyncAt: new Date().toISOString(),
            syncHealth: meta.externalWork.mode === "mock" ? "mock" : "ok",
          }
        : meta.externalWork,
      audit: [
        ...(meta.audit ?? []),
        {
          at: new Date().toISOString(),
          action: autoClose ? "external_resolve_auto_close" : "external_resolve_ready",
          reason: input.status,
        },
      ],
    },
    suggestReadyToClose: !autoClose,
    autoClose,
  };
}
