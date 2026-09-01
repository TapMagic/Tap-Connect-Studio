export const STUDIO_CONTROL_AVAILABILITY_CONTRACT = "studioControlAvailability@1.0.0" as const;

export type StudioControlAvailability = Readonly<{
  contractId: typeof STUDIO_CONTROL_AVAILABILITY_CONTRACT;
  availability: "enabled" | "disabled" | "read-only" | "hidden";
  dependency?: string;
  disabledReason?: string;
  governance: "direct" | "curated" | "system";
  entitlement?: string;
  compatibility?: readonly string[];
}>;

export function resolveStudioControlAvailability(input: Omit<StudioControlAvailability, "contractId">): StudioControlAvailability {
  const availability = input.availability;
  if ((availability === "disabled" || availability === "read-only") && !input.disabledReason) {
    throw new Error("Unavailable Studio controls require a semantic reason.");
  }
  return Object.freeze({ contractId: STUDIO_CONTROL_AVAILABILITY_CONTRACT, ...input });
}

export function studioControlProps(state: StudioControlAvailability) {
  return {
    disabled: state.availability !== "enabled",
    hidden: state.availability === "hidden",
    "aria-disabled": state.availability !== "enabled" ? true : undefined,
    "aria-description": state.disabledReason,
    "data-control-availability": state.availability,
    "data-disabled-reason": state.disabledReason,
    title: state.disabledReason,
  } as const;
}
