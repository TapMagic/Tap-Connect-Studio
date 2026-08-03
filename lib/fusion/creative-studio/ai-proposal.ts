import { requireCurrentSelection, type SelectionAuthority, type SelectionRef } from "./selection-ref";

export const AI_PROTECTED_FIELDS = [
  "actionType",
  "href",
  "destination",
  "qrResourceId",
  "campaignId",
  "trackingName",
  "accessibleLabel",
  "scheduleId",
  "visibilityRule",
  "dataBinding",
  "consentBehavior",
] as const;

export type AiMutationProposal = Readonly<{
  id: string;
  scope: SelectionRef;
  summary: string;
  patch: Readonly<Record<string, unknown>>;
  createdAt: string;
}>;

export function applyAiProposal<T extends Record<string, unknown>>({
  value,
  proposal,
  authority,
  allowProtectedFields = [],
}: {
  value: T;
  proposal: AiMutationProposal;
  authority: SelectionAuthority;
  allowProtectedFields?: readonly (typeof AI_PROTECTED_FIELDS)[number][];
}): T {
  requireCurrentSelection(proposal.scope, authority);
  const allowed = new Set(allowProtectedFields);
  const protectedPatch = AI_PROTECTED_FIELDS.find(
    (field) => Object.hasOwn(proposal.patch, field) && !allowed.has(field)
  );
  if (protectedPatch) {
    throw new Error(`AI proposal cannot change protected field: ${protectedPatch}`);
  }
  return { ...value, ...proposal.patch };
}

