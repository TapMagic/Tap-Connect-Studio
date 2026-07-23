/**
 * Idempotent fusion seed — ONLY against isolated tapconnect_fusion_dev.
 * All rows labeled [SEED] in names/emails. Never touches Railway.
 *
 * Usage: npx tsx scripts/fusion-seed.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { assertSafeFusionDatabaseUrl } from "../lib/fusion/db/safety";

const SEED_MARKER = "[SEED]";
const SEED_EMAIL = "seed.owner@tapconnect.fusion.local";
const SEED_GUEST = "seed.guest@tapconnect.fusion.local";

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("No DATABASE_URL — refuse seed");
    process.exit(1);
  }
  const safety = assertSafeFusionDatabaseUrl(url);
  if (!safety.ok) {
    console.error("REFUSING seed:", safety.reason);
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("Seeding isolated fusion DB (labeled SEED data only)…");

    let user = await prisma.user.findFirst({ where: { email: SEED_EMAIL } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: SEED_EMAIL,
          firstName: SEED_MARKER,
          lastName: "Fusion Owner",
          clerkId: `seed_clerk_fusion_dev`,
        },
      });
      console.log("  created seed user", user.id);
    } else {
      console.log("  seed user exists", user.id);
    }

    let business = await prisma.business.findFirst({
      where: { name: { startsWith: SEED_MARKER } },
    });
    if (!business) {
      business = await prisma.business.create({
        data: {
          name: `${SEED_MARKER} Demo Lounge`,
          slug: `seed-demo-lounge`,
          subscriptionTier: "STUDIO",
          email: SEED_EMAIL,
        },
      });
      await prisma.businessUser.create({
        data: { businessId: business.id, userId: user.id, role: "OWNER" },
      });
      console.log("  created seed business", business.id);
    } else {
      console.log("  seed business exists", business.id);
      const membership = await prisma.businessUser.findUnique({
        where: { businessId_userId: { businessId: business.id, userId: user.id } },
      });
      if (!membership) {
        await prisma.businessUser.create({
          data: { businessId: business.id, userId: user.id, role: "OWNER" },
        });
      }
    }

    const campaignCount = await prisma.campaign.count({
      where: { businessId: business.id, title: { startsWith: SEED_MARKER } },
    });
    if (campaignCount === 0) {
      await prisma.campaign.create({
        data: {
          businessId: business.id,
          title: `${SEED_MARKER} Welcome Card`,
          campaignType: "LINK_HUB",
          status: "DRAFT",
          contentBlocks: [
            {
              id: "seed_hero",
              type: "hero",
              order: 0,
              enabled: true,
              channel: "page",
              data: { headline: "Seed demo — not production data" },
            },
          ],
          createdById: user.id,
        },
      });
      console.log("  created seed campaign");
    }

    let contact = await prisma.contact.findFirst({
      where: { businessId: business.id, email: SEED_GUEST },
    });
    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          businessId: business.id,
          email: SEED_GUEST,
          name: `${SEED_MARKER} Guest`,
          metadata: { seeded: true, label: "SEED" },
        },
      });
      console.log("  created seed contact", contact.id);
    }

    const rel = await prisma.customerRelationship.upsert({
      where: {
        businessId_contactId: { businessId: business.id, contactId: contact.id },
      },
      create: {
        businessId: business.id,
        contactId: contact.id,
        tapSaveEnabled: true,
        sourceType: "seed",
        metadata: { seeded: true, label: "SEED" },
      },
      update: { tapSaveEnabled: true, metadata: { seeded: true, label: "SEED" } },
    });
    console.log("  seed relationship / MyTap token", rel.publicToken);

    const programCount = await prisma.loyaltyProgram.count({
      where: { businessId: business.id, name: { startsWith: SEED_MARKER } },
    });
    if (programCount === 0) {
      await prisma.loyaltyProgram.create({
        data: {
          businessId: business.id,
          name: `${SEED_MARKER} Visit Loop`,
          active: true,
          earnRules: [{ id: "visit", label: "Visit", points: 10, event: "visit" }],
          tiers: {
            create: [
              { name: "Member", rank: 0, thresholdPoints: 0, perks: [] },
              { name: "Gold", rank: 1, thresholdPoints: 100, perks: ["Priority"] },
            ],
          },
        },
      });
      console.log("  created seed TapLoop program");
    }

    console.log("Seed complete. SEED-labeled rows only — Railway untouched.");
    console.log(`MyTap path: /mytap/${rel.publicToken}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
