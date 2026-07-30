import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import {
  signExternalCandidate,
  signProviderCandidate,
  verifyExternalCandidate,
  verifyProviderCandidate,
} from "@/lib/media/candidate-token";
import { collectDocumentMediaReferences } from "@/lib/media/document-usage";
import { LogoDevProvider } from "@/lib/media/providers/logo-dev";
import { PexelsProvider } from "@/lib/media/providers/pexels";
import type { ProviderCandidate } from "@/lib/media/providers/types";
import {
  isPublicIpAddress,
  MAX_MEDIA_BYTES,
  parseSafeRemoteUrl,
  REMOTE_MEDIA_TIMEOUT_MS,
  RemoteMediaError,
  validateRemoteImageBytes,
} from "@/lib/media/remote-image";
import {
  canApproveBrandMedia,
  importProviderCandidate,
  recordMediaRecent,
  recordSavedDocumentAssetUsage,
  resolveApprovedBrandLogo,
  setMediaApproval,
  setMediaFavorite,
  type MediaImportDependencies,
} from "@/lib/media/service";
import {
  deleteMediaObject,
  localMediaStorageEnabled,
  putMediaObject,
  readLocalMediaObject,
} from "@/lib/media/storage";
import { ownerMediaUsageLabel } from "@/lib/media/usage-labels";

function setNodeEnv(value: string | undefined) {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

const pexelsCandidate: ProviderCandidate = {
  provider: "pexels",
  providerAssetId: "fixture-41001",
  previewUrl: "https://images.pexels.com/photos/41001/pexels-photo-41001.jpeg",
  thumbnailUrl:
    "https://images.pexels.com/photos/41001/pexels-photo-41001.jpeg?auto=compress&w=640",
  altText: "Fixture cafe",
  sourcePageUrl: "https://www.pexels.com/photo/tapconnect-fixture-cafe-41001/",
  creatorName: "Fixture Photographer",
  creatorUrl: "https://www.pexels.com/@fixture/",
  width: 1600,
  height: 1067,
  mimeType: "image/jpeg",
  licenseCode: "PEXELS",
  licenseUrl: "https://www.pexels.com/license/",
  attributionText: "Photo by Fixture Photographer on Pexels",
  rightsNote: "Imported under the Pexels license.",
  importDescriptor: {
    imageUrl: "https://images.pexels.com/photos/41001/pexels-photo-41001.jpeg",
    pexelsId: "41001",
  },
};

describe("provider candidate signing", () => {
  it("binds short-lived provider and URL candidates to one business", () => {
    const token = signProviderCandidate("business-a", pexelsCandidate);
    assert.equal(verifyProviderCandidate(token, "business-a").candidate.provider, "pexels");
    assert.throws(() => verifyProviderCandidate(token, "business-b"), /another business/);
    assert.throws(
      () => verifyProviderCandidate(`${token.slice(0, -1)}x`, "business-a"),
      /Invalid candidate token/
    );
    const expired = signProviderCandidate(
      "business-a",
      pexelsCandidate,
      Date.now() - 6 * 60 * 1000
    );
    assert.throws(() => verifyProviderCandidate(expired, "business-a"), /expired/);

    const urlToken = signExternalCandidate("business-a", {
      url: "https://cdn.example.com/image.png",
      mimeType: "image/png",
      sizeBytes: 100,
      filename: "image.png",
    });
    assert.equal(
      verifyExternalCandidate(urlToken, "business-a").url,
      "https://cdn.example.com/image.png"
    );
  });
});

describe("deterministic media providers", () => {
  it("normalizes Pexels success, page 2, empty and failure states", async () => {
    const success = await new PexelsProvider({
      fixture: true,
      fixtureScenario: "success",
    }).search({ query: "cafe", page: 1, orientation: "landscape", color: "#22c55e" });
    assert.equal(success.ok, true);
    if (!success.ok) return;
    assert.equal(success.candidates[0].licenseCode, "PEXELS");
    assert.equal(success.candidates[0].creatorName, "TapConnect Fixture Studio");
    assert.equal(success.nextPage, 2);

    const pageTwo = await new PexelsProvider({
      fixture: true,
      fixtureScenario: "success",
    }).search({ query: "cafe", page: 2 });
    assert.equal(pageTwo.ok && pageTwo.candidates[0].providerAssetId, "41003");

    const empty = await new PexelsProvider({
      fixture: true,
      fixtureScenario: "empty",
    }).search({ query: "nothing" });
    assert.equal(empty.ok && empty.candidates.length, 0);

    for (const [scenario, status] of [
      ["unauthorized", 401],
      ["forbidden", 403],
      ["rate_limited", 429],
      ["outage", 503],
      ["timeout", 504],
    ] as const) {
      const result = await new PexelsProvider({
        fixture: true,
        fixtureScenario: scenario,
      }).search({ query: "test" });
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.status, status);
    }
  });

  it("normalizes Logo.dev variants without exposing the token", async () => {
    process.env.LOGO_DEV_TOKEN = "must-never-leave-server";
    const result = await new LogoDevProvider({
      fixture: true,
      fixtureScenario: "success",
    }).search({ query: "Acme", theme: "dark", greyscale: true });
    assert.equal(result.ok, true);
    assert.doesNotMatch(JSON.stringify(result), /must-never-leave-server/);
    if (!result.ok) return;
    assert.equal(result.candidates[0].licenseCode, "NO_LICENSE_ASSERTED");
    assert.deepEqual(result.candidates[0].treatment, {
      theme: "dark",
      greyscale: true,
    });

    const empty = await new LogoDevProvider({
      fixture: true,
      fixtureScenario: "empty",
    }).search({ query: "none" });
    assert.equal(empty.ok && empty.candidates.length, 0);
    const unavailable = await new LogoDevProvider({
      fixture: true,
      fixtureScenario: "unavailable",
    }).search({ query: "none" });
    assert.equal(unavailable.ok, false);
    if (!unavailable.ok) assert.equal(unavailable.code, "not_configured");
  });

  it("maps a live Pexels timeout deterministically", async () => {
    const provider = new PexelsProvider({
      apiKey: "server-secret",
      fetchImpl: async () => {
        throw new DOMException("timed out", "TimeoutError");
      },
    });
    const result = await provider.search({ query: "timeout" });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "timeout");
    assert.doesNotMatch(JSON.stringify(result), /server-secret/);
  });
});

describe("remote image limits", () => {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);

  it("blocks private/reserved hosts and accepts public addresses", () => {
    assert.equal(isPublicIpAddress("127.0.0.1"), false);
    assert.equal(isPublicIpAddress("10.0.0.1"), false);
    assert.equal(isPublicIpAddress("169.254.169.254"), false);
    assert.equal(isPublicIpAddress("::1"), false);
    assert.equal(isPublicIpAddress("2001:db8::1"), false);
    assert.equal(isPublicIpAddress("8.8.8.8"), true);
    assert.equal(parseSafeRemoteUrl("https://images.example.com/photo.png").protocol, "https:");
    for (const unsafeUrl of [
      "not a URL",
      "http://images.example.com/photo.png",
      "https://user:password@images.example.com/photo.png",
      "https://images.example.com:8443/photo.png",
    ]) {
      assert.throws(
        () => parseSafeRemoteUrl(unsafeUrl),
        (error: unknown) =>
          error instanceof RemoteMediaError && error.code === "invalid_url"
      );
    }
    assert.equal(REMOTE_MEDIA_TIMEOUT_MS, 12_000);
  });

  it("enforces byte-sniffed MIME and size", () => {
    assert.equal(
      validateRemoteImageBytes({
        bytes: png,
        declaredMime: "image/png",
        declaredSize: png.length,
      }),
      "image/png"
    );
    assert.throws(
      () => validateRemoteImageBytes({ bytes: png, declaredMime: "text/html" }),
      (error: unknown) =>
        error instanceof RemoteMediaError &&
        error.code === "unsupported_mime" &&
        error.status === 415
    );
    assert.throws(
      () =>
        validateRemoteImageBytes({
          bytes: png,
          declaredMime: "image/png",
          declaredSize: MAX_MEDIA_BYTES + 1,
        }),
      (error: unknown) =>
        error instanceof RemoteMediaError &&
        error.code === "too_large" &&
        error.status === 413
    );
  });
});

describe("document media references", () => {
  it("collects Card and Email mediaAssetId paths while keeping URL fallbacks", () => {
    const references = collectDocumentMediaReferences({
      sections: [
        {
          type: "creative_composition",
          nodes: [
            {
              props: {
                mediaAssetId: "asset-one",
                src: "https://media.example/one.jpg",
              },
            },
          ],
        },
        {
          type: "hero_image",
          data: {
            mediaAssetId: "asset-one",
            imageUrl: "https://media.example/one.jpg",
          },
        },
      ],
    });
    assert.equal(references.length, 2);
    assert.ok(references.every((item) => item.mediaAssetId === "asset-one"));
  });
});

describe("fixture local storage", () => {
  it("is server-controlled, durable, and disabled in production", async () => {
    const originalMode = process.env.CREATIVE_PROVIDER_MODE;
    const originalNodeEnv = process.env.NODE_ENV;
    const storageKey = `owner-test/local-${nanoid()}.png`;
    try {
      setNodeEnv("test");
      process.env.CREATIVE_PROVIDER_MODE = "fixture";
      assert.equal(localMediaStorageEnabled(), true);
      const url = await putMediaObject({
        storageKey,
        bytes: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        mimeType: "image/png",
      });
      assert.match(url, /^\/api\/media\/local\?key=/);
      assert.equal((await readLocalMediaObject(storageKey)).byteLength, 8);

      setNodeEnv("production");
      assert.equal(localMediaStorageEnabled(), false);
    } finally {
      setNodeEnv(originalNodeEnv);
      if (originalMode === undefined) delete process.env.CREATIVE_PROVIDER_MODE;
      else process.env.CREATIVE_PROVIDER_MODE = originalMode;
      setNodeEnv("test");
      process.env.CREATIVE_PROVIDER_MODE = "fixture";
      await deleteMediaObject(storageKey);
      setNodeEnv(originalNodeEnv);
      if (originalMode === undefined) delete process.env.CREATIVE_PROVIDER_MODE;
      else process.env.CREATIVE_PROVIDER_MODE = originalMode;
    }
  });
});

describe("Owner-facing usage labels", () => {
  it("keeps raw document paths out of primary labels", () => {
    assert.equal(
      ownerMediaUsageLabel("CARD", "$.tapCard.sections[0].composition.nodes[0]"),
      "Card composition"
    );
    assert.equal(
      ownerMediaUsageLabel("EMAIL", "$.formSettings.emailResponse.blocks[0]"),
      "Email hero"
    );
    assert.equal(ownerMediaUsageLabel("CAMPAIGN", "$.contentBlocks[0]"), "Campaign creative");
  });
});

const databaseAvailable = Boolean(process.env.DATABASE_URL);

describe(
  "durable tenant media truth",
  { skip: databaseAvailable ? false : "DATABASE_URL is required for integration proof" },
  () => {
    let businessId = "";
    let otherBusinessId = "";
    let userId = "";

    beforeEach(async () => {
      const suffix = nanoid(8).toLowerCase();
      const user = await prisma.user.create({
        data: { email: `slice1-${suffix}@tapconnect.test` },
      });
      userId = user.id;
      const business = await prisma.business.create({
        data: {
          name: `Slice 1 ${suffix}`,
          slug: `slice-1-${suffix}`,
          users: { create: { userId, role: "OWNER" } },
        },
      });
      businessId = business.id;
      const other = await prisma.business.create({
        data: { name: `Other ${suffix}`, slug: `other-${suffix}` },
      });
      otherBusinessId = other.id;
    });

    after(async () => {
      await prisma.$disconnect();
    });

    it("persists Favorites, Recent, Card/Email usage and approval per tenant", async () => {
      const asset = await prisma.mediaAsset.create({
        data: {
          businessId,
          url: `https://media.fixture/${nanoid()}.jpg`,
          mimeType: "image/jpeg",
          source: "upload",
          licenseCode: "OWNER_SUPPLIED",
        },
      });
      await setMediaFavorite({
        businessId,
        userId,
        mediaAssetId: asset.id,
        favorite: true,
      });
      await recordMediaRecent({ businessId, userId, mediaAssetId: asset.id });
      assert.equal(
        await prisma.mediaAssetFavorite.count({
          where: { businessId, userId, mediaAssetId: asset.id },
        }),
        1
      );
      assert.equal(
        await prisma.mediaAssetRecent.count({
          where: { businessId, userId, mediaAssetId: asset.id },
        }),
        1
      );
      await assert.rejects(
        setMediaFavorite({
          businessId: otherBusinessId,
          userId,
          mediaAssetId: asset.id,
          favorite: true,
        }),
        /not found/
      );

      await recordSavedDocumentAssetUsage({
        businessId,
        userId,
        surface: "CARD",
        subjectId: "card-brand-kit",
        usages: [{ mediaAssetId: asset.id, documentPath: "$.tapCard.sections[0]" }],
      });
      await recordSavedDocumentAssetUsage({
        businessId,
        userId,
        surface: "EMAIL",
        subjectId: "campaign-email",
        usages: [{ mediaAssetId: asset.id, documentPath: "$.email.blocks[0]" }],
      });
      const usages = await prisma.creativeAssetUsage.findMany({
        where: { businessId, mediaAssetId: asset.id },
        orderBy: { surface: "asc" },
      });
      assert.deepEqual(
        usages.map((usage) => usage.surface),
        ["CARD", "EMAIL"]
      );

      await assert.rejects(resolveApprovedBrandLogo(businessId, asset.id), /Approve/);
      await setMediaApproval({
        businessId,
        userId,
        mediaAssetId: asset.id,
        approved: true,
      });
      assert.equal((await resolveApprovedBrandLogo(businessId, asset.id)).id, asset.id);
      await assert.rejects(resolveApprovedBrandLogo(otherBusinessId, asset.id), /Approve/);

      const sessionUser = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: { memberships: { include: { business: true } } },
      });
      assert.equal(canApproveBrandMedia(sessionUser, businessId), true);
    });

    it("imports immutable provider provenance and leaves failed imports atomic", async () => {
      const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
      const dependencies: MediaImportDependencies = {
        fetchRemoteImage: async (url) => ({
          finalUrl: url,
          bytes: jpeg,
          mimeType: "image/jpeg",
          declaredSize: jpeg.length,
        }),
        putMediaObject: async ({ storageKey }) =>
          `https://media.fixture.tapconnect.test/${storageKey}`,
        deleteMediaObject: async () => undefined,
      };
      const payload = verifyProviderCandidate(
        signProviderCandidate(businessId, pexelsCandidate),
        businessId
      );
      const imported = await importProviderCandidate(payload, dependencies);
      assert.equal(imported.businessId, businessId);
      assert.equal(imported.provider, "pexels");
      assert.equal(imported.providerAssetId, "fixture-41001");
      assert.equal(imported.creatorName, "Fixture Photographer");
      assert.equal(imported.licenseCode, "PEXELS");
      assert.equal(imported.approvalStatus, "UNREVIEWED");
      assert.match(imported.storageKey || "", new RegExp(`^${businessId}/imports/pexels/`));

      const failedCandidate = {
        ...pexelsCandidate,
        providerAssetId: "fixture-failed",
        importDescriptor: {
          imageUrl: "https://images.pexels.com/photos/999/failed.jpeg",
        },
      };
      const failedPayload = verifyProviderCandidate(
        signProviderCandidate(businessId, failedCandidate),
        businessId
      );
      await assert.rejects(
        importProviderCandidate(failedPayload, {
          ...dependencies,
          fetchRemoteImage: async () => {
            throw new RemoteMediaError("invalid MIME", "unsupported_mime", 415);
          },
        }),
        /invalid MIME/
      );
      assert.equal(
        await prisma.mediaAsset.count({
          where: {
            businessId,
            provider: "pexels",
            providerAssetId: "fixture-failed",
          },
        }),
        0
      );
    });

    it("imports fixture bytes into durable local storage without provider hotlinks", async () => {
      const originalMode = process.env.CREATIVE_PROVIDER_MODE;
      const originalNodeEnv = process.env.NODE_ENV;
      let storageKey: string | null = null;
      try {
        setNodeEnv("test");
        process.env.CREATIVE_PROVIDER_MODE = "fixture";
        const candidate = {
          ...pexelsCandidate,
          providerAssetId: `fixture-local-${nanoid()}`,
        };
        const payload = verifyProviderCandidate(
          signProviderCandidate(businessId, candidate),
          businessId
        );
        const imported = await importProviderCandidate(payload);
        storageKey = imported.storageKey;
        assert.match(imported.url, /^\/api\/media\/local\?key=/);
        assert.doesNotMatch(imported.url, /images\.pexels\.com/);
        assert.ok(storageKey);
        assert.ok((await readLocalMediaObject(storageKey)).byteLength > 100);
      } finally {
        if (storageKey) await deleteMediaObject(storageKey);
        setNodeEnv(originalNodeEnv);
        if (originalMode === undefined) delete process.env.CREATIVE_PROVIDER_MODE;
        else process.env.CREATIVE_PROVIDER_MODE = originalMode;
      }
    });
  }
);
