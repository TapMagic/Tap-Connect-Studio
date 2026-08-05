import test from "node:test";
import assert from "node:assert/strict";
import { insertRootContainerPreset } from "../composer-model";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";

function card(): TapConnectCardConfig {
  return { sections: [], accentColor: "#b8ff2c", surfaceColor: "#111827", textColor: "#ffffff", headerEnergy: 50 } as unknown as TapConnectCardConfig;
}

test("new premium presets are one root Container with independently selectable children", () => {
  const result = insertRootContainerPreset(card(), "offer");
  assert.equal(result.config.sections.length, 0, "does not write legacy Section stream");
  const root = result.config.rootComposition!;
  const container = root.nodes.find((node) => node.id === result.containerId)!;
  assert.equal(container.props.componentKind, "container");
  assert.equal(container.props.presetId, "offer");
  assert.ok(root.nodes.length > 2);
  assert.ok(root.nodes.filter((node) => node.props.containerId === container.id).every((node) => node.groupId === container.groupId));
  assert.ok(root.nodes.every((node) => node.x >= 0 && node.y >= 0 && node.x + node.width <= 1.001));
});

test("repeated presets cascade and preserve independent identity", () => {
  const first = insertRootContainerPreset(card(), "identity");
  const second = insertRootContainerPreset(first.config, "identity");
  const containers = second.config.rootComposition!.nodes.filter((node) => node.props.componentKind === "container");
  assert.equal(containers.length, 2);
  assert.notEqual(containers[0]!.id, containers[1]!.id);
  assert.notDeepEqual({ x: containers[0]!.x, y: containers[0]!.y }, { x: containers[1]!.x, y: containers[1]!.y });
});
