import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTION_PRESENTATION_EFFECTS_CONTRACT,
  actionPresentationEffectCapability,
  actionPresentationEffectPatch,
  readActionPresentationEffects,
} from "../action-presentation-effects";

test("shared action effects preserve one state grammar across Standard and Compact actions", () => {
  const standard = actionPresentationEffectCapability("standard-button");
  const compact = actionPresentationEffectCapability("compact-neutral");
  assert.equal(standard.contractId, ACTION_PRESENTATION_EFFECTS_CONTRACT);
  assert.equal(compact.contractId, ACTION_PRESENTATION_EFFECTS_CONTRACT);
  assert.ok(standard.interactions.includes("lift-press"));
  assert.ok(compact.motions.includes("highlight_sweep"));
  const settings = readActionPresentationEffects({ actionEffectsEnabled: true, actionGlow: true, actionInteraction: "lift-press", motionPreset: "highlight_sweep", motionIntensity: 36, motionSpeedSeconds: 3.2, reducedMotionFallback: "static_highlight" }, "standard-button");
  assert.deepEqual(actionPresentationEffectPatch(settings), {
    actionEffectsEnabled: true,
    actionGlow: true,
    actionInteraction: "lift-press",
    motionPreset: "highlight_sweep",
    motionIntensity: 36,
    motionSpeedSeconds: 3.2,
    motionDelaySeconds: 0,
    motionPlay: "gentle_repeat",
    motionTrigger: "load",
    reducedMotionFallback: "static_highlight",
  });
});

test("artist masters use a restrained declared wrapper capability while governed Curated chassis fail closed", () => {
  const loveAndTheft = actionPresentationEffectCapability("everencore-love-and-theft-pick");
  assert.equal(loveAndTheft.enabled, true);
  assert.ok(loveAndTheft.motions.includes("soft_float"));
  assert.ok(!loveAndTheft.motions.includes("shine_sweep"));
  const rejected = readActionPresentationEffects({ actionEffectsEnabled: true, motionPreset: "shine_sweep" }, "everencore-love-and-theft-pick");
  assert.equal(rejected.motion, "none");
  const curated = actionPresentationEffectCapability("curated-governed");
  assert.equal(curated.enabled, false);
  assert.match(curated.reason || "", /family-certified/);
});

test("Compact Tile canonical effect records round-trip without legacy aliases", () => {
  const settings = readActionPresentationEffects({ enabled: true, glow: true, interaction: "press", motion: "soft_float", intensity: 28, durationSeconds: 4.1, delaySeconds: .2, play: "interaction", trigger: "hover", reducedMotionFallback: "static_glow" }, "compact-neutral");
  assert.deepEqual(settings, {
    enabled: true,
    glow: true,
    interaction: "press",
    motion: "soft_float",
    intensity: 28,
    durationSeconds: 4.1,
    delaySeconds: .2,
    play: "interaction",
    trigger: "hover",
    reducedMotionFallback: "static_glow",
  });
});
