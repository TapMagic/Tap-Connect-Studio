import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { isLocalDevAuthEnabled } from "@/lib/config/local-dev";
import { DEMO_BLOCKED_ACTIONS } from "@/lib/control/demo-policy";
import { PLATFORM_PERMISSIONS, ROLE_TEMPLATES } from "@/lib/control/permissions";

const SERVICES = [
  ["cards", "Cards", "Experience", true],
  ["brand", "Brand", "Creative", true],
  ["assets", "Assets", "Creative", true],
  ["campaign_drafts", "Campaign drafts", "Communications", true],
  ["campaign_send", "Campaign sending", "Communications", false],
  ["email_drafts", "Email drafts", "Communications", true],
  ["email_send", "Email sending", "Communications", false],
  ["tapcanvas", "TapCanvas", "Creation", true],
  ["ask_tapconnect", "Ask TapConnect", "AI", true],
  ["ai_generation", "AI generation", "AI", true],
  ["tap_points", "Tap Points", "Hardware", false],
  ["media_upload", "Media upload", "Creative", true],
  ["external_integrations", "External integrations", "Providers", false],
] as const;

const CONFIGURATION = [
  ["platform.identity", "TapConnect Control Room", "Internal platform identity"],
  ["support.contact", "support@tapconnect.example", "Internal support contact"],
  ["invitation.expiration_days", "7", "Default administrator invitation lifetime"],
  ["sandbox.default_plan", "sandbox-safe", "Default personal sandbox plan"],
  ["demo.default_plan", "demo-safe", "Default demo workspace plan"],
  ["deletion.grace_days", "30", "Deletion grace period"],
  ["security.mfa_required", "true", "Require MFA for administrators"],
  ["support.max_duration_minutes", "60", "Maximum Support Session duration"],
  ["approval.unlimited_threshold", "999999", "Approval threshold"],
  ["landing.demo_slot_key", "primary-card", "Landing page Demo Card slot"],
  ["local.fixture_mode", "true", "Local deterministic fixture identity status"],
] as const;

async function ensureCatalogs() {
  for (const template of ROLE_TEMPLATES) {
    const role = await prisma.platformRole.upsert({
      where: { key: template.key },
      create: {
        key: template.key,
        name: template.name,
        description: template.description,
        protected: template.protected,
        ownerRole: template.ownerRole,
      },
      update: {
        name: template.name,
        description: template.description,
        protected: template.protected,
        ownerRole: template.ownerRole,
      },
    });
    const permissions = new Set<string>(template.permissions);
    await prisma.platformRolePermission.deleteMany({
      where: { roleId: role.id, permissionKey: { notIn: [...permissions] } },
    });
    for (const permissionKey of permissions) {
      await prisma.platformRolePermission.upsert({
        where: { roleId_permissionKey: { roleId: role.id, permissionKey } },
        create: { roleId: role.id, permissionKey, effect: "ALLOW" },
        update: { effect: "ALLOW" },
      });
    }
  }

  for (const [key, name, category, customerVisible] of SERVICES) {
    await prisma.serviceDefinition.upsert({
      where: { key },
      create: {
        key,
        ownerFacingName: name,
        description: `${name} capability governed by TapConnect.`,
        category,
        availability: customerVisible ? "PUBLIC" : "INTERNAL",
        customerVisible,
        defaultEnabled: false,
        diagnosticsPath: `/control?section=entitlements&service=${key}`,
      },
      update: {
        ownerFacingName: name,
        description: `${name} capability governed by TapConnect.`,
        category,
        customerVisible,
      },
    });
  }

  const sandboxPlan = await prisma.planDefinition.upsert({
    where: { key: "sandbox-safe" },
    create: {
      key: "sandbox-safe",
      name: "Sandbox Safe",
      description: "Internal creative access with all external effects blocked.",
      tapPointAllowance: 0,
      locationAllowance: 1,
      storageAllowanceBytes: 1_000_000_000,
      campaignAllowance: 100,
      emailAllowance: 100,
      aiAllowance: 100,
    },
    update: {},
  });
  const demoPlan = await prisma.planDefinition.upsert({
    where: { key: "demo-safe" },
    create: {
      key: "demo-safe",
      name: "Demo Safe",
      description: "Shared demo access with safe publication and no external effects.",
      tapPointAllowance: 0,
      locationAllowance: 3,
      storageAllowanceBytes: 2_000_000_000,
      campaignAllowance: 100,
      emailAllowance: 100,
      aiAllowance: 250,
    },
    update: {},
  });
  const internalPlan = await prisma.planDefinition.upsert({
    where: { key: "internal-full" },
    create: {
      key: "internal-full",
      name: "Internal Full",
      description: "Internal workspace capability catalog; restrictions still prevail.",
      tapPointAllowance: 100,
      locationAllowance: 100,
      storageAllowanceBytes: 10_000_000_000,
      campaignAllowance: 100_000,
      emailAllowance: 100_000,
      aiAllowance: 100_000,
    },
    update: {},
  });

  const services = await prisma.serviceDefinition.findMany();
  for (const plan of [sandboxPlan, demoPlan, internalPlan]) {
    for (const service of services) {
      const blockedInSafePlan = [
        "campaign_send",
        "email_send",
        "tap_points",
        "external_integrations",
      ].includes(service.key);
      await prisma.planEntitlement.upsert({
        where: { planId_serviceId: { planId: plan.id, serviceId: service.id } },
        create: {
          planId: plan.id,
          serviceId: service.id,
          enabled: plan.id === internalPlan.id || !blockedInSafePlan,
        },
        update: {
          enabled: plan.id === internalPlan.id || !blockedInSafePlan,
        },
      });
    }
  }

  for (const [key, value, description] of CONFIGURATION) {
    await prisma.platformConfiguration.upsert({
      where: { key },
      create: { key, value, description, reason: "Control Room foundation" },
      update: { description },
    });
  }
}

async function upsertFixtureBusiness(input: {
  slug: string;
  name: string;
  workspaceKind: "INTERNAL" | "PERSONAL_SANDBOX" | "DEMO";
  planDefinitionId: string;
}) {
  return prisma.business.upsert({
    where: { slug: input.slug },
    create: {
      slug: input.slug,
      name: input.name,
      workspaceKind: input.workspaceKind,
      lifecycleState: "ACTIVE",
      planDefinitionId: input.planDefinitionId,
      email: `${input.slug}@tapconnect.local`,
    },
    update: {
      workspaceKind: input.workspaceKind,
      planDefinitionId: input.planDefinitionId,
    },
  });
}

let localBootstrap: Promise<void> | null = null;

export async function ensureLocalControlFixtures(): Promise<void> {
  if (!isLocalDevAuthEnabled()) return;
  if (localBootstrap) return localBootstrap;
  localBootstrap = (async () => {
    await ensureCatalogs();
    const [ownerRole, operatorRole, demoManagerRole, internalPlan, sandboxPlan, demoPlan] =
      await Promise.all([
        prisma.platformRole.findUniqueOrThrow({ where: { key: "platform-owner" } }),
        prisma.platformRole.findUniqueOrThrow({ where: { key: "platform-operator" } }),
        prisma.platformRole.findUniqueOrThrow({ where: { key: "demo-manager" } }),
        prisma.planDefinition.findUniqueOrThrow({ where: { key: "internal-full" } }),
        prisma.planDefinition.findUniqueOrThrow({ where: { key: "sandbox-safe" } }),
        prisma.planDefinition.findUniqueOrThrow({ where: { key: "demo-safe" } }),
      ]);

    const rich = await prisma.user.upsert({
      where: { clerkId: "local:rich" },
      create: {
        clerkId: "local:rich",
        email: "rich@tapconnect.local",
        firstName: "Rich",
        displayName: "Rich",
        profilePhotoAlt: "Rich’s profile photo",
      },
      update: { displayName: "Rich", platformStatus: "ACTIVE" },
    });
    const daniel = await prisma.user.upsert({
      where: { clerkId: "local:daniel" },
      create: {
        clerkId: "local:daniel",
        email: "daniel@tapconnect.local",
        firstName: "Daniel",
        displayName: "Daniel",
        profilePhotoAlt: "Daniel’s profile photo",
      },
      update: { displayName: "Daniel", platformStatus: "ACTIVE" },
    });
    await prisma.user.upsert({
      where: { clerkId: "local:visitor" },
      create: {
        clerkId: "local:visitor",
        email: "unauthorized@tapconnect.local",
        firstName: "Unauthorized",
        lastName: "Fixture",
        displayName: "Unauthorized Fixture",
        platformStatus: "ACTIVE",
      },
      update: { platformStatus: "ACTIVE" },
    });

    for (const [userId, roleId, reason] of [
      [rich.id, ownerRole.id, "Local fixture Platform Owner"],
      [daniel.id, operatorRole.id, "Local fixture Platform Operator"],
      [daniel.id, demoManagerRole.id, "Local fixture Demo Manager"],
    ]) {
      await prisma.platformRoleBinding.upsert({
        where: {
          userId_roleId_environmentScope_businessId: {
            userId,
            roleId,
            environmentScope: "local",
            businessId: "*",
          },
        },
        create: {
          userId,
          roleId,
          environmentScope: "local",
          reason,
          grantedById: rich.id,
        },
        update: { reason },
      });
    }
    await prisma.platformDirectPermission.upsert({
      where: {
        userId_permissionKey_environmentScope_businessId: {
          userId: daniel.id,
          permissionKey: "entitlements.unlimited_grant",
          environmentScope: "local",
          businessId: "*",
        },
      },
      create: {
        userId: daniel.id,
        permissionKey: "entitlements.unlimited_grant",
        effect: "DENY",
        environmentScope: "local",
        reason: "Unlimited grants require Platform Owner authority",
        grantedById: rich.id,
      },
      update: { effect: "DENY" },
    });

    const [tapConnect, monkeyCage, promoteThat, richSandbox, danielSandbox, coreDemo] =
      await Promise.all([
        upsertFixtureBusiness({
          slug: "tapconnect-internal",
          name: "TapConnect",
          workspaceKind: "INTERNAL",
          planDefinitionId: internalPlan.id,
        }),
        upsertFixtureBusiness({
          slug: "the-monkey-cage",
          name: "The Monkey Cage",
          workspaceKind: "INTERNAL",
          planDefinitionId: internalPlan.id,
        }),
        upsertFixtureBusiness({
          slug: "i-promote-that",
          name: "I Promote That",
          workspaceKind: "INTERNAL",
          planDefinitionId: internalPlan.id,
        }),
        upsertFixtureBusiness({
          slug: "rich-sandbox",
          name: "Rich’s Sandbox",
          workspaceKind: "PERSONAL_SANDBOX",
          planDefinitionId: sandboxPlan.id,
        }),
        upsertFixtureBusiness({
          slug: "daniel-sandbox",
          name: "Daniel’s Sandbox",
          workspaceKind: "PERSONAL_SANDBOX",
          planDefinitionId: sandboxPlan.id,
        }),
        upsertFixtureBusiness({
          slug: "tapconnect-core-demo",
          name: "TapConnect Core Demo",
          workspaceKind: "DEMO",
          planDefinitionId: demoPlan.id,
        }),
      ]);

    const memberships = [
      [tapConnect.id, rich.id, "OWNER"],
      [tapConnect.id, daniel.id, "MANAGER"],
      [monkeyCage.id, rich.id, "OWNER"],
      [promoteThat.id, daniel.id, "OWNER"],
      [richSandbox.id, rich.id, "OWNER"],
      [danielSandbox.id, daniel.id, "OWNER"],
      [coreDemo.id, rich.id, "OWNER"],
      [coreDemo.id, daniel.id, "MANAGER"],
    ] as const;
    for (const [businessId, userId, role] of memberships) {
      await prisma.businessUser.upsert({
        where: { businessId_userId: { businessId, userId } },
        create: { businessId, userId, role },
        update: { role },
      });
    }
    for (const workspace of [
      tapConnect,
      monkeyCage,
      promoteThat,
      richSandbox,
      danielSandbox,
    ]) {
      const fixtureCard = {
        version: 1,
        identity: {
          name: workspace.name,
          tagline: "A safe Studio-ready local workspace",
        },
        sections: [],
      };
      await prisma.brandKit.upsert({
        where: { businessId: workspace.id },
        create: {
          businessId: workspace.id,
          tapCard: fixtureCard,
          tapCardDraft: fixtureCard,
          tapCardDraftRevision: 1,
          tapCardDraftUpdatedAt: new Date(),
        },
        update: {},
      });
      for (const [name, description, sortOrder] of [
        ["Brand assets", "Logos, colors, and approved brand media.", 0],
        ["Studio content", "Workspace media for Cards, Campaigns, and Email drafts.", 1],
      ] as const) {
        await prisma.mediaCollection.upsert({
          where: { businessId_name: { businessId: workspace.id, name } },
          create: {
            businessId: workspace.id,
            name,
            description,
            sortOrder,
            pinned: true,
          },
          update: { description, sortOrder, pinned: true },
        });
      }
    }

    const demo = await prisma.demoWorkspaceMetadata.upsert({
      where: { businessId: coreDemo.id },
      create: {
        businessId: coreDemo.id,
        description: "Shared safe portfolio demo for TapConnect’s living Card.",
        industryUseCase: "Core platform",
        ownerUserId: rich.id,
        visibility: "SHARED",
        promotionStatus: "APPROVED",
        allowedPublicActions: ["card.view", "card.keep", "lead.fixture"],
        blockedActions: [...DEMO_BLOCKED_ACTIONS],
        standaloneSlug: "tapconnect-core",
        fixtureProvenance: "Local deterministic TapConnect fixture data",
      },
      update: {
        blockedActions: [...DEMO_BLOCKED_ACTIONS],
        fixtureProvenance: "Local deterministic TapConnect fixture data",
      },
    });
    const coreDemoCard = {
      version: 1,
      identity: {
        name: "TapConnect",
        tagline: "One living Card. A clearer way to connect.",
      },
      sections: [
        {
          id: "control-demo-intro",
          type: "text",
          title: "Tap once. Keep the relationship.",
          body: "This fixture Card proves safe Demo Portfolio publication.",
        },
      ],
      actions: [
        { kind: "keep", enabled: true, label: "Keep this Card" },
      ],
      demo: true,
    };
    await prisma.brandKit.upsert({
      where: { businessId: coreDemo.id },
      create: {
        businessId: coreDemo.id,
        primaryColor: "#34d399",
        secondaryColor: "#38bdf8",
        accentColor: "#f4c95d",
        backgroundColor: "#07110d",
        textColor: "#f7fbf8",
        tapCard: coreDemoCard,
        tapCardDraft: coreDemoCard,
        tapCardDraftRevision: 1,
        tapCardDraftUpdatedAt: new Date(),
      },
      update: {},
    });
    await prisma.brandKit.updateMany({
      where: {
        businessId: coreDemo.id,
        tapCardDraft: { equals: Prisma.DbNull },
        tapCardDraftRevision: 0,
      },
      data: {
        tapCardDraft: coreDemoCard,
        tapCardDraftRevision: 1,
        tapCardDraftUpdatedAt: new Date(),
      },
    });
    for (const [name, description, sortOrder] of [
      ["Brand assets", "Logos, colors, and approved Demo brand media.", 0],
      ["Demo content", "Safe fixture media for the Demo Card and campaigns.", 1],
    ] as const) {
      await prisma.mediaCollection.upsert({
        where: { businessId_name: { businessId: coreDemo.id, name } },
        create: {
          businessId: coreDemo.id,
          name,
          description,
          sortOrder,
          pinned: true,
        },
        update: { description, sortOrder, pinned: true },
      });
    }
    for (const userId of [rich.id, daniel.id]) {
      await prisma.demoManager.upsert({
        where: { demoMetadataId_userId: { demoMetadataId: demo.id, userId } },
        create: { demoMetadataId: demo.id, userId },
        update: {},
      });
    }

    await prisma.platformAuditEvent.upsert({
      where: { id: "local-control-bootstrap" },
      create: {
        id: "local-control-bootstrap",
        actorType: "SYSTEM",
        action: "control.local_fixture.bootstrap",
        resourceType: "platform",
        resourceId: "control-room",
        correlationId: "local-control-bootstrap",
        reason: "Idempotent local-only Control Room fixture",
        environment: "local",
        metadata: {
          fixtureOnly: true,
          permissionCount: PLATFORM_PERMISSIONS.length,
        },
      },
      update: {},
    });
  })().catch((error) => {
    localBootstrap = null;
    throw error;
  });
  return localBootstrap;
}
