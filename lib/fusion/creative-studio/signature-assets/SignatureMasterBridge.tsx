"use client";

import type { CSSProperties } from "react";
import { buildButtonHref } from "@/lib/fusion/card/designer-elements";
import { StudioVisualResourceProjection } from "@/components/fusion/creative-studio/studio-visual-resource-projection";
import { createIdentityVisualResourceFitContract, type StudioVisualResourceMetadata } from "@/lib/fusion/creative-studio/platform/semantic-resource-slot";
import { getSignatureAsset } from "./registry";
import "./signature-master.css";

const SIGNATURE_MASTER_RENDERER_VERSION = "signature-master-bridge@2.0.0";

function text(value: unknown, fallback = "") { return typeof value === "string" && value.trim() ? value : fallback; }
const cues: Record<string,string> = { arrow:"→",chevron:"›",launch:"↗",none:"" };
function versionedSource(source: string, sha256: string): string {
  if (!sha256) return source;
  const separator = source.includes("?") ? "&" : "?";
  return `${source}${separator}tcv=${encodeURIComponent(sha256.slice(0, 16))}`;
}
function rectStyle(rect: { x:number;y:number;width:number;height:number } | undefined): CSSProperties | undefined {
  return rect ? {left:`${rect.x*100}%`,top:`${rect.y*100}%`,width:`${rect.width*100}%`,height:`${rect.height*100}%`,right:"auto",bottom:"auto"} : undefined;
}
function liveTypeStyle(asset: ReturnType<typeof getSignatureAsset>, props: Record<string, unknown>): CSSProperties | undefined {
  const geometry=asset?.normalizedContract?.liveContentGeometry;
  if (!geometry) return undefined;
  const requestedAlign=text(props.signatureTextAlign,geometry.alignment) as "left"|"center"|"right";
  const alignment=geometry.allowedAlignments?.includes(requestedAlign)?requestedAlign:geometry.alignment;
  const requestedSize=text(props.signatureTextSize,"medium") as "small"|"medium"|"large";
  const size=requestedSize==="small"||requestedSize==="large"?requestedSize:"medium";
  const fontPreset=geometry.textSizePresetsPxAt390?.[size];
  const linePreset=geometry.lineHeightPresetsPxAt390?.[size];
  const layout=text(props.signatureLayoutMode,"standalone") as "standalone"|"single-stack"|"twin-rail";
  const precision=geometry.presentationTypography?.[layout];
  const requestedPx=typeof props.signatureTextSizePx==="number"?Math.max(precision?.minPx??10,Math.min(precision?.maxPx??20,props.signatureTextSizePx)):undefined;
  const font=geometry.fontSizePxAt390;
  const line=geometry.lineHeightPxAt390;
  return {
    ...rectStyle(geometry.safeArea),
    textAlign:alignment,
    alignItems:alignment==="left"?"flex-start":alignment==="right"?"flex-end":"center",
    fontSize:requestedPx?`${requestedPx}px`:fontPreset?`${fontPreset}px`:font?`clamp(${font[0]}px, 3.85cqw, ${font[1]}px)`:undefined,
    lineHeight:requestedPx?`${Math.round(requestedPx*1.22)}px`:linePreset?`${linePreset}px`:line?`clamp(${line[0]}px, 4.9cqw, ${line[1]}px)`:undefined,
    transform:geometry.opticalCenterOffsetEm?`translateY(${geometry.opticalCenterOffsetEm}em)`:undefined,
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
  const source = versionedSource(asset.liveShellAsset || asset.sourceAsset, asset.sourceSha256);
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
  const appearanceOptions=props.signatureAppearanceOptionIds&&typeof props.signatureAppearanceOptionIds==="object"?props.signatureAppearanceOptionIds as Record<string,string>:undefined;
  const appearanceRendererValues=props.signatureAppearanceRendererValues&&typeof props.signatureAppearanceRendererValues==="object"?props.signatureAppearanceRendererValues as Record<string,string>:undefined;
  const base = (
    <span className="signature-master" data-signature-renderer-version={SIGNATURE_MASTER_RENDERER_VERSION} data-signature-asset-id={asset.id} data-signature-source-sha={asset.sourceSha256} data-signature-family={asset.familyId} data-signature-family-version={text(props.signatureFamilyVersion)} data-signature-recipe-id={text(props.signatureRecipeId)} data-signature-recipe-version={text(props.signatureRecipeVersion)} data-signature-assembly-instance-id={text(props.signatureAssemblyInstanceId)} data-signature-part-instance-id={text(props.signaturePartInstanceId)} data-signature-parent-part-instance-id={text(props.signatureParentPartInstanceId)} data-signature-action-id={text(props.signatureActionId)} data-signature-kind={asset.assetKind} data-signature-role={asset.role} data-signature-state={state} data-signature-tint-mode={asset.tintMode} data-signature-energy-mode={asset.energyMode} data-signature-component-id={normalized?.componentId} data-signature-component-version={normalized?.componentVersion} data-signature-classification={text(props.signatureClassification)} data-signature-certification={text(props.signatureLayoutCertificationStatus)} data-signature-presentation={text(props.signaturePresentationMode,"standalone")} data-signature-depth={text(props.signatureDepthTreatment)} data-signature-appearance-contract={text(props.signatureAppearanceContractId)} data-signature-appearance-options={appearanceOptions?JSON.stringify(appearanceOptions):undefined} data-signature-appearance-renderer-values={appearanceRendererValues?JSON.stringify(appearanceRendererValues):undefined} data-signature-plug-face={appearanceOptions?.["plug-face"]} data-signature-plug-base={appearanceOptions?.["plug-base"]} data-signature-text-treatment={text(props.signatureTextTreatmentRecipe,normalized?.liveContentGeometry?.textTreatment)} data-signature-mirrored={props.signatureMirrored===true?"true":"false"} data-signature-overlap={String(typeof props.signatureCompensatingOverlapPx==="number"?props.signatureCompensatingOverlapPx:0)} aria-hidden={hasAccessibleLiveContent?undefined:true}>
      {text(props.signatureDepthTreatment) === "raised-contact" ? <span className="signature-master__depth" data-signature-depth-renderer="portable-layer-v1" aria-hidden /> : null}
      {/* Immutable source artwork: containment only; never cropped, filtered, recolored, or reconstructed. */}
      <img className="signature-master__asset" src={source} width={asset.width} height={asset.height} alt="" aria-hidden draggable={false} />
      {asset.assetKind === "action" ? <>
        {asset.socketContract.identity ? <span className="signature-master__identity">{text(props.iconMediaUrl, text(props.logoUrl, text(props.imageUrl))) ? <img src={text(props.iconMediaUrl, text(props.logoUrl, text(props.imageUrl)))} alt="" aria-hidden draggable={false} /> : null}</span> : null}
        {asset.socketContract.eyebrow || asset.socketContract.title || asset.socketContract.description ? <span className="signature-master__copy" style={liveTypeStyle(asset,props)}>
          {asset.socketContract.eyebrow ? <span className="signature-master__eyebrow">{text(props.eyebrow,"SIGNATURE ACTION")}</span> : null}
          {asset.socketContract.title ? <span className="signature-master__title">{text(props.label,"Action")}</span> : null}
          {asset.socketContract.description && props.showDescription !== false && text(props.description) ? <span className="signature-master__description">{text(props.description)}</span> : null}
        </span> : null}
        {asset.socketContract.cue ? <span className="signature-master__cue" aria-hidden>{cues[text(props.vpArcEmberActionCue,"arrow")] ?? "→"}</span> : null}
      </> : null}
      {asset.assetKind === "identity" && identityContentUrl ? <span className="signature-master__identity-only" style={rectStyle(identitySocket?.geometry.safeArea)}><StudioVisualResourceProjection resource={{src:identityContentUrl,alt:identityContentAlt,visual:props.identityResourceVisual as StudioVisualResourceMetadata|undefined}} contract={createIdentityVisualResourceFitContract()} /></span> : null}
      {asset.assetKind === "divider" && asset.socketContract.dividerCenter && text(props.dividerCenterMediaUrl) ? <span className="signature-master__divider-center"><img src={text(props.dividerCenterMediaUrl)} alt="" aria-hidden draggable={false} /></span> : null}
      {asset.assetKind === "micro-part" && asset.socketContract.statusText ? <span className="signature-master__micro-copy" style={{ color:text(props.statusColor,"#fff3e5") }}>{text(props.statusText,text(props.label,asset.label))}</span> : null}
      {asset.assetKind === "micro-part" && asset.socketContract.icon && text(props.iconMediaUrl,text(props.imageUrl)) ? <span className="signature-master__micro-icon"><img src={text(props.iconMediaUrl,text(props.imageUrl))} alt="" aria-hidden draggable={false} /></span> : null}
      {normalized?.liveContentContract && informationalText ? <span className="signature-master__informational-line" style={liveTypeStyle(asset,props)}>{informationalText}</span> : null}
    </span>
  );
  if (asset.assetKind !== "action") return base;
  const href = signatureActionHref(props);
  const disabled = props.disabled === true;
  return <a className="signature-master__action" href={editMode || disabled ? undefined : href} aria-disabled={disabled || !href} aria-label={text(props.accessibleLabel,text(props.label,asset.label))} onClick={(event)=>{ if(editMode || disabled || !href) event.preventDefault(); }}>{base}</a>;
}
