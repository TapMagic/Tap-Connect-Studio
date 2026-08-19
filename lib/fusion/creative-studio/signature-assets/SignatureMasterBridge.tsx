"use client";

import type { CSSProperties } from "react";
import { buildButtonHref } from "@/lib/fusion/card/designer-elements";
import { getSignatureAsset } from "./registry";
import "./signature-master.css";

function text(value: unknown, fallback = "") { return typeof value === "string" && value.trim() ? value : fallback; }
const cues: Record<string,string> = { arrow:"→",chevron:"›",launch:"↗",none:"" };
function rectStyle(rect: { x:number;y:number;width:number;height:number } | undefined): CSSProperties | undefined {
  return rect ? {left:`${rect.x*100}%`,top:`${rect.y*100}%`,width:`${rect.width*100}%`,height:`${rect.height*100}%`,right:"auto",bottom:"auto"} : undefined;
}
function liveTypeStyle(asset: ReturnType<typeof getSignatureAsset>): CSSProperties | undefined {
  const geometry=asset?.normalizedContract?.liveContentGeometry;
  if (!geometry) return undefined;
  const font=geometry.fontSizePxAt390;
  const line=geometry.lineHeightPxAt390;
  return {
    ...rectStyle(geometry.safeArea),
    textAlign:geometry.alignment,
    fontSize:font?`clamp(${font[0]}px, 3.85cqw, ${font[1]}px)`:undefined,
    lineHeight:line?`clamp(${line[0]}px, 4.9cqw, ${line[1]}px)`:undefined,
  };
}

function signatureActionHref(props: Record<string, unknown>) {
  const destination=text(props.href);
  if (/^tel:/i.test(destination)) return buildButtonHref({...props,actionType:"call"});
  if (/^mailto:/i.test(destination)) return buildButtonHref({...props,actionType:"email",href:destination.replace(/^mailto:/i,"")});
  return buildButtonHref(props);
}

export function SignatureMasterBridge({ props, editMode = false }: { props: Record<string, unknown>; editMode?: boolean }) {
  const asset = getSignatureAsset(props.signatureAssetId);
  if (!asset) return null;
  const state = props.disabled === true ? "disabled" : "default";
  const source = asset.liveShellAsset || asset.sourceAsset;
  const normalized=asset.normalizedContract;
  const identitySocket=normalized?.sockets.find((socket)=>socket.contractId.startsWith("identityHeaderSocket@"));
  const identityContentUrl=text(props.identityContentUrl,text(props.imageUrl,text(props.iconMediaUrl)));
  const identityContentAlt=text(props.identityContentAlt,text(props.alt,"Identity"));
  const informationalText=text(props.informationalText,text(props.statusText));
  const hasAccessibleLiveContent=asset.assetKind==="action"||Boolean(identitySocket&&identityContentUrl)||Boolean(normalized?.liveContentContract&&informationalText);
  if (asset.assetKind === "stage" && asset.expansionContract) {
    const style = { "--signature-stage-source": `url("${source}")` } as CSSProperties;
    return (
      <span
        className="signature-master signature-master--expandable-stage"
        data-signature-asset-id={asset.id}
        data-signature-family={asset.familyId}
        data-signature-kind={asset.assetKind}
        data-signature-role={asset.role}
        data-signature-state={state}
        data-signature-tint-mode={asset.tintMode}
        data-signature-energy-mode={asset.energyMode}
        data-signature-expansion="protected-cap-inset"
        style={style}
      />
    );
  }
  const base = (
    <span className="signature-master" data-signature-asset-id={asset.id} data-signature-family={asset.familyId} data-signature-kind={asset.assetKind} data-signature-role={asset.role} data-signature-state={state} data-signature-tint-mode={asset.tintMode} data-signature-energy-mode={asset.energyMode} data-signature-component-id={normalized?.componentId} data-signature-component-version={normalized?.componentVersion} data-signature-classification={text(props.signatureClassification)} data-signature-certification={text(props.signatureLayoutCertificationStatus)} data-signature-mirrored={props.signatureMirrored===true?"true":"false"} data-signature-overlap={String(typeof props.signatureCompensatingOverlapPx==="number"?props.signatureCompensatingOverlapPx:0)} aria-hidden={hasAccessibleLiveContent?undefined:true}>
      {/* Immutable source artwork: containment only; never cropped, filtered, recolored, or reconstructed. */}
      <img className="signature-master__asset" src={source} width={asset.width} height={asset.height} alt="" aria-hidden draggable={false} />
      {asset.assetKind === "action" ? <>
        {asset.socketContract.identity ? <span className="signature-master__identity">{text(props.iconMediaUrl, text(props.logoUrl, text(props.imageUrl))) ? <img src={text(props.iconMediaUrl, text(props.logoUrl, text(props.imageUrl)))} alt="" aria-hidden draggable={false} /> : null}</span> : null}
        {asset.socketContract.eyebrow || asset.socketContract.title || asset.socketContract.description ? <span className="signature-master__copy" style={liveTypeStyle(asset)}>
          {asset.socketContract.eyebrow ? <span className="signature-master__eyebrow">{text(props.eyebrow,"SIGNATURE ACTION")}</span> : null}
          {asset.socketContract.title ? <span className="signature-master__title">{text(props.label,"Action")}</span> : null}
          {asset.socketContract.description && props.showDescription !== false && text(props.description) ? <span className="signature-master__description">{text(props.description)}</span> : null}
        </span> : null}
        {asset.socketContract.cue ? <span className="signature-master__cue" aria-hidden>{cues[text(props.vpArcEmberActionCue,"arrow")] ?? "→"}</span> : null}
      </> : null}
      {asset.assetKind === "identity" && identityContentUrl ? <span className="signature-master__identity-only" style={rectStyle(identitySocket?.geometry.safeArea)} role="img" aria-label={identityContentAlt}><img src={identityContentUrl} alt="" aria-hidden draggable={false} /></span> : null}
      {asset.assetKind === "divider" && asset.socketContract.dividerCenter && text(props.dividerCenterMediaUrl) ? <span className="signature-master__divider-center"><img src={text(props.dividerCenterMediaUrl)} alt="" aria-hidden draggable={false} /></span> : null}
      {asset.assetKind === "micro-part" && asset.socketContract.statusText ? <span className="signature-master__micro-copy" style={{ color:text(props.statusColor,"#fff3e5") }}>{text(props.statusText,text(props.label,asset.label))}</span> : null}
      {asset.assetKind === "micro-part" && asset.socketContract.icon && text(props.iconMediaUrl,text(props.imageUrl)) ? <span className="signature-master__micro-icon"><img src={text(props.iconMediaUrl,text(props.imageUrl))} alt="" aria-hidden draggable={false} /></span> : null}
      {normalized?.liveContentContract && informationalText ? <span className="signature-master__informational-line" style={liveTypeStyle(asset)}>{informationalText}</span> : null}
    </span>
  );
  if (asset.assetKind !== "action") return base;
  const href = signatureActionHref(props);
  const disabled = props.disabled === true;
  return <a className="signature-master__action" href={editMode || disabled ? undefined : href} aria-disabled={disabled || !href} aria-label={text(props.accessibleLabel,text(props.label,asset.label))} onClick={(event)=>{ if(editMode || disabled || !href) event.preventDefault(); }}>{base}</a>;
}
