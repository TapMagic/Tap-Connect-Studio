import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import * as nodeModule from "node:module";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import { prisma } from "@/lib/db";
import { assertSafeFusionDatabaseUrl } from "@/lib/fusion/db/safety";
import type { WebsiteIntakeResult } from "@/lib/fusion/knowledge/website-intake";

const serverOnlyEmptyUrl = pathToFileURL(
  path.resolve("node_modules/server-only/empty.js")
).href;
const registerRuntimeHooks = (
  nodeModule as unknown as {
    registerHooks(hooks: {
      resolve(
        specifier: string,
        context: unknown,
        nextResolve: (specifier: string, context: unknown) => unknown
      ): unknown;
    }): void;
  }
).registerHooks;
registerRuntimeHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: serverOnlyEmptyUrl, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
let persistWebsiteDiscovery: typeof import(
  "@/lib/fusion/knowledge/apply-website-candidates"
)["persistWebsiteDiscovery"];

const databaseUrl = process.env.DATABASE_URL ?? "";
const run = assertSafeFusionDatabaseUrl(databaseUrl).ok;

function discoveryResult(contentHash = "homepage-v1"): WebsiteIntakeResult {
  return {
    requestedUrl: "https://northstar.example/",
    finalUrl: "https://northstar.example/",
    contentHash,
    fetchedAt: "2026-07-30T20:00:00.000Z",
    findings: [
      {
        factKey: "description",
        value: "Owner-declared workshop description.",
        confidence: 0.92,
        evidence: "Homepage meta description",
      },
    ],
    candidates: [
      {
        kind: "logo",
        propertyKey: "logo",
        value: "https://northstar.example/logo.png",
        sourceUrl: "https://northstar.example/logo.png",
        confidence: 0.88,
        evidence: "Organization JSON-LD logo",
      },
      {
        kind: "color",
        propertyKey: "primaryColor",
        value: "#1a5f4a",
        confidence: 0.8,
        evidence: "Theme color",
      },
      {
        kind: "social_link",
        value: JSON.stringify({
          network: "instagram",
          url: "https://instagram.com/northstar",
        }),
        confidence: 0.85,
        evidence: "Homepage link",
      },
      {
        kind: "service",
        value: "Prototype workshop",
        confidence: 0.8,
        evidence: "Structured offer name",
      },
    ],
  };
}

describe(
  "website discovery persistence",
  { skip: run ? false : "isolated DATABASE_URL is required for integration proof" },
  () => {
    let actorId = "";
    let businessId = "";
    let otherBusinessId = "";
    let incompleteBusinessId = "";

    before(async () => {
      ({ persistWebsiteDiscovery } = await import(
        "@/lib/fusion/knowledge/apply-website-candidates"
      ));
      const suffix = randomUUID().slice(0, 8);
      const actor = await prisma.user.create({
        data: { email: `website-review-${suffix}@tapconnect.test` },
      });
      actorId = actor.id;
      const business = await prisma.business.create({
        data: {
          name: `Website review ${suffix}`,
          slug: `website-review-${suffix}`,
          brandKit: { create: {} },
        },
      });
      businessId = business.id;
      const other = await prisma.business.create({
        data: {
          name: `Website review other ${suffix}`,
          slug: `website-review-other-${suffix}`,
          brandKit: { create: {} },
        },
      });
      otherBusinessId = other.id;
      const incomplete = await prisma.business.create({
        data: {
          name: `Website review incomplete ${suffix}`,
          slug: `website-review-incomplete-${suffix}`,
        },
      });
      incompleteBusinessId = incomplete.id;
    });

    after(async () => {
      for (const id of [businessId, otherBusinessId, incompleteBusinessId]) {
        if (id) {
          await prisma.business.delete({ where: { id } }).catch(() => undefined);
        }
      }
      if (actorId) {
        await prisma.user.delete({ where: { id: actorId } }).catch(() => undefined);
      }
    });

    it("persists bounded structured suggestions once per tenant and request", async () => {
      const result = discoveryResult();
      const first = await persistWebsiteDiscovery({
        businessId,
        actorId,
        result,
      });
      const retry = await persistWebsiteDiscovery({
        businessId,
        actorId,
        result,
      });

      assert.equal(first.idempotent, false);
      assert.equal(retry.idempotent, true);
      assert.equal(retry.source.id, first.source.id);
      assert.equal(
        await prisma.knowledgeSource.count({
          where: { businessId, kind: "WEBSITE" },
        }),
        1
      );
      assert.equal(
        await prisma.brandPropertyDecision.count({
          where: { businessId, provider: "website_homepage" },
        }),
        2
      );

      const source = await prisma.knowledgeSource.findUniqueOrThrow({
        where: { id: first.source.id },
      });
      assert.ok(Buffer.byteLength(JSON.stringify(source.metadata), "utf8") < 8_000);
      assert.doesNotMatch(JSON.stringify(source.metadata), /logo\.png|Prototype workshop/);

      const facts = await prisma.knowledgeFact.findMany({
        where: { businessId },
      });
      assert.deepEqual(
        facts.find((fact) => fact.factKey === "socialLinks")?.value,
        [
          {
            network: "instagram",
            url: "https://instagram.com/northstar",
          },
        ]
      );
      assert.deepEqual(
        facts.find((fact) => fact.factKey === "services")?.value,
        ["Prototype workshop"]
      );

      const logo = await prisma.brandPropertyDecision.findFirstOrThrow({
        where: { businessId, propertyKey: "logo" },
      });
      assert.equal(logo.status, "SUGGESTED");
      assert.equal(logo.rightsStatus, "NEEDS_CONFIRMATION");

      const tenantResult = await persistWebsiteDiscovery({
        businessId: otherBusinessId,
        actorId,
        result,
      });
      assert.notEqual(tenantResult.source.id, first.source.id);
      assert.equal(
        await prisma.knowledgeSource.count({
          where: { businessId: otherBusinessId, kind: "WEBSITE" },
        }),
        1
      );
    });

    it("preserves rejected values when the homepage version changes", async () => {
      const rejectedFact = await prisma.knowledgeFact.findFirstOrThrow({
        where: { businessId, factKey: "description" },
      });
      const rejectedLogo = await prisma.brandPropertyDecision.findFirstOrThrow({
        where: { businessId, propertyKey: "logo" },
      });
      await prisma.knowledgeFact.update({
        where: { id: rejectedFact.id },
        data: { approvalStatus: "REJECTED" },
      });
      await prisma.brandPropertyDecision.update({
        where: { id: rejectedLogo.id },
        data: { status: "REJECTED" },
      });

      const next = await persistWebsiteDiscovery({
        businessId,
        actorId,
        result: discoveryResult("homepage-v2"),
      });

      assert.equal(next.idempotent, false);
      assert.equal(
        await prisma.knowledgeFact.count({
          where: {
            businessId,
            factKey: "description",
          },
        }),
        1
      );
      assert.equal(
        await prisma.brandPropertyDecision.count({
          where: { businessId, propertyKey: "logo" },
        }),
        1
      );
    });

    it("rolls back source and fact writes when Brand persistence cannot complete", async () => {
      await assert.rejects(
        persistWebsiteDiscovery({
          businessId: incompleteBusinessId,
          actorId,
          result: discoveryResult("atomic-failure"),
        })
      );
      assert.equal(
        await prisma.knowledgeSource.count({
          where: { businessId: incompleteBusinessId },
        }),
        0
      );
      assert.equal(
        await prisma.knowledgeFact.count({
          where: { businessId: incompleteBusinessId },
        }),
        0
      );
      assert.equal(
        await prisma.brandPropertyDecision.count({
          where: { businessId: incompleteBusinessId },
        }),
        0
      );
    });
  }
);
