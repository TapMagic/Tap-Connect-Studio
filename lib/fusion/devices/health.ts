/**
 * TapPoint health badges for the Tap Points hub.
 */

export type TapPointHealthTone = "healthy" | "warning" | "critical" | "unknown";

export type TapPointHealthBadge = {
  tone: TapPointHealthTone;
  label: string;
  detail: string;
};

export function computeTapPointHealth(input: {
  status: string;
  hasAddress: boolean;
  totalTapCount?: number | null;
  deviceStatus?: string | null;
  bridged: boolean;
}): TapPointHealthBadge {
  if (!input.bridged) {
    return {
      tone: "warning",
      label: "Unbridged",
      detail: "V1 device not yet linked to Tap Point registry",
    };
  }
  if (!input.hasAddress) {
    return {
      tone: "critical",
      label: "No address",
      detail: "Missing permanent public code",
    };
  }
  const st = input.status.toUpperCase();
  if (st === "LOST" || st === "RETIRED") {
    return { tone: "critical", label: st.toLowerCase(), detail: "Tap Point not serving" };
  }
  if (st === "PAUSED" || input.deviceStatus === "INACTIVE" || input.deviceStatus === "SUSPENDED") {
    return { tone: "warning", label: "Paused", detail: "Not actively resolving" };
  }
  if (st === "ACTIVE" || st === "UNASSIGNED") {
    const taps = input.totalTapCount ?? 0;
    if (taps === 0) {
      return {
        tone: "healthy",
        label: "Ready",
        detail: "Address live · awaiting first tap",
      };
    }
    return {
      tone: "healthy",
      label: "Healthy",
      detail: `${taps} taps recorded`,
    };
  }
  return { tone: "unknown", label: "Unknown", detail: input.status };
}
