import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  __resetCardEditorLiveForTests,
  cardEditorLiveMaterialSignature,
  getCardEditorLive,
  getCardEditorLiveGeneration,
  publishCardEditorLive,
  subscribeCardEditorLive,
  type CardEditorLiveModel,
} from "@/components/fusion/card/card-editor-live";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";

function baseConfig(): TapConnectCardConfig {
  return {
    sections: [],
    accentColor: "#00ff88",
    surfaceColor: "#111",
    textColor: "#fff",
  } as unknown as TapConnectCardConfig;
}

function stubModel(
  overrides: Partial<CardEditorLiveModel> = {}
): CardEditorLiveModel {
  const noop = () => undefined;
  return {
    config: baseConfig(),
    selected: null,
    sorted: [],
    brandState: {
      useBrandKit: true,
      overrides: {},
    } as unknown as CardEditorLiveModel["brandState"],
    mediaUploadReady: false,
    stockReady: false,
    freeformEnabled: false,
    showFreeform: false,
    isAdmin: false,
    demoPublished: false,
    versions: [],
    message: null,
    profile: {} as CardEditorLiveModel["profile"],
    businessName: "Demo Biz",
    pastLabels: [],
    futureLabels: [],
    canUndo: false,
    canRedo: false,
    onUndo: noop,
    onRedo: noop,
    onBrandStateChange: noop,
    patchConfig: noop,
    patchConfigColor: noop,
    patchSection: noop,
    patchCompositionNode: noop,
    onAddSection: noop,
    onAddAction: noop,
    setSelectedId: noop,
    setShowFreeform: noop,
    onRetireToggle: noop,
    onPublishDemo: noop,
    onRollback: noop,
    strInherited: () => undefined,
    onTestAction: noop,
    reorderSections: noop,
    moveSectionBy: noop,
    moveSectionTo: noop,
    duplicateSection: noop,
    copySection: noop,
    deleteSection: noop,
    toggleSectionVisible: noop,
    toggleSectionLocked: noop,
    ...overrides,
  };
}

describe("card-editor-live store — no reciprocal notify storms", () => {
  beforeEach(() => {
    __resetCardEditorLiveForTests();
  });

  it("does not notify when only callback identity changes", () => {
    let notifies = 0;
    const unsub = subscribeCardEditorLive(() => {
      notifies += 1;
    });
    publishCardEditorLive(stubModel({ onUndo: () => undefined }));
    assert.equal(notifies, 1);
    const genAfterFirst = getCardEditorLiveGeneration();
    // Re-publish identical material with new function identities (render churn).
    for (let i = 0; i < 50; i += 1) {
      publishCardEditorLive(
        stubModel({
          onUndo: () => undefined,
          onRedo: () => undefined,
          patchConfig: () => undefined,
        })
      );
    }
    assert.equal(notifies, 1, "callback-only republish must not notify");
    assert.equal(getCardEditorLiveGeneration(), genAfterFirst);
    assert.ok(getCardEditorLive()?.onUndo);
    unsub();
  });

  it("notifies once when material config changes", () => {
    let notifies = 0;
    subscribeCardEditorLive(() => {
      notifies += 1;
    });
    publishCardEditorLive(stubModel());
    publishCardEditorLive(
      stubModel({
        config: {
          ...baseConfig(),
          accentColor: "#ff0000",
        } as unknown as TapConnectCardConfig,
      })
    );
    assert.equal(notifies, 2);
  });

  it("survives the historical Maximum update depth pattern", () => {
    /**
     * Reproduction of the rescue bug:
     * subscribe → setState-like counter → republish from "effect" with new
     * pastLabels array identity but same contents → must not recurse.
     */
    let mirrorTicks = 0;
    let previewRevision = 1;
    const unsub = subscribeCardEditorLive(() => {
      // Old authoring-workspace behavior (unsafe):
      mirrorTicks += 1;
      previewRevision += 1;
      if (mirrorTicks > 25) {
        throw new Error("Maximum update depth exceeded (reproduced)");
      }
    });

    let labels: string[] = [];
    const publishFromBuilderEffect = () => {
      // New array identity each time — previously in useEffect deps.
      labels = labels.slice();
      publishCardEditorLive(stubModel({ pastLabels: labels }));
    };

    publishFromBuilderEffect();
    // Simulate 40 parent re-renders that re-run the publish effect with
    // equivalent material but new callback / array wrappers handled by store.
    for (let i = 0; i < 40; i += 1) {
      publishCardEditorLive(
        stubModel({
          pastLabels: labels,
          onUndo: () => undefined,
        })
      );
    }
    assert.equal(mirrorTicks, 1);
    assert.equal(previewRevision, 2);
    // Material label change still notifies once more.
    labels = ["Change label"];
    publishCardEditorLive(stubModel({ pastLabels: labels }));
    assert.equal(mirrorTicks, 2);
    unsub();
  });

  it("material signature ignores callback fields", () => {
    const a = cardEditorLiveMaterialSignature(
      stubModel({ onUndo: () => 1 })
    );
    const b = cardEditorLiveMaterialSignature(
      stubModel({ onUndo: () => 2 })
    );
    assert.equal(a, b);
    const c = cardEditorLiveMaterialSignature(
      stubModel({ message: "Saved" })
    );
    assert.notEqual(a, c);
  });

  it("publish(null) then model notifies for clear/set without looping", () => {
    let notifies = 0;
    subscribeCardEditorLive(() => {
      notifies += 1;
    });
    publishCardEditorLive(stubModel());
    publishCardEditorLive(null);
    publishCardEditorLive(stubModel());
    assert.equal(notifies, 3);
    assert.equal(getCardEditorLive()?.businessName, "Demo Biz");
  });
});
