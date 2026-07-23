import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMockWalletAdapter } from "../adapters";
import {
  listWalletCredentialBlockers,
  projectCardToWalletPass,
} from "../types";
import { createWalletInstallLink, summarizeWalletReadiness } from "../mock-adapter";

describe("Wallet mock adapter", () => {
  it("projects card without secrets", () => {
    const p = projectCardToWalletPass({
      platform: "apple",
      businessName: "Acme",
      cardTitle: "VIP",
      tapUrl: "https://example.com/t/x",
    });
    assert.equal(p.organizationName, "Acme");
    assert.equal(p.barcodeMessage, "https://example.com/t/x");
    assert.match(p.serialNumber, /^tc_apple_/);
  });

  it("issues via mock without credentials", async () => {
    const adapter = createMockWalletAdapter("apple");
    const result = await adapter.issue({
      cardId: "c1",
      businessId: "b1",
      provider: "apple",
      serial: "s1",
      version: 1,
      branding: {},
      fields: [],
      deepLinkUrl: "",
      status: "draft",
    });
    assert.equal(result.ok, true);
    assert.equal(result.mock, true);
    assert.match(result.externalId, /^mock_apple_/);
  });

  it("preview succeeds on mock path", async () => {
    const adapter = createMockWalletAdapter("google");
    const result = await adapter.preview({
      cardId: "c1",
      businessId: "b1",
      provider: "google",
      serial: "s2",
      version: 1,
      branding: {},
      fields: [],
      deepLinkUrl: "",
      status: "draft",
    });
    assert.equal(result.ok, true);
    assert.equal(result.mock, true);
  });

  it("respects feature_off on install link", () => {
    const r = createWalletInstallLink({
      platform: "apple",
      businessName: "Acme",
      cardTitle: "Card",
      tapUrl: "https://x.test",
      featureEnabled: false,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, "feature_off");
  });

  it("summarizes readiness with blockers", () => {
    const s = summarizeWalletReadiness(true);
    assert.equal(s.featureEnabled, true);
    const blockers = listWalletCredentialBlockers();
    assert.ok(Array.isArray(blockers.apple));
    assert.ok(Array.isArray(blockers.google));
  });
});
