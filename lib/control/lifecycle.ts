export type LifecycleDecision = { allowed: boolean; reason: string };

const INVITATION_TRANSITIONS: Record<string, Set<string>> = {
  DRAFT: new Set(["SENT", "REVOKED", "EXPIRED"]),
  SENT: new Set(["VIEWED", "ACCEPTED", "REVOKED", "EXPIRED", "FAILED"]),
  VIEWED: new Set(["ACCEPTED", "REVOKED", "EXPIRED", "FAILED"]),
  FAILED: new Set(["SENT", "REVOKED", "EXPIRED"]),
  EXPIRED: new Set(["SENT"]),
  REVOKED: new Set(),
  ACCEPTED: new Set(),
};

export function invitationTransition(from: string, to: string): LifecycleDecision {
  return INVITATION_TRANSITIONS[from]?.has(to)
    ? { allowed: true, reason: `${from} may transition to ${to}.` }
    : { allowed: false, reason: `${from} cannot transition to ${to}.` };
}

const BUSINESS_TRANSITIONS: Record<string, Set<string>> = {
  PROVISIONING: new Set(["TRIAL", "ACTIVE", "CANCELLED"]),
  TRIAL: new Set(["ACTIVE", "PAST_DUE", "CANCELLED", "SUSPENDED"]),
  ACTIVE: new Set(["PAST_DUE", "RESTRICTED", "SUSPENDED", "ARCHIVED", "DELETION_SCHEDULED", "LEGAL_HOLD"]),
  PAST_DUE: new Set(["ACTIVE", "RESTRICTED", "SUSPENDED", "CANCELLED"]),
  RESTRICTED: new Set(["ACTIVE", "SUSPENDED", "ARCHIVED", "DELETION_SCHEDULED", "LEGAL_HOLD"]),
  SUSPENDED: new Set(["ACTIVE", "ARCHIVED", "DELETION_SCHEDULED", "LEGAL_HOLD"]),
  CANCELLED: new Set(["ARCHIVED", "DELETION_SCHEDULED", "LEGAL_HOLD"]),
  ARCHIVED: new Set(["ACTIVE", "DELETION_SCHEDULED", "LEGAL_HOLD"]),
  DELETION_SCHEDULED: new Set(["ACTIVE", "ARCHIVED", "DELETED", "LEGAL_HOLD"]),
  LEGAL_HOLD: new Set(["ACTIVE", "ARCHIVED"]),
  DELETED: new Set(),
};

export function businessLifecycleTransition(input: {
  from: string;
  to: string;
  hasLegalHold: boolean;
  gracePeriodComplete?: boolean;
  secondApproval?: boolean;
  recentAuthentication?: boolean;
}): LifecycleDecision {
  if (input.hasLegalHold && ["DELETION_SCHEDULED", "DELETED"].includes(input.to)) {
    return { allowed: false, reason: "Legal hold blocks destructive deletion." };
  }
  if (!BUSINESS_TRANSITIONS[input.from]?.has(input.to)) {
    return { allowed: false, reason: `${input.from} cannot transition to ${input.to}.` };
  }
  if (input.to === "DELETED") {
    if (!input.gracePeriodComplete) return { allowed: false, reason: "Deletion grace period is incomplete." };
    if (!input.recentAuthentication) return { allowed: false, reason: "Recent authentication is required." };
    if (!input.secondApproval) return { allowed: false, reason: "A second approval is required." };
  }
  return { allowed: true, reason: `${input.from} may transition to ${input.to}.` };
}

export function sandboxAccessDecision(input: {
  sandboxOwnerId: string;
  actorId: string;
  explicitlyInvited: boolean;
  governedSupportSession: boolean;
}): LifecycleDecision {
  if (input.sandboxOwnerId === input.actorId) {
    return { allowed: true, reason: "The administrator owns this private sandbox." };
  }
  if (input.explicitlyInvited) {
    return { allowed: true, reason: "The administrator has an explicit sandbox membership." };
  }
  if (input.governedSupportSession) {
    return { allowed: true, reason: "A governed and audited support action permits temporary access." };
  }
  return { allowed: false, reason: "Private sandboxes are isolated by default." };
}

export function permanentDeletionDecision(input: {
  legalHold: boolean;
  gracePeriodComplete: boolean;
  recentAuthentication: boolean;
  typedConfirmation: boolean;
  secondApproval: boolean;
}): LifecycleDecision {
  if (input.legalHold) return { allowed: false, reason: "Legal hold blocks deletion." };
  if (!input.gracePeriodComplete) return { allowed: false, reason: "Grace period is incomplete." };
  if (!input.recentAuthentication) return { allowed: false, reason: "Recent authentication is required." };
  if (!input.typedConfirmation) return { allowed: false, reason: "Typed confirmation is required." };
  if (!input.secondApproval) return { allowed: false, reason: "Second approval is required." };
  return { allowed: true, reason: "Governed permanent deletion checks passed." };
}

