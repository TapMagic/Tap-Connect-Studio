/**
 * TapPoint health badges for the Tap Points hub.
 */

export type TapPointHealthTone = "healthy" | "warning" | "critical" | "unknown";

export type TapPointHealthBadge = {
  tone: TapPointHealthTone;
  label: string;
  detail: string;
  /** Soft capacity signal 0–100 for fleet UI */
  capacityScore: number;
  errors: string[];
};

export function computeTapPointHealth(input: {
  status: string;
  hasAddress: boolean;
  totalTapCount?: number | null;
  deviceStatus?: string | null;
  bridged: boolean;
  recentErrors?: string[];
  capacitySoftLimit?: number;
}): TapPointHealthBadge {
  const errors = [...(input.recentErrors ?? [])];
  const softLimit = input.capacitySoftLimit ?? 10_000;
  const taps = input.totalTapCount ?? 0;
  const capacityScore = Math.max(
    0,
    Math.min(100, Math.round(100 - (taps / softLimit) * 100))
  );

  if (!input.bridged) {
    return {
      tone: "warning",
      label: "Unbridged",
      detail: "V1 device not yet linked to Tap Point registry",
      capacityScore,
      errors,
    };
  }
  if (!input.hasAddress) {
    errors.push("missing_public_address");
    return {
      tone: "critical",
      label: "No address",
      detail: "Missing permanent public code",
      capacityScore: 0,
      errors,
    };
  }
  const st = input.status.toUpperCase();
  if (st === "LOST" || st === "RETIRED") {
    errors.push(`status_${st.toLowerCase()}`);
    return {
      tone: "critical",
      label: st.toLowerCase(),
      detail: "Tap Point not serving",
      capacityScore: 0,
      errors,
    };
  }
  if (st === "PAUSED" || input.deviceStatus === "INACTIVE" || input.deviceStatus === "SUSPENDED") {
    return {
      tone: "warning",
      label: "Paused",
      detail: "Not actively resolving",
      capacityScore,
      errors,
    };
  }
  if (capacityScore < 20) {
    errors.push("near_capacity");
    return {
      tone: "warning",
      label: "High load",
      detail: `${taps} taps · capacity ${capacityScore}%`,
      capacityScore,
      errors,
    };
  }
  if (st === "ACTIVE" || st === "UNASSIGNED") {
    if (taps === 0) {
      return {
        tone: "healthy",
        label: "Ready",
        detail: "Address live · awaiting first tap",
        capacityScore,
        errors,
      };
    }
    return {
      tone: "healthy",
      label: "Healthy",
      detail: `${taps} taps · capacity ${capacityScore}%`,
      capacityScore,
      errors,
    };
  }
  return {
    tone: "unknown",
    label: "Unknown",
    detail: input.status,
    capacityScore,
    errors,
  };
}

/** Fleet rollup for Tap Points hub / Admin */
export function summarizeFleetHealth(badges: TapPointHealthBadge[]): {
  healthy: number;
  warning: number;
  critical: number;
  unknown: number;
} {
  const out = { healthy: 0, warning: 0, critical: 0, unknown: 0 };
  for (const b of badges) {
    out[b.tone] += 1;
  }
  return out;
}
