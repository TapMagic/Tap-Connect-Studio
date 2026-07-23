/**
 * Idempotent DEMO/SEED data for isolated fusion DB only.
 * Refuses to run unless assertSafeFusionDatabaseUrl passes.
 *
 * Usage: npx tsx scripts/fusion-seed.ts
 * npm run fusion:seed
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { assertSafeFusionDatabaseUrl } from "../lib/fusion/db/safety";

const SEED_SLUG = "seed-demo-fusion";
const SEED_PREFIX = "[SEED]";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("No DATABASE_URL. See docs/fusion/LOCAL_DEV_DATABASE.md");
  process.exit(1);
}

const safety = assertSafeFusionDatabaseUrl(url);
if (!safety.ok) {
  console.error("REFUSING seed:", safety.reason);
  process.exit(1);
}

const pool = new Pool({ connectionString: url });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log("Fusion seed on isolated DB…");

  const business = await prisma.business.upsert({
    where: { slug: SEED_SLUG },
    create: {
      name: `${SEED_PREFIX} Demo Cafe`,
      slug: SEED_SLUG,
      email: "seed-demo@example.invalid",
      subscriptionTier: "STUDIO",
      activeDeviceLimit: 5,
      activeCampaignLimit: 10,
    },
    update: {
      name: `${SEED_PREFIX} Demo Cafe`,
      email: "seed-demo@example.invalid",
    },
  });

  const campaignTitle = `${SEED_PREFIX} Welcome Offer`;
  let campaign = await prisma.campaign.findFirst({
    where: { businessId: business.id, title: campaignTitle },
  });
  if (!campaign) {
    campaign = await prisma.campaign.create({
      data: {
        businessId: business.id,
        title: campaignTitle,
        campaignType: "COUPON_OFFER",
        status: "DRAFT",
        contentBlocks: [
          {
            id: "seed_hero",
            type: "hero",
            props: { headline: "Seed demo — not production" },
          },
        ],
        offerSettings: { seeded: true, code: "SEEDDEMO" },
        themeOverrides: { seeded: true },
        complianceSettings: { seeded: true },
        formSettings: { seeded: true },
        primaryMedia: { seeded: true },
        endExperience: { seeded: true },
      },
    });
  }

  const contactEmail = "seed.contact@example.invalid";
  let contact = await prisma.contact.findFirst({
    where: { businessId: business.id, email: contactEmail },
  });
  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        businessId: business.id,
        email: contactEmail,
        name: `${SEED_PREFIX} Alex Visitor`,
        phone: "+15555550100",
        metadata: { seeded: true, source: "fusion-seed" },
      },
    });
  } else {
    contact = await prisma.contact.update({
      where: { id: contact.id },
      data: {
        name: `${SEED_PREFIX} Alex Visitor`,
        metadata: { seeded: true, source: "fusion-seed" },
      },
    });
  }

  const programName = `${SEED_PREFIX} Demo Loyalty`;
  let program = await prisma.loyaltyProgram.findFirst({
    where: { businessId: business.id, name: programName },
  });
  if (!program) {
    program = await prisma.loyaltyProgram.create({
      data: {
        businessId: business.id,
        name: programName,
        active: true,
        earnRules: [
          { id: "seed_tap", label: "Seed tap earn", points: 10, event: "tap", seeded: true },
        ],
      },
    });
  } else {
    program = await prisma.loyaltyProgram.update({
      where: { id: program.id },
      data: {
        active: true,
        earnRules: [
          { id: "seed_tap", label: "Seed tap earn", points: 10, event: "tap", seeded: true },
        ],
      },
    });
  }

  const journeyName = `${SEED_PREFIX} Demo Journey`;
  let journey = await prisma.journeyDraft.findFirst({
    where: { businessId: business.id, name: journeyName },
  });
  const definition = {
    schemaVersion: 1,
    name: journeyName,
    metadata: { seeded: true },
    nodes: [
      {
        id: "trigger_1",
        type: "trigger",
        label: "Trigger",
        config: { event: "tap", seeded: true },
        position: { x: 80, y: 120 },
      },
      {
        id: "msg_1",
        type: "message",
        label: "Welcome",
        config: { channel: "in_app", body: "Seed hello", seeded: true },
        position: { x: 240, y: 120 },
      },
      {
        id: "exit_1",
        type: "exit",
        label: "Complete",
        config: { seeded: true },
        position: { x: 400, y: 120 },
      },
    ],
    edges: [
      { id: "e1", from: "trigger_1", to: "msg_1" },
      { id: "e2", from: "msg_1", to: "exit_1" },
    ],
  };
  if (!journey) {
    journey = await prisma.journeyDraft.create({
      data: {
        businessId: business.id,
        name: journeyName,
        definition,
        schemaVersion: 1,
        status: "DRAFT",
      },
    });
  } else {
    journey = await prisma.journeyDraft.update({
      where: { id: journey.id },
      data: { definition, schemaVersion: 1 },
    });
  }

  // ── Flight-test demo path (no Clerk): local owner + live tap ──────────────
  const DEV_EMAIL = "dev@tapconnect.local";
  const user = await prisma.user.upsert({
    where: { email: DEV_EMAIL },
    create: {
      email: DEV_EMAIL,
      firstName: "Dev",
      lastName: "Owner",
    },
    update: { firstName: "Dev", lastName: "Owner" },
  });

  await prisma.businessUser.upsert({
    where: {
      businessId_userId: { businessId: business.id, userId: user.id },
    },
    create: {
      businessId: business.id,
      userId: user.id,
      role: "OWNER",
    },
    update: { role: "OWNER" },
  });

  const liveBlocks = [
    {
      id: "seed_heading",
      type: "heading",
      props: { text: `${SEED_PREFIX} Welcome — Flight Test Card` },
    },
    {
      id: "seed_text",
      type: "text",
      props: { text: "Keep this card, earn TapLoop points, and reopen anytime." },
    },
    {
      id: "seed_offer",
      type: "offer",
      props: { title: "SEEDDEMO", description: "10% off — seed only" },
    },
  ];

  campaign = await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      status: "LIVE",
      contentBlocks: liveBlocks,
      scheduledStart: new Date(Date.now() - 86400000),
      scheduledEnd: new Date(Date.now() + 30 * 86400000),
    },
  });

  const eveningTitle = `${SEED_PREFIX} Evening Special`;
  let evening = await prisma.campaign.findFirst({
    where: { businessId: business.id, title: eveningTitle },
  });
  if (!evening) {
    evening = await prisma.campaign.create({
      data: {
        businessId: business.id,
        title: eveningTitle,
        campaignType: "COUPON_OFFER",
        status: "LIVE",
        contentBlocks: [
          {
            id: "eve_h",
            type: "heading",
            props: { text: "Evening special (time-travel slot)" },
          },
        ],
        offerSettings: { seeded: true },
        themeOverrides: { seeded: true },
        complianceSettings: { seeded: true },
        formSettings: { seeded: true },
        primaryMedia: { seeded: true },
        endExperience: { seeded: true },
      },
    });
  }

  const groupTitle = `${SEED_PREFIX} Demo Group`;
  let group = await prisma.campaignGroup.findFirst({
    where: { businessId: business.id, title: groupTitle },
  });
  if (!group) {
    group = await prisma.campaignGroup.create({
      data: {
        businessId: business.id,
        title: groupTitle,
        description: "Seed group for schedule / time-travel proof",
        status: "LIVE",
        timezone: "America/New_York",
        defaultCampaignId: campaign.id,
        showUpcomingOnPages: true,
      },
    });
  } else {
    group = await prisma.campaignGroup.update({
      where: { id: group.id },
      data: { defaultCampaignId: campaign.id, status: "LIVE" },
    });
  }

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { groupId: group.id },
  });
  await prisma.campaign.update({
    where: { id: evening.id },
    data: { groupId: group.id },
  });

  const slotCount = await prisma.campaignGroupSlot.count({ where: { groupId: group.id } });
  if (slotCount === 0) {
    await prisma.campaignGroupSlot.create({
      data: {
        businessId: business.id,
        groupId: group.id,
        campaignId: evening.id,
        label: "Evenings",
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        startTime: "16:00",
        endTime: "23:59",
        priority: 10,
        enabled: true,
      },
    });
  }

  const DEVICE_CODE = "seeddemo01";
  let device = await prisma.deviceSlot.findUnique({ where: { deviceCode: DEVICE_CODE } });
  if (!device) {
    device = await prisma.deviceSlot.create({
      data: {
        businessId: business.id,
        deviceCode: DEVICE_CODE,
        nickname: `${SEED_PREFIX} Front Counter`,
        status: "ACTIVE",
        deviceType: "GENERIC_NFC",
        activatedAt: new Date(),
        campaignGroupId: group.id,
        metadata: { seeded: true },
      },
    });
  } else {
    device = await prisma.deviceSlot.update({
      where: { id: device.id },
      data: {
        businessId: business.id,
        status: "ACTIVE",
        campaignGroupId: group.id,
        nickname: `${SEED_PREFIX} Front Counter`,
      },
    });
  }

  const assignment = await prisma.deviceAssignment.findFirst({
    where: { deviceSlotId: device.id, status: "ACTIVE" },
  });
  if (!assignment) {
    await prisma.deviceAssignment.create({
      data: {
        deviceSlotId: device.id,
        campaignId: campaign.id,
        businessId: business.id,
        status: "ACTIVE",
        startsAt: new Date(),
        assignedById: user.id,
      },
    });
  }

  let relationship = await prisma.customerRelationship.findFirst({
    where: { businessId: business.id, contactId: contact.id },
  });
  if (!relationship) {
    relationship = await prisma.customerRelationship.create({
      data: {
        businessId: business.id,
        contactId: contact.id,
        publicToken: `seed_rel_${business.id.slice(-8)}`,
        status: "ACTIVE",
        tapSaveEnabled: true,
        sourceType: "seed",
        metadata: { seeded: true },
      },
    });
  }

  const enrollment = await prisma.loyaltyEnrollment.findFirst({
    where: { programId: program.id, contactId: contact.id },
  });
  if (!enrollment) {
    await prisma.loyaltyEnrollment.create({
      data: {
        businessId: business.id,
        programId: program.id,
        contactId: contact.id,
        relationshipId: relationship.id,
        status: "ACTIVE",
        consentedAt: new Date(),
      },
    });
  }

  journey = await prisma.journeyDraft.update({
    where: { id: journey.id },
    data: {
      status: "ACTIVE",
      publishedAt: new Date(),
      activatedAt: new Date(),
    },
  });

  for (const featureId of [
    "journey.tapflow",
    "loyalty.taploop",
    "ai.autopilot",
    "comms.inbox",
    "ops.pulse",
  ]) {
    await prisma.featureFlagOverride.upsert({
      where: { featureId_scope: { featureId, scope: "global" } },
      create: {
        featureId,
        scope: "global",
        enabled: true,
        reason: "Flight-test seed",
        actorEmail: DEV_EMAIL,
      },
      update: {
        enabled: true,
        reason: "Flight-test seed",
      },
    });
  }

  console.log("Seed complete (idempotent):");
  console.log(`  business: ${business.id} (${business.slug})`);
  console.log(`  campaign: ${campaign.id} (LIVE)`);
  console.log(`  evening:  ${evening.id}`);
  console.log(`  group:    ${group.id}`);
  console.log(`  device:   /t/${DEVICE_CODE}`);
  console.log(`  contact:  ${contact.id}`);
  console.log(`  mytap:    /mytap/${relationship.publicToken}`);
  console.log(`  loyalty:  ${program.id}`);
  console.log(`  journey:  ${journey.id} (ACTIVE)`);
  console.log(`  owner:    ${DEV_EMAIL} (no Clerk — local session)`);
  console.log("All rows labeled seeded:true / [SEED] prefix.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
