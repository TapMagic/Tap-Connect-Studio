export const APPROVAL_REQUIRED_ACTIONS = {
  "platform_owner.transfer": "Platform Owner",
  "business.delete_permanent": "Platform Owner",
  "entitlement.grant_unlimited": "Platform Owner",
  "legal_hold.remove": "Platform Owner",
  "demo.bind_landing": "Platform Administrator",
} as const;

export function approvalDecisionAllowed(input: {
  requesterId: string;
  approverId: string;
  separationRequired: boolean;
  status: string;
  expiresAt: Date | string;
  now?: Date;
}): { allowed: boolean; reason: string } {
  if (input.status !== "PENDING") {
    return { allowed: false, reason: "Only pending requests can be decided." };
  }
  if (new Date(input.expiresAt) <= (input.now ?? new Date())) {
    return { allowed: false, reason: "The approval request has expired." };
  }
  if (input.separationRequired && input.requesterId === input.approverId) {
    return { allowed: false, reason: "Separation of duties prevents self-approval." };
  }
  return { allowed: true, reason: "Approval decision is permitted." };
}

