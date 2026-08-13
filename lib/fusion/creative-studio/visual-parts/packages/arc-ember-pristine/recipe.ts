export const ARC_EMBER_PRISTINE_MASTER_PART_ID = "action_surface_arc_ember_pristine_master";
export const ARC_EMBER_PRISTINE_MASTER_ASSET = "/visual-parts/arc-ember/pristine-master-button.png";
export const ARC_EMBER_PRISTINE_MASTER_SHA256 = "b9e0d71d02bcb77460d29fbdbad9390bf493a96bd67d8c2350096ef52669df48";

export type ArcEmberActionCue = "arrow" | "chevron" | "launch" | "none";
export type ArcEmberRole = "primary" | "social" | "utility" | "informational";

export const ARC_EMBER_ROLE_PRESETS: ReadonlyArray<{
  id: ArcEmberRole;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  iconMediaUrl: string;
  actionType: string;
  cue: ArcEmberActionCue;
}> = [
  { id: "primary", label: "Primary CTA", eyebrow: "SIGNATURE ACCESS", title: "Enter the Ember Vault", description: "Private member access", iconMediaUrl: "/tap-connect-mark.png", actionType: "website", cue: "arrow" },
  { id: "social", label: "Social action", eyebrow: "FOLLOW ALONG", title: "Join Us on Instagram", description: "Stories, launches, and behind the scenes", iconMediaUrl: "/tap-connect-mark.png", actionType: "instagram", cue: "launch" },
  { id: "utility", label: "Utility action", eyebrow: "QUICK ACTION", title: "Save Contact", description: "Keep these details on your phone", iconMediaUrl: "/tap-connect-logo.png", actionType: "vcard", cue: "chevron" },
  { id: "informational", label: "Team / About", eyebrow: "OUR STORY", title: "Meet the Team", description: "People behind the work", iconMediaUrl: "/tap-connect-logo.png", actionType: "website", cue: "arrow" },
] as const;

export function readArcEmberActionCue(props: Record<string, unknown>): ArcEmberActionCue {
  const cue = props.vpArcEmberActionCue;
  return cue === "chevron" || cue === "launch" || cue === "none" ? cue : "arrow";
}

export function writeArcEmberActionCue(
  props: Record<string, unknown>,
  cue: ArcEmberActionCue,
): Record<string, unknown> {
  return { ...props, vpArcEmberActionCue: cue };
}

export function readArcEmberRole(props: Record<string, unknown>): ArcEmberRole {
  const role = props.vpArcEmberRole;
  return role === "social" || role === "utility" || role === "informational" ? role : "primary";
}

export function applyArcEmberRolePreset(
  props: Record<string, unknown>,
  role: ArcEmberRole,
): Record<string, unknown> {
  const preset = ARC_EMBER_ROLE_PRESETS.find((candidate) => candidate.id === role)!;
  return {
    ...props,
    label: preset.title,
    eyebrow: preset.eyebrow,
    description: preset.description,
    showDescription: true,
    showIcon: true,
    iconMediaUrl: preset.iconMediaUrl,
    actionType: preset.actionType,
    accessibleLabel: preset.title,
    vpArcEmberRole: role,
    vpArcEmberActionCue: preset.cue,
  };
}

export function arcEmberPristineMasterInsertProps(role: ArcEmberRole = "primary"): Record<string, unknown> {
  return applyArcEmberRolePreset({
    elementKind: "button",
    showLabel: true,
    href: "",
    disabled: false,
    aspectLocked: true,
    visualParts: {
      actionSurfacePartId: ARC_EMBER_PRISTINE_MASTER_PART_ID,
      actionRole: "signature",
      surfaceEnabled: false,
      surfaceTreatment: "off",
    },
  }, role);
}

export function isArcEmberPristineMasterProps(props: Record<string, unknown>) {
  const state = props.visualParts && typeof props.visualParts === "object"
    ? props.visualParts as Record<string, unknown>
    : {};
  return state.actionSurfacePartId === ARC_EMBER_PRISTINE_MASTER_PART_ID;
}
