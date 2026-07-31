import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isLocalDevAuthEnabled } from "@/lib/config/local-dev";
import { prisma } from "@/lib/db";
import { isClerkConfigured } from "@/lib/utils/app";
import { ensureLocalControlFixtures } from "@/lib/control/bootstrap";
import { controlEnvironment } from "@/lib/control/environment";
import {
  isPlatformPermission,
  resolveEffectivePermission,
  type PermissionAssignment,
  type PlatformPermission,
} from "@/lib/control/permissions";

export type ExternalIdentity = {
  externalUserId: string;
  displayName: string;
  primaryEmail: string;
  imageUrl: string | null;
  locale: string;
  adapter: "clerk" | "local";
  recentAuthentication: boolean;
};

export interface IdentityAdapter {
  readonly kind: ExternalIdentity["adapter"];
  resolve(): Promise<ExternalIdentity | null>;
}

export class ClerkIdentityAdapter implements IdentityAdapter {
  readonly kind = "clerk" as const;

  async resolve(): Promise<ExternalIdentity | null> {
    if (!isClerkConfigured()) return null;
    const session = await auth();
    if (!session.userId) return null;
    const user = await currentUser();
    if (!user) return null;
    const email =
      user.emailAddresses.find(
        (candidate) => candidate.id === user.primaryEmailAddressId,
      )?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      `${session.userId}@clerk.invalid`;
    return {
      externalUserId: session.userId,
      displayName:
        [user.firstName, user.lastName].filter(Boolean).join(" ") || email,
      primaryEmail: email.trim().toLowerCase(),
      imageUrl: user.imageUrl || null,
      locale: "en-US",
      adapter: "clerk",
      recentAuthentication: true,
    };
  }
}

export class LocalDevelopmentIdentityAdapter implements IdentityAdapter {
  readonly kind = "local" as const;

  async resolve(): Promise<ExternalIdentity | null> {
    if (!isLocalDevAuthEnabled()) return null;
    const cookieStore = await cookies();
    const requested =
      cookieStore.get("tapconnect_control_identity")?.value ??
      process.env.TAPCONNECT_DEV_IDENTITY ??
      "rich";
    const key = ["rich", "daniel", "visitor"].includes(requested.toLowerCase())
      ? requested.toLowerCase()
      : "rich";
    if (key === "visitor") {
      return {
        externalUserId: "local:visitor",
        displayName: "Unauthorized Fixture",
        primaryEmail: "unauthorized@tapconnect.local",
        imageUrl: null,
        locale: "en-US",
        adapter: "local",
        recentAuthentication: true,
      };
    }
    return key === "daniel"
      ? {
          externalUserId: "local:daniel",
          displayName: "Daniel",
          primaryEmail: "daniel@tapconnect.local",
          imageUrl: null,
          locale: "en-US",
          adapter: "local",
          recentAuthentication: true,
        }
      : {
          externalUserId: "local:rich",
          displayName: "Rich",
          primaryEmail: "rich@tapconnect.local",
          imageUrl: null,
          locale: "en-US",
          adapter: "local",
          recentAuthentication: true,
        };
  }
}

export async function resolveControlIdentity(): Promise<ExternalIdentity | null> {
  if (isLocalDevAuthEnabled()) {
    return new LocalDevelopmentIdentityAdapter().resolve();
  }
  if (!isClerkConfigured()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Control Room authentication is unavailable: Clerk configuration is required.",
      );
    }
    return null;
  }
  return new ClerkIdentityAdapter().resolve();
}

export type ControlActor = {
  id: string;
  clerkId: string;
  displayName: string;
  email: string;
  imageUrl: string | null;
  profilePhotoAlt: string | null;
  adapter: ExternalIdentity["adapter"];
  recentAuthentication: boolean;
  environment: string;
  permissions: PermissionAssignment[];
  roleNames: string[];
};

export async function getControlActor(): Promise<ControlActor | null> {
  if (isLocalDevAuthEnabled()) await ensureLocalControlFixtures();
  const identity = await resolveControlIdentity();
  if (!identity) return null;

  const user = await prisma.user.findUnique({
    where: { clerkId: identity.externalUserId },
    include: {
      platformRoleBindings: {
        include: { role: { include: { permissions: true } } },
      },
      platformDirectPermissions: true,
      profilePhoto: { select: { url: true, defaultAltText: true } },
    },
  });
  if (!user || user.platformStatus !== "ACTIVE") return null;

  const roleAssignments: PermissionAssignment[] =
    user.platformRoleBindings.flatMap((binding) =>
      binding.role.status === "ACTIVE"
        ? binding.role.permissions.map((permission) => ({
            permission: permission.permissionKey,
            effect: permission.effect,
            source: binding.role.name,
            environmentScope: binding.environmentScope,
            businessId: binding.businessId,
            startsAt: binding.startsAt,
            expiresAt: binding.expiresAt,
          }))
        : [],
    );
  const directAssignments: PermissionAssignment[] =
    user.platformDirectPermissions.map((permission) => ({
      permission: permission.permissionKey,
      effect: permission.effect,
      source: `Direct ${permission.effect.toLowerCase()}: ${permission.reason}`,
      environmentScope: permission.environmentScope,
      businessId: permission.businessId,
      startsAt: permission.startsAt,
      expiresAt: permission.expiresAt,
    }));

  return {
    id: user.id,
    clerkId: identity.externalUserId,
    displayName:
      user.displayName ||
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      identity.displayName,
    email: user.email,
    imageUrl: user.profilePhoto?.url ?? user.imageUrl ?? identity.imageUrl,
    profilePhotoAlt:
      user.profilePhotoAlt ?? user.profilePhoto?.defaultAltText ?? null,
    adapter: identity.adapter,
    recentAuthentication: identity.recentAuthentication,
    environment: controlEnvironment(),
    permissions: [...roleAssignments, ...directAssignments],
    roleNames: user.platformRoleBindings
      .filter((binding) => binding.role.status === "ACTIVE")
      .map((binding) => binding.role.name),
  };
}

export async function requireControlActor(
  permission: PlatformPermission = "platform.dashboard.view",
  businessId?: string | null,
): Promise<ControlActor> {
  const actor = await getControlActor();
  if (!actor) redirect("/control/unauthorized");
  const effective = resolveEffectivePermission({
    permission,
    assignments: actor.permissions,
    environment: actor.environment,
    businessId,
  });
  if (!effective.allowed) redirect("/control/unauthorized");
  return actor;
}

export function assertControlPermission(
  actor: ControlActor,
  permission: string,
  businessId?: string | null,
): void {
  if (!isPlatformPermission(permission)) throw new Error("Unknown platform permission.");
  const effective = resolveEffectivePermission({
    permission,
    assignments: actor.permissions,
    environment: actor.environment,
    businessId,
  });
  if (!effective.allowed) {
    throw new Error(`Forbidden: ${effective.explanation.join(" ")}`);
  }
}
