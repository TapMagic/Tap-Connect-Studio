"use client";

import type { CSSProperties } from "react";
import { buildButtonHref } from "@/lib/fusion/card/designer-elements";
import { getSignatureAsset } from "./registry";
import "./signature-master.css";

function text(value: unknown, fallback = "") { return typeof value === "string" && value.trim() ? value : fallback; }
const cues: Record<string,string> = { arrow:"→",chevron:"›",launch:"↗",none:"" };

export function SignatureMasterBridge({ props, editMode = false }: { props: Record<string, unknown>; editMode?: boolean }) {
  const asset = getSignatureAsset(props.signatureAssetId);
  if (!asset) return null;
  const state = props.disabled === true ? "disabled" : "default";
  const source = asset.liveShellAsset || asset.sourceAsset;
  if (asset.assetKind === "stage" && asset.expansionContract) {
    const style = { "--signature-stage-source": `url("${source}")` } as CSSProperties;
    return (
      <span
        className="signature-master signature-master--expandable-stage"
        data-signature-asset-id={asset.id}
        data-signature-kind={asset.assetKind}
        data-signature-state={state}
        data-signature-expansion="protected-cap-inset"
        style={style}
      />
    );
  }
  const base = (
    <span className="signature-master" data-signature-asset-id={asset.id} data-signature-kind={asset.assetKind} data-signature-state={state}>
      {/* Immutable source artwork: containment only; never cropped, filtered, recolored, or reconstructed. */}
      <img className="signature-master__asset" src={source} width={asset.width} height={asset.height} alt="" aria-hidden draggable={false} />
      {asset.assetKind === "action" ? <>
        <span className="signature-master__identity">{text(props.iconMediaUrl, text(props.logoUrl)) ? <img src={text(props.iconMediaUrl, text(props.logoUrl))} alt="" aria-hidden draggable={false} /> : null}</span>
        <span className="signature-master__copy">
          <span className="signature-master__eyebrow">{text(props.eyebrow,"SIGNATURE ACTION")}</span>
          <span className="signature-master__title">{text(props.label,"Action")}</span>
          {props.showDescription !== false && text(props.description) ? <span className="signature-master__description">{text(props.description)}</span> : null}
        </span>
        <span className="signature-master__cue" aria-hidden>{cues[text(props.vpArcEmberActionCue,"arrow")] ?? "→"}</span>
      </> : null}
      {asset.assetKind === "identity" && text(props.imageUrl, text(props.iconMediaUrl)) ? <span className="signature-master__identity-only"><img src={text(props.imageUrl, text(props.iconMediaUrl))} alt="" aria-hidden draggable={false} /></span> : null}
      {asset.assetKind === "divider" && asset.socketContract.dividerCenter && text(props.dividerCenterMediaUrl) ? <span className="signature-master__divider-center"><img src={text(props.dividerCenterMediaUrl)} alt="" aria-hidden draggable={false} /></span> : null}
    </span>
  );
  if (asset.assetKind !== "action") return base;
  const href = buildButtonHref(props);
  const disabled = props.disabled === true;
  return <a className="signature-master__action" href={editMode || disabled ? undefined : href} aria-disabled={disabled || !href} aria-label={text(props.accessibleLabel,text(props.label,asset.label))} onClick={(event)=>{ if(editMode || disabled || !href) event.preventDefault(); }}>{base}</a>;
}
