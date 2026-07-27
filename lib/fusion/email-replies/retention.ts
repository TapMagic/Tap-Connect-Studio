/**
 * Retention / privacy boundaries for routed replies.
 */

export type RetentionPolicy = {
  retainInitialReplyDays: number;
  retainAttachmentsDays: number;
  ingestExternalMailbox: false;
  importHistoricalEmail: false;
  collectContinuingExternalThread: false;
};

export const DEFAULT_ROUTING_RETENTION: RetentionPolicy = {
  retainInitialReplyDays: 365,
  retainAttachmentsDays: 30,
  ingestExternalMailbox: false,
  importHistoricalEmail: false,
  collectContinuingExternalThread: false,
};

export function attachmentExpired(
  receivedAt: Date,
  now = new Date(),
  retainDays = DEFAULT_ROUTING_RETENTION.retainAttachmentsDays
): boolean {
  const ms = retainDays * 24 * 60 * 60 * 1000;
  return now.getTime() - receivedAt.getTime() > ms;
}

export function retentionHostCopy(mode: string): string {
  if (mode === "DIRECT_EXTERNAL") {
    return "Tap retains no inbound reply body because Tap never receives it.";
  }
  return "TapConnect retains the initial reply for context, evidence, and recovery according to your policy. Continuing external-thread content is not collected.";
}
