export const ARC_EMBER_PRISTINE_MASTER_PART_ID = "action_surface_arc_ember_pristine_master";
export const ARC_EMBER_PRISTINE_MASTER_ASSET = "/visual-parts/arc-ember/pristine-master-button.png";
export const ARC_EMBER_PRISTINE_MASTER_SHA256 = "b9e0d71d02bcb77460d29fbdbad9390bf493a96bd67d8c2350096ef52669df48";

export type ArcEmberActionCue = "arrow" | "chevron" | "launch" | "none";

export function readArcEmberActionCue(props: Record<string, unknown>): ArcEmberActionCue {
  const cue = props.vpArcEmberActionCue;
  return cue === "chevron" || cue === "launch" || cue === "none" ? cue : "arrow";
}

export function writeArcEmberActionCue(props: Record<string, unknown>, cue: ArcEmberActionCue) {
  return { ...props, vpArcEmberActionCue: cue };
}

export function arcEmberPristineMasterInsertProps(): Record<string, unknown> {
  return {
    elementKind: "button",
    label: "Pristine Action",
    eyebrow: "PRIVATE ACCESS",
    description: "",
    showLabel: true,
    showDescription: false,
    showIcon: true,
    iconMediaUrl: "/tap-connect-logo.png",
    actionType: "website",
    href: "",
    accessibleLabel: "Pristine Action",
    aspectLocked: true,
    vpArcEmberActionCue: "arrow",
    visualParts: {
      actionSurfacePartId: ARC_EMBER_PRISTINE_MASTER_PART_ID,
      actionRole: "signature",
      surfaceEnabled: false,
      surfaceTreatment: "off",
    },
  };
}

export function isArcEmberPristineMasterProps(props: Record<string, unknown>) {
  const state = props.visualParts && typeof props.visualParts === "object"
    ? props.visualParts as Record<string, unknown>
    : {};
  return state.actionSurfacePartId === ARC_EMBER_PRISTINE_MASTER_PART_ID;
}
