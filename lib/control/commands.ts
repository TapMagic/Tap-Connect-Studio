import type { PlatformPermission } from "@/lib/control/permissions";

export type ControlCommand = {
  id: string;
  label: string;
  description: string;
  href?: string;
  prepareAction?: string;
  requiredPermission: PlatformPermission;
  consequential: boolean;
};

export const CONTROL_COMMANDS: ControlCommand[] = [
  {
    id: "users",
    label: "Open Users & Administrators",
    description: "Search profiles, sessions, memberships, and lifecycle.",
    href: "/control?section=users",
    requiredPermission: "users.view",
    consequential: false,
  },
  {
    id: "suspended-businesses",
    label: "Find suspended businesses",
    description: "Open the business directory with the suspended filter prepared.",
    href: "/control?section=businesses&state=SUSPENDED",
    requiredPermission: "businesses.view",
    consequential: false,
  },
  {
    id: "expiring-grants",
    label: "Show expiring grants",
    description: "Inspect entitlement grants with upcoming expiration.",
    href: "/control?section=entitlements&filter=expiring",
    requiredPermission: "entitlements.view",
    consequential: false,
  },
  {
    id: "landing-binding",
    label: "View current landing-page Demo binding",
    description: "Open the Demo Studio landing binding inspector.",
    href: "/control?section=demo&panel=landing-binding",
    requiredPermission: "demo.view",
    consequential: false,
  },
  {
    id: "support-sessions",
    label: "Find active Support Sessions",
    description: "Open governed support access and session expiry.",
    href: "/control?section=support&status=ACTIVE",
    requiredPermission: "users.support_view",
    consequential: false,
  },
  {
    id: "invite-admin",
    label: "Invite administrator",
    description: "Prepare the invitation drawer; review is required before sending.",
    prepareAction: "invite-administrator",
    requiredPermission: "users.invite",
    consequential: true,
  },
  {
    id: "create-demo",
    label: "Create demo workspace",
    description: "Prepare a safe demo workspace; no external effects are enabled.",
    prepareAction: "create-demo",
    requiredPermission: "demo.create",
    consequential: true,
  },
  {
    id: "grant-service",
    label: "Grant a service",
    description: "Prepare a governed entitlement override with reason and expiration.",
    prepareAction: "grant-service",
    requiredPermission: "entitlements.override",
    consequential: true,
  },
];

export function availableCommands(
  allowedPermissions: Set<string>,
): ControlCommand[] {
  return CONTROL_COMMANDS.filter((command) =>
    allowedPermissions.has(command.requiredPermission),
  );
}

export function executeCommand(command: ControlCommand):
  | { kind: "navigate"; href: string }
  | { kind: "prepare"; action: string } {
  if (command.consequential) {
    if (!command.prepareAction) throw new Error("Consequential commands must prepare an action.");
    return { kind: "prepare", action: command.prepareAction };
  }
  if (!command.href) throw new Error("Navigation command is missing its route.");
  return { kind: "navigate", href: command.href };
}

