import type { MotionPreset } from "./card-creative-system";

export const ACTION_PRESENTATION_EFFECTS_CONTRACT = "actionPresentationEffects@1.0.0" as const;

export type ActionPresentationFamily =
  | "standard-button"
  | "compact-neutral"
  | "everencore-love-and-theft-pick"
  | "curated-governed";

export type ActionInteractionEffect = "none" | "hover-lift" | "press" | "lift-press";
export type ActionMotionEffect = Extract<MotionPreset,
  "none" | "subtle_pulse" | "glow_pulse" | "soft_float" | "shimmer" |
  "highlight_sweep" | "shine_sweep" | "entrance_pop" | "fade_in" | "slide_in" | "scale_in"
>;

export type ActionPresentationEffectSettings = Readonly<{
  enabled: boolean;
  glow: boolean;
  interaction: ActionInteractionEffect;
  motion: ActionMotionEffect;
  intensity: number;
  durationSeconds: number;
  delaySeconds: number;
  play: "once" | "gentle_repeat" | "interaction";
  trigger: "load" | "hover" | "tap" | "attention";
  reducedMotionFallback: "none" | "static_glow" | "static_highlight";
}>;

export type ActionPresentationEffectCapability = Readonly<{
  contractId: typeof ACTION_PRESENTATION_EFFECTS_CONTRACT;
  family: ActionPresentationFamily;
  enabled: boolean;
  glow: boolean;
  interactions: readonly ActionInteractionEffect[];
  motions: readonly ActionMotionEffect[];
  reason?: string;
}>;

const SHARED_MOTIONS: readonly ActionMotionEffect[] = [
  "none", "subtle_pulse", "glow_pulse", "soft_float", "shimmer",
  "highlight_sweep", "shine_sweep", "entrance_pop", "fade_in", "slide_in", "scale_in",
];

const CAPABILITIES: Readonly<Record<ActionPresentationFamily, ActionPresentationEffectCapability>> = {
  "standard-button": { contractId: ACTION_PRESENTATION_EFFECTS_CONTRACT, family: "standard-button", enabled: true, glow: true, interactions: ["none", "hover-lift", "press", "lift-press"], motions: SHARED_MOTIONS },
  "compact-neutral": { contractId: ACTION_PRESENTATION_EFFECTS_CONTRACT, family: "compact-neutral", enabled: true, glow: true, interactions: ["none", "hover-lift", "press", "lift-press"], motions: SHARED_MOTIONS },
  "everencore-love-and-theft-pick": { contractId: ACTION_PRESENTATION_EFFECTS_CONTRACT, family: "everencore-love-and-theft-pick", enabled: true, glow: true, interactions: ["none", "hover-lift", "press", "lift-press"], motions: ["none", "subtle_pulse", "soft_float", "highlight_sweep", "fade_in", "scale_in"] },
  "curated-governed": { contractId: ACTION_PRESENTATION_EFFECTS_CONTRACT, family: "curated-governed", enabled: false, glow: false, interactions: ["none"], motions: ["none"], reason: "Curated assemblies require a family-certified presentation recipe before effects may wrap their governed chassis." },
};

export function actionPresentationEffectCapability(family: ActionPresentationFamily): ActionPresentationEffectCapability {
  return CAPABILITIES[family];
}

function number(value: unknown, fallback: number, min: number, max: number) {
  const candidate = typeof value === "number" ? value : Number(value);
  return Number.isFinite(candidate) ? Math.max(min, Math.min(max, candidate)) : fallback;
}

export function readActionPresentationEffects(
  value: Readonly<Record<string, unknown>>,
  family: ActionPresentationFamily,
): ActionPresentationEffectSettings {
  const capability = actionPresentationEffectCapability(family);
  const motionCandidate = String(value.motionPreset ?? value.motion ?? "none") as ActionMotionEffect;
  const interactionCandidate = String(value.actionInteraction ?? value.interaction ?? "none") as ActionInteractionEffect;
  const motion = capability.motions.includes(motionCandidate) ? motionCandidate : "none";
  const interaction = capability.interactions.includes(interactionCandidate) ? interactionCandidate : "none";
  const enabled = capability.enabled && (value.actionEffectsEnabled === true || value.enabled === true || motion !== "none" || interaction !== "none" || value.actionGlow === true || value.glow === true);
  const play = value.motionPlay === "once" || value.motionPlay === "interaction" ? value.motionPlay : value.play === "once" || value.play === "interaction" ? value.play : "gentle_repeat";
  const authoredTrigger = value.motionTrigger === "hover" || value.motionTrigger === "tap" || value.motionTrigger === "attention" ? value.motionTrigger : value.trigger === "hover" || value.trigger === "tap" || value.trigger === "attention" ? value.trigger : "load";
  return {
    enabled,
    glow: enabled && capability.glow && (value.actionGlow === true || value.glow === true || Number(value.boxGlow ?? 0) > 0),
    interaction: enabled ? interaction : "none",
    motion: enabled ? motion : "none",
    intensity: number(value.motionIntensity ?? value.intensity, 40, 0, 100),
    durationSeconds: number(value.motionSpeedSeconds ?? value.durationSeconds, 2.4, .4, 12),
    delaySeconds: number(value.motionDelaySeconds ?? value.delaySeconds, 0, 0, 12),
    play,
    trigger: play === "interaction" && authoredTrigger === "load" ? "hover" : authoredTrigger,
    reducedMotionFallback: value.reducedMotionFallback === "static_glow" || value.reducedMotionFallback === "static_highlight" ? value.reducedMotionFallback : "none",
  };
}

export function actionPresentationEffectPatch(settings: ActionPresentationEffectSettings): Record<string, unknown> {
  return {
    actionEffectsEnabled: settings.enabled,
    actionGlow: settings.glow,
    actionInteraction: settings.interaction,
    motionPreset: settings.motion,
    motionIntensity: settings.intensity,
    motionSpeedSeconds: settings.durationSeconds,
    motionDelaySeconds: settings.delaySeconds,
    motionPlay: settings.play,
    motionTrigger: settings.trigger,
    reducedMotionFallback: settings.reducedMotionFallback,
  };
}

export const ACTION_MOTION_OPTIONS: ReadonlyArray<{ id: ActionMotionEffect; label: string }> = [
  { id: "none", label: "None" },
  { id: "subtle_pulse", label: "Subtle pulse" },
  { id: "glow_pulse", label: "Glow pulse" },
  { id: "soft_float", label: "Subtle float" },
  { id: "shimmer", label: "Shimmer" },
  { id: "highlight_sweep", label: "Highlight sweep" },
  { id: "shine_sweep", label: "Reflection sweep" },
  { id: "entrance_pop", label: "Entrance pop" },
  { id: "fade_in", label: "Fade in" },
  { id: "slide_in", label: "Slide in" },
  { id: "scale_in", label: "Scale in" },
];
