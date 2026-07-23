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

  console.log("Seed complete (idempotent):");
  console.log(`  business: ${business.id} (${business.slug})`);
  console.log(`  campaign: ${campaign.id}`);
  console.log(`  contact:  ${contact.id}`);
  console.log(`  loyalty:  ${program.id}`);
  console.log(`  journey:  ${journey.id}`);
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
