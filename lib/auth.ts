import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { isClerkConfigured } from "@/lib/utils/app";
import type { Business, BusinessUser, User } from "@prisma/client";

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
  if (!isClerkConfigured()) {
    return getOrCreateDevUser();
  }

  const { userId } = await auth();
  if (!userId) return null;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email =
    clerkUser.emailAddresses[0]?.emailAddress ?? `${userId}@clerk.local`;

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
  } else if (!user.clerkId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        clerkId: userId,
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
  return user.memberships[0]?.business ?? null;
}

export async function requireBusiness(): Promise<{
  user: SessionUser;
  business: Business;
}> {
  const user = await requireSessionUser();
  const business = await getActiveBusiness(user);

  if (!business) {
    redirect("/onboarding");
  }

  return { user, business };
}
