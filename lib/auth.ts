import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { isLocalDevAuthEnabled } from "@/lib/config/local-dev";
import { isClerkConfigured } from "@/lib/utils/app";
import { isPlatformAdminEmail, normalizeEmail } from "@/lib/config/admins";
import {
  ensureAdminWorkspace,
  postAuthPath,
} from "@/lib/services/admins";
import { postAuthDestination } from "@/lib/fusion/auth/post-auth-destination";
import type { Business, BusinessUser, User } from "@prisma/client";
import { cookies } from "next/headers";
import { ensureLocalControlFixtures } from "@/lib/control/bootstrap";
import { resolveControlIdentity } from "@/lib/control/identity";
import { WORKSPACE_COOKIE } from "@/lib/workspace/context";

export type SessionUser = User & {
  memberships: (BusinessUser & { business: Business })[];
};

const DEV_USER_EMAIL = "dev@tapconnect.local";

async function getOrCreateDevUser(): Promise<SessionUser> {
  const user = await prisma.user.upsert({
    where: { email: DEV_USER_EMAIL },
    create: {
      email: DEV_USER_EMAIL,
      firstName: "Dev",
      lastName: "Owner",
    },
    update: {},
    include: { memberships: { include: { business: true } } },
  });

  return user;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  if (isLocalDevAuthEnabled()) {
    await ensureLocalControlFixtures();
    const identity = await resolveControlIdentity();
    if (!identity) return null;
    return prisma.user.findUnique({
      where: { clerkId: identity.externalUserId },
      include: { memberships: { include: { business: true } } },
    });
  }
  if (!isClerkConfigured()) {
    return getOrCreateDevUser();
  }

  const { userId } = await auth();
  if (!userId) return null;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = normalizeEmail(
    clerkUser.emailAddresses[0]?.emailAddress ?? `${userId}@clerk.local`
  );

  let user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { memberships: { include: { business: true } } },
  });

  if (!user) {
    user = await prisma.user.findUnique({
      where: { email },
      include: { memberships: { include: { business: true } } },
    });
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        clerkId: userId,
        email,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
      },
      include: { memberships: { include: { business: true } } },
    });
  } else if (!user.clerkId || user.email !== email) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        clerkId: userId,
        email,
        firstName: clerkUser.firstName ?? user.firstName,
        lastName: clerkUser.lastName ?? user.lastName,
        imageUrl: clerkUser.imageUrl ?? user.imageUrl,
      },
      include: { memberships: { include: { business: true } } },
    });
  }

  return user;
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    if (isClerkConfigured()) {
      redirect("/sign-in");
    }
    throw new Error("Unable to establish session");
  }
  return user;
}

export async function getActiveBusiness(user: SessionUser): Promise<Business | null> {
  const cookieStore = await cookies();
  const requestedId = cookieStore.get(WORKSPACE_COOKIE)?.value;
  if (requestedId) {
    const membership = user.memberships.find((entry) => entry.businessId === requestedId);
    if (membership) return membership.business;
    const supportId = cookieStore.get("tapconnect_support_session")?.value;
    if (supportId) {
      const support = await prisma.supportSession.findFirst({
        where: {
          id: supportId,
          actorUserId: user.id,
          businessId: requestedId,
          status: "ACTIVE",
          expiresAt: { gt: new Date() },
        },
      });
      if (support) return prisma.business.findUnique({ where: { id: requestedId } });
    }
  }
  return user.memberships[0]?.business ?? null;
}

export function isPlatformAdmin(user: { email: string }): boolean {
  if (
    user.email === DEV_USER_EMAIL &&
    isLocalDevAuthEnabled()
  ) {
    return false;
  }
  return isPlatformAdminEmail(user.email);
}

export async function requirePlatformAdmin(): Promise<{
  user: SessionUser;
  business: Business;
}> {
  const user = await requireSessionUser();
  if (!isPlatformAdminEmail(user.email)) {
    redirect(postAuthPath(user));
  }
  const business = await ensureAdminWorkspace(user);
  return { user, business };
}

export async function requireBusiness(): Promise<{
  user: SessionUser;
  business: Business;
}> {
  const user = await requireSessionUser();

  const business = await getActiveBusiness(user);
  if (business) return { user, business };

  if (isPlatformAdmin(user)) {
    const adminBusiness = await ensureAdminWorkspace(user);
    return { user, business: adminBusiness };
  }
  redirect("/onboarding");
}

export async function resolvePostAuthRedirect(): Promise<string> {
  if (isLocalDevAuthEnabled()) {
    const user = await getOrCreateDevUser();
    const active = user.memberships[0]?.business;
    return postAuthDestination({
      isPlatformAdmin: false,
      hasBusiness: Boolean(active),
      cardFirstOnboardingCompleted: Boolean(active?.cardFirstOnboardingCompletedAt),
    });
  }
  const user = await requireSessionUser();
  if (isPlatformAdminEmail(user.email)) {
    await ensureAdminWorkspace(user);
    return postAuthDestination({
      isPlatformAdmin: true,
      hasBusiness: true,
      cardFirstOnboardingCompleted: true,
    });
  }
  const active = user.memberships[0]?.business;
  return postAuthDestination({
    isPlatformAdmin: false,
    hasBusiness: Boolean(active),
    cardFirstOnboardingCompleted: Boolean(active?.cardFirstOnboardingCompletedAt),
  });
}
