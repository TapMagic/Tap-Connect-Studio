import type { Business, BusinessUser, User } from "@prisma/client";
import {
  ADMIN_UNLIMITED,
  ADMIN_WORKSPACE_SLUG,
  PLATFORM_ADMIN_EMAILS,
  isPlatformAdminEmail,
  normalizeEmail,
} from "@/lib/config/admins";
import { prisma } from "@/lib/db";

type AdminSessionUser = User & {
  memberships: (BusinessUser & { business: Business })[];
};

/** Pre-create User rows so Admins route correctly before Stripe/Clerk first login. */
export async function ensurePlatformAdminUsers() {
  const results = [];
  for (const email of PLATFORM_ADMIN_EMAILS) {
    const normalized = normalizeEmail(email);
    const user = await prisma.user.upsert({
      where: { email: normalized },
      create: {
        email: normalized,
        firstName: normalized.startsWith("danny") ? "Danny" : "Rich",
        lastName: normalized.startsWith("danny") ? "Generate" : "Soehner",
      },
      update: {},
    });
    results.push(user);
  }
  return results;
}

async function applyAdminLimits(businessId: string): Promise<Business> {
  return prisma.business.update({
    where: { id: businessId },
    data: {
      subscriptionTier: "ENTERPRISE",
      activeCampaignLimit: ADMIN_UNLIMITED,
      activeDeviceLimit: ADMIN_UNLIMITED,
      billingStatus: "ACTIVE",
    },
  });
}

/**
 * Ensures a platform Admin has a workspace with unlimited campaigns/devices.
 * Reuses their first membership when present; otherwise creates a shared admin workspace.
 */
export async function ensureAdminWorkspace(user: AdminSessionUser): Promise<Business> {
  if (!isPlatformAdminEmail(user.email)) {
    throw new Error("Not a platform admin");
  }

  const membership = user.memberships[0];
  if (membership?.business) {
    if (
      membership.business.activeCampaignLimit < ADMIN_UNLIMITED ||
      membership.business.subscriptionTier !== "ENTERPRISE"
    ) {
      return applyAdminLimits(membership.business.id);
    }
    return membership.business;
  }

  const existingWorkspace = await prisma.business.findUnique({
    where: { slug: ADMIN_WORKSPACE_SLUG },
  });

  if (existingWorkspace) {
    await prisma.businessUser.upsert({
      where: {
        businessId_userId: {
          businessId: existingWorkspace.id,
          userId: user.id,
        },
      },
      create: {
        businessId: existingWorkspace.id,
        userId: user.id,
        role: "OWNER",
      },
      update: { role: "OWNER" },
    });
    return applyAdminLimits(existingWorkspace.id);
  }

  const business = await prisma.business.create({
    data: {
      name: "TapConnect Admin",
      slug: ADMIN_WORKSPACE_SLUG,
      subscriptionTier: "ENTERPRISE",
      activeCampaignLimit: ADMIN_UNLIMITED,
      activeDeviceLimit: ADMIN_UNLIMITED,
      billingStatus: "ACTIVE",
      email: normalizeEmail(user.email),
      users: {
        create: {
          userId: user.id,
          role: "OWNER",
        },
      },
      brandKit: { create: {} },
      locations: {
        create: {
          name: "Platform",
          isDefault: true,
        },
      },
    },
  });

  return business;
}

export function postAuthPath(user: {
  email: string;
  memberships: unknown[];
}): "/admin" | "/dashboard" | "/onboarding" {
  if (isPlatformAdminEmail(user.email)) return "/admin";
  if (user.memberships.length > 0) return "/dashboard";
  return "/onboarding";
}
