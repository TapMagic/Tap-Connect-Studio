import type { UserRole } from "@prisma/client";
import { requireBusiness } from "@/lib/auth";

export type BusinessCapability =
  | "onboarding.read"
  | "onboarding.edit"
  | "knowledge.propose"
  | "knowledge.approve"
  | "brand.propose"
  | "brand.approve"
  | "brand.lock"
  | "card.draft.edit"
  | "card.publish"
  | "preview.mutate";

const CAPABILITIES: Record<UserRole, ReadonlySet<BusinessCapability>> = {
  OWNER: new Set([
    "onboarding.read",
    "onboarding.edit",
    "knowledge.propose",
    "knowledge.approve",
    "brand.propose",
    "brand.approve",
    "brand.lock",
    "card.draft.edit",
    "card.publish",
    "preview.mutate",
  ]),
  MANAGER: new Set([
    "onboarding.read",
    "onboarding.edit",
    "knowledge.propose",
    "knowledge.approve",
    "brand.propose",
    "brand.approve",
    "brand.lock",
    "card.draft.edit",
    "card.publish",
    "preview.mutate",
  ]),
  MARKETING: new Set([
    "onboarding.read",
    "onboarding.edit",
    "knowledge.propose",
    "brand.propose",
    "card.draft.edit",
    "card.publish",
    "preview.mutate",
  ]),
  VIEWER: new Set(["onboarding.read"]),
  STAFF_SCANNER: new Set(),
};

export class BusinessCapabilityError extends Error {
  readonly status = 403;

  constructor(readonly capability: BusinessCapability) {
    super(`This role cannot perform ${capability}.`);
    this.name = "BusinessCapabilityError";
  }
}

export function roleHasBusinessCapability(
  role: UserRole,
  capability: BusinessCapability
): boolean {
  return CAPABILITIES[role].has(capability);
}

export async function requireBusinessCapability(capability: BusinessCapability) {
  const context = await requireBusiness();
  const membership = context.user.memberships.find(
    (candidate) => candidate.businessId === context.business.id
  );
  if (!membership || !roleHasBusinessCapability(membership.role, capability)) {
    throw new BusinessCapabilityError(capability);
  }
  return { ...context, membership };
}
