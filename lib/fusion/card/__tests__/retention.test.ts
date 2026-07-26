import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  detectRetentionDevice,
  homescreenInstructions,
  orderRetentionMethods,
  planRetentionMethods,
  RETENTION_UPDATES_COPY,
  walletActionLabel,
  walletCustomerState,
  WALLET_CUSTOMER_STATE_LABEL,
} from "@/lib/fusion/card/retention";
import { buildVCard } from "@/lib/brand/contact-profile";

describe("retention recommended path", () => {
  it("recommends Apple Wallet on eligible iPhone with live Wallet", () => {
    const plan = planRetentionMethods({
      device: "ios",
      walletMode: "live",
      walletFeatureOn: true,
    });
    assert.equal(plan.primary.id, "apple_wallet");
    assert.equal(plan.primary.label, "Add to Apple Wallet");
    assert.deepEqual(
      plan.secondary.map((m) => m.id),
      ["homescreen", "save_contact"]
    );
    assert.ok(plan.more.some((m) => m.id === "email_card"));
    assert.ok(plan.more.some((m) => m.id === "copy_link"));
  });

  it("recommends Home Screen on iPhone without live Wallet — demo Wallet in More", () => {
    const plan = planRetentionMethods({
      device: "ios",
      walletMode: "preview",
      walletFeatureOn: true,
    });
    assert.equal(plan.primary.id, "homescreen");
    assert.deepEqual(
      plan.secondary.map((m) => m.id),
      ["save_contact"]
    );
    const demo = plan.more.find((m) => m.id === "apple_wallet");
    assert.ok(demo);
    assert.equal(demo?.demoOnly, true);
    assert.equal(demo?.badge, "Demo");
    assert.match(demo?.label ?? "", /Preview/i);
  });

  it("omits Wallet when feature off", () => {
    const plan = planRetentionMethods({
      device: "ios",
      walletMode: "preview",
      walletFeatureOn: false,
    });
    assert.equal(plan.primary.id, "homescreen");
    assert.ok(!plan.more.some((m) => m.id === "apple_wallet"));
    assert.ok(!orderRetentionMethods({
      device: "ios",
      walletMode: "preview",
      walletFeatureOn: false,
    }).some((m) => m.id === "apple_wallet"));
  });

  it("recommends Email on desktop with QR + Save Contact secondary", () => {
    const plan = planRetentionMethods({
      device: "desktop",
      walletMode: "preview",
      walletFeatureOn: true,
    });
    assert.equal(plan.primary.id, "email_card");
    assert.ok(plan.secondary.some((m) => m.id === "show_qr"));
    assert.ok(plan.secondary.some((m) => m.id === "save_contact"));
    assert.ok(plan.secondary.some((m) => m.id === "copy_link"));
  });

  it("keeps flat order helper for callers", () => {
    const methods = orderRetentionMethods({
      device: "desktop",
      walletMode: "preview",
      walletFeatureOn: true,
    });
    assert.equal(methods[0]?.id, "email_card");
    assert.ok(methods.some((m) => m.id === "homescreen"));
  });
});

describe("homescreen honesty copy", () => {
  it("gives short iOS steps without claiming success", () => {
    const guide = homescreenInstructions("ios");
    assert.ok(guide.steps.length <= 4);
    assert.match(guide.note, /can’t finish|can't finish|phone confirms/i);
  });
});

describe("useful updates consent copy", () => {
  it("is benefit-led and unsubscribe-clear", () => {
    assert.match(RETENTION_UPDATES_COPY.label, /useful updates/i);
    assert.match(RETENTION_UPDATES_COPY.detail, /Unsubscribe/i);
  });
});

describe("wallet customer states", () => {
  it("maps mock ISSUED to preview_only — not Installed", () => {
    const state = walletCustomerState({
      providerStatus: "ISSUED",
      mock: true,
      liveReady: false,
      device: "ios",
      hasPass: true,
    });
    assert.equal(state, "preview_only");
    assert.equal(WALLET_CUSTOMER_STATE_LABEL[state], "Preview only");
    assert.equal(
      walletActionLabel({ state, mock: true, hasPass: true }),
      "Manage preview"
    );
  });

  it("maps live ISSUED to installed", () => {
    const state = walletCustomerState({
      providerStatus: "ISSUED",
      mock: false,
      liveReady: true,
      device: "ios",
      hasPass: true,
    });
    assert.equal(state, "installed");
  });

  it("detects iOS from user agent", () => {
    assert.equal(
      detectRetentionDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"),
      "ios"
    );
  });
});

describe("vCard Living Card URL", () => {
  it("labels permanent Card URL as Living Card", () => {
    const vcf = buildVCard({
      fullName: "Demo Cafe",
      organization: "Demo Cafe",
      website: "https://example.com",
      livingCardUrl: "https://app.example/t/seeddemo01",
    });
    assert.match(vcf, /item1\.URL:https:\/\/app\.example\/t\/seeddemo01/);
    assert.match(vcf, /item1\.X-ABLabel:Living Card/);
    assert.match(vcf, /URL:https:\/\/example\.com/);
  });
});
