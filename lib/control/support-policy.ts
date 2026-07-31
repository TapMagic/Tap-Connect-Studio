export const SUPPORT_SESSION_BLOCKED_ACTIONS = new Set([
  "roles.assign",
  "users.permissions.manage",
  "payment.change",
  "refund.create",
  "deletion.permanent",
  "audit.export_sensitive",
  "campaign.send",
  "email.send",
  "publication.publish",
  "tap_point.assign",
  "credential.change",
  "demo.bind_landing",
]);

export function supportSessionAllows(action: string): {
  allowed: boolean;
  reason: string;
} {
  if (SUPPORT_SESSION_BLOCKED_ACTIONS.has(action)) {
    return {
      allowed: false,
      reason: "Blocked while acting in a Support Session.",
    };
  }
  return { allowed: true, reason: "Permitted within the governed support scope." };
}

export function supportSessionIsActive(
  session: { status: string; expiresAt: Date | string },
  now = new Date(),
): boolean {
  return session.status === "ACTIVE" && new Date(session.expiresAt) > now;
}

