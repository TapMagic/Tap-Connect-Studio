import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  describeConfigChange,
  describeSectionsChange,
} from "@/lib/fusion/creative-studio/history-labels";
import {
  createLabeledHistory,
  pushLabeledHistory,
  undoLabeledHistory,
  redoLabeledHistory,
} from "@/lib/fusion/authoring/session-history";
import type { TapCardSection, TapConnectCardConfig } from "@/lib/brand/tap-card";

const baseSection = (id: string, patch: Partial<TapCardSection> = {}): TapCardSection => ({
  id,
  type: "action",
  enabled: true,
  order: 0,
  label: "Website",
  actionKind: "website",
  href: "https://example.com",
  ...patch,
});

describe("creative-studio history labels", () => {
  it("describes button label and destination changes", () => {
    const a = [baseSection("1")];
    const b = [baseSection("1", { label: "Visit us" })];
    assert.equal(describeSectionsChange(a, b), "Changed button label");
    const c = [baseSection("1", { href: "https://other.com" })];
    assert.match(describeSectionsChange(a, c), /destination/i);
  });

  it("describes font and point size changes", () => {
    const a = [baseSection("1", { format: { fontSizePx: 16 } })];
    const b = [baseSection("1", { format: { fontSizePx: 24 } })];
    assert.match(describeSectionsChange(a, b), /pt/i);
  });

  it("pushes labeled undo for config snapshots", () => {
    const initial = { sections: [baseSection("1")] } as TapConnectCardConfig;
    let h = createLabeledHistory(initial);
    h = pushLabeledHistory(
      h,
      { ...initial, sections: [baseSection("1", { label: "Go" })] },
      "Changed button label"
    );
    assert.equal(h.past[0]?.label, "Changed button label");
    const undone = undoLabeledHistory(h);
    assert.ok(undone);
    assert.equal(undone!.present.sections[0]?.label, "Website");
    const redone = redoLabeledHistory(undone!);
    assert.equal(redone!.present.sections[0]?.label, "Go");
  });

  it("labels config color changes", () => {
    const prev = { sections: [], accentColor: "#111" } as unknown as TapConnectCardConfig;
    const next = { sections: [], accentColor: "#222" } as unknown as TapConnectCardConfig;
    assert.equal(describeConfigChange(prev, next), "Changed accent color");
  });
});
