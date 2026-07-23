import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allowedWalletActions,
  labelWalletEvidence,
  walletInstallLinkAllowed,
  walletPassEvidenceClass,
  walletReplaceConfirmCopy,
  walletReplaceOutcomeMessage,
} from "../evidence";
import { isInstallable } from "../lifecycle";
import { resolveInstallLinkForPass } from "../mock-adapter";

describe("Wallet evidence + install gating", () => {
  it("labels mock issued passes as modeled", () => {
    assert.equal(walletPassEvidenceClass("ISSUED", true), "modeled");
    assert.equal(labelWalletEvidence("modeled"), "Modeled (not fact)");
  });

  it("labels draft as incomplete", () => {
    assert.equal(walletPassEvidenceClass("DRAFT", false), "incomplete");
    assert.equal(walletPassEvidenceClass("PREVIEWED", true), "incomplete");
  });

  it("labels live issued as confirmed", () => {
    assert.equal(walletPassEvidenceClass("ISSUED", false), "confirmed");
    assert.equal(walletPassEvidenceClass("REVOKED", false), "confirmed");
  });

  it("gates install link on installable status + feature", () => {
    assert.equal(walletInstallLinkAllowed("ISSUED", true), true);
    assert.equal(walletInstallLinkAllowed("DRAFT", true), false);
    assert.equal(walletInstallLinkAllowed("ISSUED", false), false);
    assert.equal(isInstallable("UPDATED"), true);
  });

  it("resolveInstallLinkForPass blocks draft", () => {
    const r = resolveInstallLinkForPass({
      status: "DRAFT",
      platform: "apple",
      serialNumber: "tc_apple_1",
      businessName: "Acme",
      cardTitle: "Card",
      tapUrl: "https://x.test",
      featureEnabled: true,
    });
    assert.equal(r.ok, false);
  });

  it("resolveInstallLinkForPass returns existing url when issued", () => {
    const r = resolveInstallLinkForPass({
      status: "ISSUED",
      platform: "apple",
      serialNumber: "tc_apple_1",
      businessName: "Acme",
      cardTitle: "Card",
      tapUrl: "https://x.test",
      featureEnabled: true,
      existingInstallUrl: "/wallet/install/mock",
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.installUrl, "/wallet/install/mock");
    }
  });

  it("allowedWalletActions omits illegal transitions", () => {
    assert.deepEqual(allowedWalletActions("DRAFT"), ["preview", "issue"]);
    assert.deepEqual(allowedWalletActions("REVOKED"), []);
    assert.deepEqual(allowedWalletActions("ISSUED"), ["update", "revoke", "replace"]);
  });

  it("replace copy explains successor draft", () => {
    assert.match(walletReplaceConfirmCopy(), /REPLACED/);
    assert.match(
      walletReplaceOutcomeMessage({ oldSerial: "tc_apple_old", newSerial: "tc_apple_new" }),
      /successor/i
    );
  });
});
