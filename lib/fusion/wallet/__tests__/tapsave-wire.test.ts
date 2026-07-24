import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isInstallable } from "../lifecycle";
import type { WalletPassRecord } from "../service";
import {
  myTapWalletInstallUrl,
  pickActiveWalletPass,
  shapeMyTapWalletSummary,
} from "../tapsave-wire";

function pass(partial: Partial<WalletPassRecord> & Pick<WalletPassRecord, "id" | "status">): WalletPassRecord {
  return {
    id: partial.id,
    businessId: partial.businessId ?? "biz_1",
    contactId: partial.contactId ?? "contact_1",
    relationshipId: partial.relationshipId ?? "rel_1",
    platform: partial.platform ?? "apple",
    status: partial.status,
    serialNumber: partial.serialNumber ?? "tc_apple_test",
    version: partial.version ?? 1,
    cardId: partial.cardId ?? null,
    externalId: partial.externalId ?? null,
    installUrl: partial.installUrl ?? null,
    previewUrl: partial.previewUrl ?? null,
    replacedById: partial.replacedById ?? null,
    mock: partial.mock ?? true,
    createdAt: partial.createdAt ?? new Date().toISOString(),
    updatedAt: partial.updatedAt ?? new Date().toISOString(),
  };
}

describe("TapSave → Wallet wire (pure helpers)", () => {
  it("pickActiveWalletPass prefers installable pass", () => {
    const draft = pass({ id: "d1", status: "DRAFT", serialNumber: "tc_apple_draft" });
    const issued = pass({ id: "i1", status: "ISSUED", serialNumber: "tc_apple_issued" });
    assert.equal(pickActiveWalletPass([draft, issued])?.id, "i1");
    assert.equal(isInstallable("ISSUED"), true);
  });

  it("pickActiveWalletPass skips terminal passes when newer draft exists", () => {
    const revoked = pass({ id: "r1", status: "REVOKED" });
    const previewed = pass({ id: "p1", status: "PREVIEWED" });
    assert.equal(pickActiveWalletPass([revoked, previewed])?.id, "p1");
  });

  it("myTapWalletInstallUrl encodes serial for public MyTap deep link", () => {
    const url = myTapWalletInstallUrl("pub_tok_abc", "tc_apple_serial+1");
    assert.equal(url, "/mytap/pub_tok_abc?wallet=tc_apple_serial%2B1");
  });

  it("shapeMyTapWalletSummary marks mock path from pass.mock", () => {
    const summary = shapeMyTapWalletSummary(
      pass({
        id: "p1",
        status: "ISSUED",
        mock: true,
        installUrl: null,
        serialNumber: "tc_apple_live",
      }),
      "pub_tok"
    );
    assert.equal(summary.mock, true);
    assert.equal(summary.evidenceLabel, "Modeled — mock adapter");
    assert.ok(summary.installUrl?.includes("/mytap/pub_tok"));
  });

  it("shapeMyTapWalletSummary preserves explicit installUrl", () => {
    const summary = shapeMyTapWalletSummary(
      pass({
        id: "p1",
        status: "ISSUED",
        installUrl: "/custom/install",
      }),
      "pub_tok"
    );
    assert.equal(summary.installUrl, "/custom/install");
  });
});

describe("TapSave → Wallet wire (route exports)", () => {
  it("mytap wallet GET/POST are exportable", async () => {
    const mod = await import("../../../../app/api/mytap/wallet/route");
    assert.equal(typeof mod.GET, "function");
    assert.equal(typeof mod.POST, "function");
  });
});
