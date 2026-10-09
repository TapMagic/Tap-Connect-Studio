import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { experiencePublicSlug, prepareIndependentExperienceDraft } from "@/lib/fusion/card/experience-library";
import { evaluateExperienceCredential, hashExperienceCredential } from "@/lib/fusion/card/experience-access-credentials";
import { resolvePublishedEverEncoreExperience } from "@/lib/fusion/card/public-experience-registry";

describe("Experience Library authority", () => {
  it("clones a complete Experience with independent document, Page, and analytics identities", () => {
    const source = resolvePublishedEverEncoreExperience("love-and-theft")!.config;
    const clone = prepareIndependentExperienceDraft(source, "Love & Theft Client Draft");
    assert.equal(clone.documentName, "Love & Theft Client Draft");
    assert.notEqual(clone.experience?.experienceId, source.experience?.experienceId);
    assert.notEqual(clone.experience?.analyticsId, source.experience?.analyticsId);
    assert.equal(clone.experience?.pages.length, source.experience?.pages.length);
    assert.deepEqual(clone.experience?.pages.map((page) => page.title), source.experience?.pages.map((page) => page.title));
    assert.notDeepEqual(clone.experience?.pages.map((page) => page.pageId), source.experience?.pages.map((page) => page.pageId));
    assert.equal(new Set(clone.experience?.pages.map((page) => page.analyticsId)).size, clone.experience?.pages.length);

    const music = clone.experience?.pages.find((page) => page.title === "Music");
    const backstage = clone.experience?.pages.find((page) => page.title === "Backstage Interview");
    const gridNode = music?.composition.rootComposition?.nodes.find((node) => node.props.compactActionGrid);
    const tiles = (gridNode?.props.compactActionGrid as { tiles?: Array<{ label?: string; destinationRef?: string }> })?.tiles ?? [];
    assert.equal(tiles.find((tile) => tile.label === "Backstage")?.destinationRef, backstage?.pageId);
  });

  it("creates stable, URL-safe public slug candidates", () => {
    assert.equal(experiencePublicSlug("Love & Theft"), "love-and-theft");
    assert.equal(experiencePublicSlug("  Train — VIP Experience  "), "train-vip-experience");
  });

  it("stores only a deterministic digest for opaque QR credentials", () => {
    const token = "permanent-credential-secret";
    const digest = hashExperienceCredential(token);
    assert.equal(digest, hashExperienceCredential(token));
    assert.equal(digest.length, 64);
    assert.equal(digest.includes(token), false);
    assert.notEqual(digest, hashExperienceCredential(`${token}-rotated`));
  });

  it("governs revocation, expiry, and limited redemption on the server contract", () => {
    const now = new Date("2026-10-08T12:00:00.000Z");
    assert.equal(evaluateExperienceCredential({ status: "ACTIVE", expiresAt: null, redemptionLimit: null, redemptionCount: 500 }, now), "valid");
    assert.equal(evaluateExperienceCredential({ status: "REVOKED", expiresAt: null, redemptionLimit: null, redemptionCount: 0 }, now), "revoked");
    assert.equal(evaluateExperienceCredential({ status: "ACTIVE", expiresAt: new Date("2026-10-08T11:59:59.000Z"), redemptionLimit: null, redemptionCount: 0 }, now), "expired");
    assert.equal(evaluateExperienceCredential({ status: "ACTIVE", expiresAt: null, redemptionLimit: 1, redemptionCount: 1 }, now), "exhausted");
  });
});
