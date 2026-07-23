/**
 * Studio permission matrix — documents who can run which fusion actions.
 * Used by Admin UI and unit tests; not a substitute for Clerk role checks.
 */

export type StudioRole = "owner" | "admin" | "editor" | "viewer" | "platform_admin";

export type PermissionAction =
  | "campaign.publish"
  | "journey.publish"
  | "journey.activate"
  | "autopilot.generate"
  | "autopilot.apply"
  | "loyalty.award"
  | "inbox.reply"
  | "wallet.issue"
  | "outbox.retry"
  | "feature.override"
  | "audit.read"
  | "billing.manage";

const MATRIX: Record<PermissionAction, StudioRole[]> = {
  "campaign.publish": ["owner", "admin", "editor"],
  "journey.publish": ["owner", "admin", "editor"],
  "journey.activate": ["owner", "admin"],
  "autopilot.generate": ["owner", "admin", "editor"],
  "autopilot.apply": ["owner", "admin", "editor"],
  "loyalty.award": ["owner", "admin", "editor"],
  "inbox.reply": ["owner", "admin", "editor"],
  "wallet.issue": ["owner", "admin"],
  "outbox.retry": ["owner", "admin", "platform_admin"],
  "feature.override": ["platform_admin"],
  "audit.read": ["owner", "admin", "platform_admin"],
  "billing.manage": ["owner", "platform_admin"],
};

export function rolesAllowedFor(action: PermissionAction): StudioRole[] {
  return [...MATRIX[action]];
}

export function roleCan(role: StudioRole, action: PermissionAction): boolean {
  if (role === "platform_admin") {
    return (
      MATRIX[action].includes("platform_admin") ||
      action === "audit.read" ||
      action === "feature.override" ||
      action === "outbox.retry"
    );
  }
  return MATRIX[action].includes(role);
}

export function listPermissionMatrix(): Array<{
  action: PermissionAction;
  roles: StudioRole[];
}> {
  return (Object.keys(MATRIX) as PermissionAction[]).map((action) => ({
    action,
    roles: rolesAllowedFor(action),
  }));
}
