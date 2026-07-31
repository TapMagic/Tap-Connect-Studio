export const PLATFORM_PERMISSIONS = [
  "platform.dashboard.view",
  "users.view",
  "users.invite",
  "users.edit",
  "users.suspend",
  "users.archive",
  "users.delete_schedule",
  "users.sessions.view",
  "users.sessions.revoke",
  "users.roles.manage",
  "users.permissions.manage",
  "users.support_view",
  "users.support_impersonate",
  "businesses.view",
  "businesses.create",
  "businesses.edit",
  "businesses.members.manage",
  "businesses.restrict",
  "businesses.suspend",
  "businesses.archive",
  "businesses.delete_schedule",
  "businesses.legal_hold",
  "roles.view",
  "roles.create",
  "roles.edit",
  "roles.retire",
  "roles.assign",
  "entitlements.view",
  "entitlements.plan_manage",
  "entitlements.override",
  "entitlements.restrict",
  "entitlements.unlimited_grant",
  "demo.view",
  "demo.create",
  "demo.edit",
  "demo.clone",
  "demo.publish",
  "demo.rollback",
  "demo.bind_landing",
  "demo.reset",
  "demo.promote",
  "audit.view",
  "audit.export",
  "approvals.view",
  "approvals.request",
  "approvals.approve",
  "platform.settings.view",
  "platform.settings.manage",
  "platform.security_policy.manage",
] as const;

export type PlatformPermission = (typeof PLATFORM_PERMISSIONS)[number];
export type PermissionEffect = "ALLOW" | "DENY";

export type PermissionAssignment = {
  permission: string;
  effect: PermissionEffect;
  source: string;
  environmentScope?: string;
  businessId?: string | null;
  startsAt?: Date | string | null;
  expiresAt?: Date | string | null;
};

export type EffectivePermission = {
  permission: PlatformPermission;
  allowed: boolean;
  explanation: string[];
  sources: PermissionAssignment[];
};

const ALL = [...PLATFORM_PERMISSIONS];
const READ_ONLY = PLATFORM_PERMISSIONS.filter(
  (permission) =>
    permission.endsWith(".view") ||
    permission === "platform.dashboard.view" ||
    permission === "audit.view",
);

export const ROLE_TEMPLATES = [
  {
    key: "platform-owner",
    name: "Platform Owner",
    description: "Ultimate governed platform authority. Transfer requires approval.",
    protected: true,
    ownerRole: true,
    permissions: ALL,
  },
  {
    key: "platform-administrator",
    name: "Platform Administrator",
    description: "Administers implemented Control Room modules except Owner transfer.",
    protected: true,
    ownerRole: false,
    permissions: ALL.filter((permission) => permission !== "entitlements.unlimited_grant"),
  },
  {
    key: "platform-operator",
    name: "Platform Operator",
    description: "Operates users, workspaces, support, demos, and routine governance.",
    protected: true,
    ownerRole: false,
    permissions: ALL.filter(
      (permission) =>
        ![
          "entitlements.unlimited_grant",
          "platform.security_policy.manage",
          "audit.export",
          "approvals.approve",
        ].includes(permission),
    ),
  },
  {
    key: "support-administrator",
    name: "Support Administrator",
    description: "Diagnoses access and runs governed support sessions.",
    protected: true,
    ownerRole: false,
    permissions: [
      "platform.dashboard.view",
      "users.view",
      "users.sessions.view",
      "users.sessions.revoke",
      "users.support_view",
      "users.support_impersonate",
      "businesses.view",
      "audit.view",
    ],
  },
  {
    key: "billing-administrator",
    name: "Billing Administrator",
    description: "Manages service plans and governed entitlement adjustments.",
    protected: true,
    ownerRole: false,
    permissions: [
      "platform.dashboard.view",
      "businesses.view",
      "entitlements.view",
      "entitlements.plan_manage",
      "entitlements.override",
      "entitlements.restrict",
      "approvals.view",
      "approvals.request",
      "audit.view",
    ],
  },
  {
    key: "communications-administrator",
    name: "Communications Administrator",
    description: "Read-only platform communications readiness in this wave.",
    protected: true,
    ownerRole: false,
    permissions: ["platform.dashboard.view", "businesses.view", "audit.view"],
  },
  {
    key: "diagnostics-administrator",
    name: "Diagnostics Administrator",
    description: "Inspects platform condition, sessions, and entitlement diagnostics.",
    protected: true,
    ownerRole: false,
    permissions: [
      "platform.dashboard.view",
      "users.view",
      "users.sessions.view",
      "businesses.view",
      "entitlements.view",
      "audit.view",
      "platform.settings.view",
    ],
  },
  {
    key: "demo-manager",
    name: "Demo Manager",
    description: "Creates, reviews, publishes, resets, and binds safe demo workspaces.",
    protected: true,
    ownerRole: false,
    permissions: [
      "platform.dashboard.view",
      "businesses.view",
      "demo.view",
      "demo.create",
      "demo.edit",
      "demo.clone",
      "demo.publish",
      "demo.rollback",
      "demo.bind_landing",
      "demo.reset",
      "demo.promote",
      "audit.view",
      "approvals.view",
      "approvals.request",
    ],
  },
  {
    key: "read-only-analyst",
    name: "Read-Only Analyst",
    description: "Views permitted Control Room records without mutation authority.",
    protected: true,
    ownerRole: false,
    permissions: READ_ONLY,
  },
  {
    key: "auditor",
    name: "Auditor",
    description: "Reviews and exports approved audit and approval records.",
    protected: true,
    ownerRole: false,
    permissions: [
      "platform.dashboard.view",
      "users.view",
      "businesses.view",
      "roles.view",
      "entitlements.view",
      "demo.view",
      "audit.view",
      "audit.export",
      "approvals.view",
      "platform.settings.view",
    ],
  },
] as const;

function activeAt(
  assignment: PermissionAssignment,
  now: Date,
): boolean {
  const startsAt = assignment.startsAt ? new Date(assignment.startsAt) : null;
  const expiresAt = assignment.expiresAt ? new Date(assignment.expiresAt) : null;
  return (!startsAt || startsAt <= now) && (!expiresAt || expiresAt > now);
}

function scopeMatches(
  assignment: PermissionAssignment,
  environment: string,
  businessId?: string | null,
): boolean {
  const environmentMatches =
    !assignment.environmentScope ||
    assignment.environmentScope === "*" ||
    assignment.environmentScope === environment;
  const businessMatches =
    !assignment.businessId ||
    assignment.businessId === "*" ||
    assignment.businessId === businessId;
  return environmentMatches && businessMatches;
}

export function resolveEffectivePermission(input: {
  permission: PlatformPermission;
  assignments: PermissionAssignment[];
  environment: string;
  businessId?: string | null;
  now?: Date;
}): EffectivePermission {
  const now = input.now ?? new Date();
  const sources = input.assignments.filter(
    (assignment) =>
      assignment.permission === input.permission &&
      activeAt(assignment, now) &&
      scopeMatches(assignment, input.environment, input.businessId),
  );
  const denials = sources.filter((source) => source.effect === "DENY");
  const allows = sources.filter((source) => source.effect === "ALLOW");
  const allowed = denials.length === 0 && allows.length > 0;
  const explanation =
    denials.length > 0
      ? denials.map((source) => `Denied through ${source.source}`)
      : allows.length > 0
        ? allows.map((source) => `Allowed through ${source.source}`)
        : ["No applicable grant"];
  if (input.businessId) explanation.push(`Scoped evaluation for ${input.businessId}`);
  explanation.push(`Environment: ${input.environment}`);
  return { permission: input.permission, allowed, explanation, sources };
}

export function resolvePermissionSet(input: {
  assignments: PermissionAssignment[];
  environment: string;
  businessId?: string | null;
  now?: Date;
}): Map<PlatformPermission, EffectivePermission> {
  return new Map(
    PLATFORM_PERMISSIONS.map((permission) => [
      permission,
      resolveEffectivePermission({ permission, ...input }),
    ]),
  );
}

export function isPlatformPermission(value: string): value is PlatformPermission {
  return (PLATFORM_PERMISSIONS as readonly string[]).includes(value);
}

export function comparePermissionSets(
  left: Iterable<string>,
  right: Iterable<string>,
): { onlyLeft: string[]; onlyRight: string[]; shared: string[] } {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return {
    onlyLeft: [...leftSet].filter((permission) => !rightSet.has(permission)).sort(),
    onlyRight: [...rightSet].filter((permission) => !leftSet.has(permission)).sort(),
    shared: [...leftSet].filter((permission) => rightSet.has(permission)).sort(),
  };
}
