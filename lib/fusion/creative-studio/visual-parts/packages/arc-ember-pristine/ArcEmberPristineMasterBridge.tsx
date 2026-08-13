"use client";

import {
  ARC_EMBER_PRISTINE_MASTER_ASSET,
  readArcEmberActionCue,
  readArcEmberRole,
} from "./recipe";
import "./arc-ember-pristine.css";

function value(input: unknown, fallback = "") {
  return typeof input === "string" && input.trim() ? input : fallback;
}

function identityUrl(props: Record<string, unknown>) {
  return value(props.iconMediaUrl, value(props.logoUrl, value(props.imageUrl)));
}

const CUES = { arrow: "→", chevron: "›", launch: "↗", none: "" } as const;

export function ArcEmberPristineMasterAction({
  props,
  label,
  description,
}: {
  props: Record<string, unknown>;
  label: string;
  description?: string;
}) {
  const identity = identityUrl(props);
  const cue = readArcEmberActionCue(props);
  const role = readArcEmberRole(props);
  const disabled = props.disabled === true;
  return (
    <span className="ae-master-host" data-ae-pristine-master="true" data-ae-master-asset={ARC_EMBER_PRISTINE_MASTER_ASSET} data-ae-role={role} data-ae-state={disabled ? "disabled" : "default"}>
      <span className="ae-master-stage">
        {/* Immutable visual authority: no filters, masks, cropping, recoloring, or generated shell layers. */}
        <img className="ae-master-asset" src={ARC_EMBER_PRISTINE_MASTER_ASSET} width={2172} height={724} alt="" aria-hidden draggable={false} />
        <span className="ae-master-identity" data-ae-identity-socket="live">
          {identity ? <img src={identity} alt="" aria-hidden draggable={false} /> : null}
        </span>
        <span className="ae-master-copy" data-ae-content-overlay="live">
          <span className="ae-master-eyebrow">{value(props.eyebrow, "PRISTINE ACTION")}</span>
          <span className="ae-master-title">{label}</span>
          {description ? <span className="ae-master-description">{description}</span> : null}
        </span>
        <span className="ae-master-cue" data-ae-action-cue={cue} aria-hidden>{CUES[cue]}</span>
      </span>
    </span>
  );
}
