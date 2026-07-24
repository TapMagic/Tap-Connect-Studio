import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hashPublishManifest,
  type CampaignPublishManifest,
  type CardPublishManifest,
} from "../snapshots";

describe("publication snapshots", () => {
  it("hashes campaign manifests stably ignoring label", () => {
    const a: CampaignPublishManifest = {
      kind: "campaign",
      title: "A",
      status: "DRAFT",
      contentBlocks: [{ id: "1", type: "headline", data: { headline: "Hi" } }],
      themeOverrides: { primaryColor: "#22c55e" },
      label: "save",
    };
    const b: CampaignPublishManifest = { ...a, label: "publish" };
    assert.equal(hashPublishManifest(a), hashPublishManifest(b));
  });

  it("changes hash when content changes", () => {
    const a: CampaignPublishManifest = {
      kind: "campaign",
      title: "A",
      status: "DRAFT",
      contentBlocks: [{ id: "1", data: { headline: "One" } }],
      themeOverrides: {},
      label: "save",
    };
    const b: CampaignPublishManifest = {
      ...a,
      contentBlocks: [{ id: "1", data: { headline: "Two" } }],
    };
    assert.notEqual(hashPublishManifest(a), hashPublishManifest(b));
  });

  it("hashes card manifests", () => {
    const a: CardPublishManifest = {
      kind: "card",
      tapCard: { sections: [{ id: "s1", type: "hero" }] },
      label: "save",
    };
    const b: CardPublishManifest = {
      kind: "card",
      tapCard: { sections: [{ id: "s1", type: "text" }] },
      label: "save",
    };
    assert.notEqual(hashPublishManifest(a), hashPublishManifest(b));
    assert.equal(hashPublishManifest(a).length, 40);
  });
});
