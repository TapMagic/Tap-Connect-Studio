import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultTapConnectCard } from "@/lib/brand/tap-card";
import {
  defaultUtilityLayerSettings,
  resolveCardUtilityLayer,
  utilityLayerWhereUsedSummary,
} from "@/lib/fusion/card/utility-layer";

describe("card utility layer", () => {
  const profile = {
    displayName: "Demo Cafe",
    organization: "Demo Cafe",
    phone: "+15555550100",
    email: "demo@example.invalid",
    address: "100 Seed Street",
  };

  it("resolves Keep + Ask a Question + Save Contact when features are on", () => {
    const card = defaultTapConnectCard({
      businessName: "Demo Cafe",
      profile,
      accentColor: "#f59e0b",
    });
    card.utilityLayer = defaultUtilityLayerSettings();
    card.sections.push({
      id: "support_1",
      type: "action",
      enabled: true,
      order: 99,
      actionKind: "support",
      label: "Ask a Question",
    });

    const layer = resolveCardUtilityLayer({
      card,
      profile,
      featureEnabled: () => true,
      keepCardEnabled: true,
    });

    assert.equal(layer.enabled, true);
    assert.equal(layer.visible, true);
    assert.ok(layer.utilities.some((u) => u.kind === "keep" && u.eligible));
    assert.ok(layer.utilities.some((u) => u.kind === "support" && u.eligible));
    assert.ok(layer.utilities.some((u) => u.kind === "vcard" && u.eligible));
    assert.match(utilityLayerWhereUsedSummary(layer), /Ask a Question/);
  });

  it("keeps support eligible from host toggle without digital_card block", () => {
    const card = defaultTapConnectCard({ businessName: "Demo", profile });
    card.utilityLayer = {
      enabled: true,
      presentation: "compact_row",
      utilities: [{ kind: "support", enabled: true, label: "Ask a Question" }],
    };
    // Remove any support section — layer should still resolve support
    card.sections = card.sections.filter((s) => s.actionKind !== "support");

    const layer = resolveCardUtilityLayer({
      card,
      profile,
      featureEnabled: (id) => id === "card.fuse.support" || id === "comms.inbox",
      keepCardEnabled: false,
    });

    const support = layer.utilities.find((u) => u.kind === "support");
    assert.ok(support);
    assert.equal(support?.eligible, true);
  });

  it("hides layer when card is retired", () => {
    const card = defaultTapConnectCard({ businessName: "Demo", profile });
    card.lifecycleStatus = "retired";
    card.utilityLayer = defaultUtilityLayerSettings();
    const layer = resolveCardUtilityLayer({
      card,
      profile,
      featureEnabled: () => true,
      keepCardEnabled: true,
    });
    assert.equal(layer.enabled, false);
    assert.equal(layer.visible, false);
  });

  it("gates support when features are off", () => {
    const card = defaultTapConnectCard({ businessName: "Demo", profile });
    card.utilityLayer = defaultUtilityLayerSettings();
    const layer = resolveCardUtilityLayer({
      card,
      profile,
      featureEnabled: () => false,
      keepCardEnabled: true,
    });
    const support = layer.utilities.find((u) => u.kind === "support");
    assert.ok(support);
    assert.equal(support?.eligible, false);
  });

  it("renders only explicitly included utilities and preserves order, destination, icon and style", () => {
    const card = defaultTapConnectCard({ businessName: "Demo", profile });
    card.utilityLayer = {
      enabled: true,
      presentation: "compact_row",
      utilities: [
        { kind: "support", enabled: false, order: 0 },
        { kind: "call", enabled: true, label: "Call the cafe", icon: "phone", order: 1, style: "solid", destination: "tel:+15555550100", sourceMode: "CUSTOM" },
        { kind: "keep", enabled: true, order: 2 },
      ],
    };
    const layer = resolveCardUtilityLayer({ card, profile, featureEnabled: () => true, keepCardEnabled: true });
    assert.equal(layer.utilities.some((utility) => utility.kind === "support"), false);
    const call = layer.utilities.find((utility) => utility.kind === "call");
    assert.deepEqual(call && { href: call.href, icon: call.icon, style: call.style, sourceMode: call.sourceMode }, {
      href: "tel:+15555550100", icon: "phone", style: "solid", sourceMode: "CUSTOM",
    });
    assert.deepEqual(layer.utilities.slice(0, 2).map((utility) => utility.kind), ["call", "keep"]);
  });
});
