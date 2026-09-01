export const STUDIO_LIVE_ADJUSTMENT_CONTRACT = "studioLiveAdjustment@1.0.0" as const;

export type StudioPrecisionDescriptor = Readonly<{
  unit: "px" | "%" | "deg" | "number";
  min: number;
  max: number;
  step: number;
  fineStep?: number;
  defaultValue?: number;
}>;

export type StudioLiveAdjustmentPhase = "idle" | "previewing" | "committed" | "cancelled";

export function normalizeStudioPrecision(value: number, descriptor: StudioPrecisionDescriptor): number {
  const finite = Number.isFinite(value) ? value : descriptor.defaultValue ?? descriptor.min;
  const clamped = Math.min(descriptor.max, Math.max(descriptor.min, finite));
  const steps = Math.round((clamped - descriptor.min) / descriptor.step);
  const normalized = descriptor.min + steps * descriptor.step;
  return Number(normalized.toFixed(6));
}

export function stepStudioPrecision(
  value: number,
  direction: -1 | 1,
  descriptor: StudioPrecisionDescriptor,
  fine = false,
): number {
  const amount = fine ? descriptor.fineStep ?? descriptor.step / 10 : descriptor.step;
  return normalizeStudioPrecision(value + direction * amount, { ...descriptor, step: amount });
}
