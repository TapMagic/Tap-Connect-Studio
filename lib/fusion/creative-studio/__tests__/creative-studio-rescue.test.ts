import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FONT_CATALOG,
  FONT_CATALOG_SIZE,
  getFontById,
  searchFonts,
  weightAvailable,
  italicAvailable,
} from "@/lib/fusion/creative-studio/fonts/catalog";
import {
  clampPointSize,
  formatPointSize,
  ptToPx,
  pxToPt,
  resolvePointSize,
} from "@/lib/fusion/creative-studio/fonts/points";
import {
  blocksCustomerActivation,
  isEditMode,
  isPreviewMode,
  isPublicMode,
} from "@/lib/fusion/creative-studio/modes";
import {
  closePanel,
  createPanelStack,
  currentPanel,
  openRootPanel,
  popPanel,
  pushPanel,
} from "@/lib/fusion/creative-studio/panel-stack";
import { selectionPanelForSection } from "@/lib/fusion/creative-studio/selection";
import {
  __clearPreviewSessionsForTests,
  createPreviewSession,
  getPreviewSession,
  revokePreviewSession,
  updatePreviewSession,
  verifyPreviewToken,
} from "@/lib/fusion/creative-studio/preview/tokens";
import { resolvePreviewBaseUrl } from "@/lib/fusion/creative-studio/preview/url";

describe("creative-studio modes", () => {
  it("edit blocks activation; preview and public do not", () => {
    assert.equal(isEditMode("edit"), true);
    assert.equal(blocksCustomerActivation("edit"), true);
    assert.equal(blocksCustomerActivation("preview"), false);
    assert.equal(isPreviewMode("preview"), true);
    assert.equal(isPublicMode("public"), true);
  });
});

describe("creative-studio panel stack", () => {
  it("supports nested push/back/close with memory", () => {
    let state = createPanelStack({ id: "button", title: "Button" });
    state = pushPanel(state, { id: "typography", title: "Typography" });
    state = pushPanel(state, { id: "font", title: "Font" });
    assert.equal(currentPanel(state)?.id, "font");
    state = popPanel(state);
    assert.equal(currentPanel(state)?.id, "typography");
    const closed = closePanel(state);
    assert.equal(closed.stack.length, 0);
    assert.ok(closed.memory.button?.length);
    const restored = openRootPanel(closed, { id: "button", title: "Button" }, {
      restoreMemory: true,
    });
    assert.equal(currentPanel(restored)?.id, "typography");
  });
});

describe("creative-studio selection map", () => {
  it("maps button and directions to contextual panels", () => {
    const button = selectionPanelForSection({ type: "action", actionKind: "website" });
    assert.equal(button.rootTitle, "Website");
    assert.equal(button.toolId, "buttons");
    const directions = selectionPanelForSection({
      type: "action",
      actionKind: "directions",
    });
    assert.equal(directions.rootTitle, "Directions");
  });
});

describe("creative-studio fonts", () => {
  it("ships a substantial open-source catalog", () => {
    assert.ok(FONT_CATALOG_SIZE >= 50);
    assert.ok(FONT_CATALOG.every((f) => f.license === "OFL" || f.license === "Apache-2.0"));
    assert.ok(getFontById("inter"));
    const serif = searchFonts("", { category: "serif" });
    assert.ok(serif.length > 0);
    assert.equal(weightAvailable(getFontById("inter")!, 700), true);
    assert.equal(italicAvailable(getFontById("bebas-neue")!), false);
  });

  it("converts points and pixels consistently", () => {
    assert.equal(ptToPx(12), 16);
    assert.equal(pxToPt(16), 12);
    assert.equal(formatPointSize(36), "36 pt");
    assert.equal(clampPointSize(999), 120);
    assert.equal(
      resolvePointSize({ fontSizePx: 24 }),
      18
    );
  });
});

describe("creative-studio preview tokens", () => {
  it("creates, verifies, updates, expires semantics, and revokes", () => {
    __clearPreviewSessionsForTests();
    process.env.PREVIEW_TOKEN_SECRET = "test-preview-secret";
    const { token, record } = createPreviewSession({
      businessId: "biz_a",
      brandKitId: "bk_1",
      cardName: "Demo Café Card",
      businessName: "Demo Café",
      snapshotJson: JSON.stringify({ sections: [] }),
      profileJson: JSON.stringify({ displayName: "Demo" }),
      revision: 1,
    });
    const verified = verifyPreviewToken(token);
    assert.equal(verified.ok, true);
    const got = getPreviewSession(token);
    assert.equal(got.ok, true);
    if (got.ok) {
      assert.equal(got.record.businessId, "biz_a");
      assert.equal(got.record.cardName, "Demo Café Card");
    }
    const updated = updatePreviewSession(token, {
      snapshotJson: JSON.stringify({ sections: [{ id: "1" }] }),
      revision: 2,
    });
    assert.equal(updated.ok, true);
    const revoked = revokePreviewSession(token);
    assert.equal(revoked.ok, true);
    const after = getPreviewSession(token);
    assert.equal(after.ok, false);
    if (!after.ok) assert.equal(after.reason, "preview_revoked");
    assert.ok(record.sid);
  });

  it("rejects cross-tenant mismatch when record business differs", () => {
    __clearPreviewSessionsForTests();
    process.env.PREVIEW_TOKEN_SECRET = "test-preview-secret";
    const { token } = createPreviewSession({
      businessId: "biz_a",
      brandKitId: "bk_1",
      cardName: "A",
      businessName: "A",
      snapshotJson: "{}",
      profileJson: "{}",
    });
    const got = getPreviewSession(token);
    assert.equal(got.ok, true);
  });
});

describe("creative-studio preview base url", () => {
  it("flags localhost as unreachable for phones", () => {
    const local = resolvePreviewBaseUrl({
      configured: "http://localhost:3000",
    });
    assert.equal(local.reachableForPhone, false);
    assert.equal(local.isLocalhost, true);
    const lan = resolvePreviewBaseUrl({
      configured: "http://192.168.1.20:3000",
    });
    assert.equal(lan.reachableForPhone, true);
  });
});
