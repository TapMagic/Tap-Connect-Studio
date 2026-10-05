"use client";

import type { CSSProperties } from "react";
import { buildButtonHref } from "@/lib/fusion/card/designer-elements";
import { StudioVisualResourceProjection } from "@/components/fusion/creative-studio/studio-visual-resource-projection";
import { MaterialSurfaceLayers } from "@/components/fusion/creative-studio/material-surface-layers";
import { createIdentityVisualResourceFitContract, type StudioVisualResourceMetadata } from "@/lib/fusion/creative-studio/platform/semantic-resource-slot";
import { getSignatureAsset } from "./registry";
import { getMaterialRecipe } from "../material-engine";
import { curatedMaterialRoles, curatedMaterialSurface, curatedMaterialSurfaceStyle } from "./curated-material-projection";
import type { SignatureMaterialSurfaceGeometry } from "./types";
import "./signature-master.css";

const SIGNATURE_MASTER_RENDERER_VERSION = "signature-master-bridge@2.1.0";

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
function materialGeometryStyle(geometry: SignatureMaterialSurfaceGeometry | undefined): CSSProperties | undefined {
  if (!geometry) return undefined;
  const inset=geometry.inset;
  return {
    ...(inset?{top:`${inset.top*100}%`,right:`${inset.right*100}%`,bottom:`${inset.bottom*100}%`,left:`${inset.left*100}%`}:{}),
    ...(geometry.borderRadiusPercent!=null?{borderRadius:`${geometry.borderRadiusPercent}%`}:{}),
    ...(geometry.clipPolygon?.length?{clipPath:`polygon(${geometry.clipPolygon.map((point)=>`${point.x*100}% ${point.y*100}%`).join(",")})`}:{}),
  };
}
type ResponsiveTypographyPolicy = {
  density:string;
  renderedWidthPx:{min:number;max:number};
  title:{minPx:number;maxPx:number;defaultPx:number;lineHeight:number;trackingEm?:number};
  sublabel?:{minPx:number;maxPx:number;defaultPx:number;lineHeight:number;trackingEm?:number;hideBelowWidthPx?:number};
  safeAreaPaddingPx:number;
  affordanceReservePx:number;
};
function responsiveLength(minPx:number,maxPx:number,minWidth:number,maxWidth:number) {
  const span=Math.max(1,maxWidth-minWidth);
  const slope=(maxPx-minPx)/span;
  const intercept=minPx-slope*minWidth;
  return `clamp(${minPx}px, calc(${intercept.toFixed(4)}px + ${(slope*100).toFixed(4)}cqw), ${maxPx}px)`;
}
function liveTypeStyle(asset: ReturnType<typeof getSignatureAsset>, props: Record<string, unknown>): CSSProperties | undefined {
  const geometry=asset?.normalizedContract?.liveContentGeometry;
  if (!geometry) return undefined;
  const governedSafeArea=props.signatureTextSafeArea&&typeof props.signatureTextSafeArea==="object"
    ? props.signatureTextSafeArea as {x:number;y:number;width:number;height:number}
    : geometry.safeArea;
  const requestedAlign=text(props.signatureTextAlign,geometry.alignment) as "left"|"center"|"right";
  const alignment=geometry.allowedAlignments?.includes(requestedAlign)?requestedAlign:geometry.alignment;
  const requestedSize=text(props.signatureTextSize,"medium") as "small"|"medium"|"large";
  const size=requestedSize==="small"||requestedSize==="large"?requestedSize:"medium";
  const fontPreset=geometry.textSizePresetsPxAt390?.[size];
  const linePreset=geometry.lineHeightPresetsPxAt390?.[size];
  const layout=text(props.signatureLayoutMode,"standalone") as "standalone"|"single-stack"|"twin-rail";
  const precision=geometry.presentationTypography?.[layout];
  const requestedPx=typeof props.signatureTextSizePx==="number"?Math.max(precision?.minPx??10,Math.min(precision?.maxPx??20,props.signatureTextSizePx)):undefined;
  const responsive=props.signatureResponsiveTypography&&typeof props.signatureResponsiveTypography==="object"?props.signatureResponsiveTypography as ResponsiveTypographyPolicy:undefined;
  const font=geometry.fontSizePxAt390;
  const line=geometry.lineHeightPxAt390;
  const titleMax=responsive?Math.max(responsive.title.minPx,Math.min(responsive.title.maxPx,responsive.title.maxPx+(requestedPx??precision?.defaultPx??responsive.title.defaultPx)-(precision?.defaultPx??responsive.title.defaultPx))):undefined;
  const titleSize=responsive&&titleMax!=null?responsiveLength(responsive.title.minPx,titleMax,responsive.renderedWidthPx.min,responsive.renderedWidthPx.max):undefined;
  const sublabelSize=responsive?.sublabel?responsiveLength(responsive.sublabel.minPx,responsive.sublabel.maxPx,responsive.renderedWidthPx.min,responsive.renderedWidthPx.max):undefined;
  return {
    ...rectStyle(governedSafeArea),
    textAlign:alignment,
    alignItems:alignment==="left"?"flex-start":alignment==="right"?"flex-end":"center",
    boxSizing:"border-box",
    paddingInlineStart:responsive?`${responsive.safeAreaPaddingPx}px`:undefined,
    paddingInlineEnd:responsive?`${responsive.safeAreaPaddingPx+responsive.affordanceReservePx}px`:undefined,
    fontSize:titleSize??(requestedPx?`${requestedPx}px`:fontPreset?`${fontPreset}px`:font?`clamp(${font[0]}px, 3.85cqw, ${font[1]}px)`:undefined),
    lineHeight:responsive?responsive.title.lineHeight:(requestedPx?`${Math.round(requestedPx*1.22)}px`:linePreset?`${linePreset}px`:line?`clamp(${line[0]}px, 4.9cqw, ${line[1]}px)`:undefined),
    transform:geometry.opticalCenterOffsetEm?`translateY(${geometry.opticalCenterOffsetEm}em)`:undefined,
    ...(responsive?{
      "--signature-title-size":titleSize,
      "--signature-title-line-height":String(responsive.title.lineHeight),
      "--signature-title-tracking":`${responsive.title.trackingEm??0}em`,
      "--signature-sublabel-size":sublabelSize,
      "--signature-sublabel-line-height":String(responsive.sublabel?.lineHeight??1.05),
      "--signature-sublabel-tracking":`${responsive.sublabel?.trackingEm??.12}em`,
    }:{}),
  } as CSSProperties;
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
  const baseSource = versionedSource(asset.liveShellAsset || asset.sourceAsset, asset.sourceSha256);
  const normalized=asset.normalizedContract;
  const identitySocket=normalized?.sockets.find((socket)=>socket.contractId.startsWith("identityHeaderSocket@"));
  const identityContentUrl=text(props.identityContentUrl,text(props.imageUrl,text(props.iconMediaUrl)));
  const identityContentAlt=text(props.identityContentAlt,text(props.alt,"Identity"));
  const informationalText=text(props.informationalText,text(props.statusText));
  const hasAccessibleLiveContent=asset.assetKind==="action"||Boolean(identitySocket&&identityContentUrl)||Boolean(normalized?.liveContentContract&&informationalText);
  if (asset.assetKind === "stage" && asset.expansionContract) {
    const style = { "--signature-stage-source": `url("${baseSource}")` } as CSSProperties;
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
  const projectedRoles=curatedMaterialRoles(props.signatureMaterialRoles);
  const surfaceTarget=asset.assetKind==="action"?"action-surface":text(props.signatureRole) === "semantic-plug"?"plug-surface":text(props.signatureClassification)==="structural"?"structural":undefined;
  const surfaceRole=Object.values(projectedRoles).find((role)=>role.target===surfaceTarget);
  const materialSource=surfaceRole?.materialId?asset.materialSourceVariants?.[surfaceRole.materialId]:undefined;
  const semanticSource=text(props.signatureRole)==="semantic-plug"?asset.semanticSourceVariants?.[text(props.signatureSemanticIcon)]:undefined;
  const sourceSha256=semanticSource?.sourceSha256??materialSource?.sourceSha256??asset.sourceSha256;
  const source=versionedSource(semanticSource?.sourceAsset??materialSource?.sourceAsset??asset.liveShellAsset??asset.sourceAsset,sourceSha256);
  const surface=curatedMaterialSurface(surfaceRole?.materialId);
  const surfaceStyle=curatedMaterialSurfaceStyle(surfaceRole?.materialId);
  const surfaceGeometryStyle=materialGeometryStyle(normalized?.materialSurfaceGeometry);
  const iconSvg=text(props.iconSvg);
  const iconTreatment=props.signatureIconTreatment&&typeof props.signatureIconTreatment==="object"?props.signatureIconTreatment as {mode?:string;safeInset?:number;scale?:number;offsetY?:number;color?:string;materialId?:string}:undefined;
  const iconMaterial=Object.values(projectedRoles).find((role)=>role.target==="icon-artwork")?.materialId??iconTreatment?.materialId;
  const iconRecipe=getMaterialRecipe(iconMaterial);
  const iconInset=Math.max(0,Math.min(.45,iconTreatment?.safeInset??.2))*100;
  const reflection=asset.ambientReflection;
  const requestedReflection=typeof props.signatureBackgroundReflectionIntensity==="number"?props.signatureBackgroundReflectionIntensity:reflection?.defaultIntensity;
  const reflectionIntensity=reflection&&requestedReflection!=null?Math.max(reflection.minIntensity,Math.min(reflection.maxIntensity,requestedReflection)):0;
  const reflectionSource=reflection?versionedSource(reflection.sourceAsset,reflection.sourceSha256):undefined;
  const plugVisualMode=text(props.signaturePlugVisualMode,"composed");
  const masteredChassis=text(props.signatureRole)==="semantic-plug"&&plugVisualMode==="mastered-chassis";
  const responsiveTypography=props.signatureResponsiveTypography&&typeof props.signatureResponsiveTypography==="object"?props.signatureResponsiveTypography as ResponsiveTypographyPolicy:undefined;
  const base = (
    <span className="signature-master" data-signature-renderer-version={SIGNATURE_MASTER_RENDERER_VERSION} data-signature-asset-id={asset.id} data-signature-source-sha={sourceSha256} data-signature-family={asset.familyId} data-signature-family-version={text(props.signatureFamilyVersion)} data-signature-recipe-id={text(props.signatureRecipeId)} data-signature-recipe-version={text(props.signatureRecipeVersion)} data-signature-assembly-instance-id={text(props.signatureAssemblyInstanceId)} data-signature-part-instance-id={text(props.signaturePartInstanceId)} data-signature-parent-part-instance-id={text(props.signatureParentPartInstanceId)} data-signature-action-id={text(props.signatureActionId)} data-signature-kind={asset.assetKind} data-signature-role={asset.role} data-signature-state={state} data-signature-tint-mode={asset.tintMode} data-signature-energy-mode={asset.energyMode} data-signature-component-id={normalized?.componentId} data-signature-component-version={normalized?.componentVersion} data-signature-classification={text(props.signatureClassification)} data-signature-certification={text(props.signatureLayoutCertificationStatus)} data-signature-presentation={text(props.signaturePresentationMode,"standalone")} data-signature-presentation-id={text(props.signaturePresentationId)} data-signature-type-density={responsiveTypography?.density} data-signature-depth={text(props.signatureDepthTreatment)} data-signature-plug-visual-mode={plugVisualMode} data-signature-appearance-contract={text(props.signatureAppearanceContractId)} data-signature-appearance-options={appearanceOptions?JSON.stringify(appearanceOptions):undefined} data-signature-appearance-renderer-values={appearanceRendererValues?JSON.stringify(appearanceRendererValues):undefined} data-signature-material-source={materialSource?.sourceAsset} data-signature-semantic-icon={semanticSource?text(props.signatureSemanticIcon):undefined} data-signature-semantic-source={semanticSource?.sourceAsset} data-signature-background-reflection={String(reflectionIntensity)} data-signature-plug-face={appearanceOptions?.["plug-face"]} data-signature-plug-base={appearanceOptions?.["plug-base"]} data-signature-text-treatment={text(props.signatureTextTreatmentRecipe,normalized?.liveContentGeometry?.textTreatment)} data-signature-mirrored={props.signatureMirrored===true?"true":"false"} data-signature-overlap={String(typeof props.signatureCompensatingOverlapPx==="number"?props.signatureCompensatingOverlapPx:0)} aria-hidden={hasAccessibleLiveContent?undefined:true}>
      {!masteredChassis&&text(props.signatureDepthTreatment) === "raised-contact" ? <span className="signature-master__depth" data-signature-depth-renderer="portable-layer-v1" aria-hidden /> : null}
      {!masteredChassis&&(surfaceStyle||materialSource) ? <span className={`signature-master__material-surface${materialSource?" signature-master__material-surface--source-master":""}`} style={materialSource?surfaceGeometryStyle:{...surfaceStyle,...surfaceGeometryStyle}} data-signature-material-id={surfaceRole?.materialId} data-signature-material-target={surfaceTarget} data-signature-material-shape={normalized?.materialSurfaceGeometry?.clipPolygon?.length?"polygon":normalized?.materialSurfaceGeometry?.borderRadiusPercent!=null?"rounded":"rect"} data-material-fill-authority={materialSource?"production-master":surface?.fillAuthority} data-material-stop-count={materialSource?undefined:surface?String(surface.gradientStopCount):undefined} data-material-highlight={materialSource?"source-master":surface?.highlight?"true":"false"} data-surface-texture={materialSource?"production-master":surface?.textureToken??undefined} aria-hidden>{!materialSource&&surface?<MaterialSurfaceLayers surface={surface} testIdPrefix="signature-material" />:null}</span> : null}
      {/* Immutable source artwork: containment only; never cropped, filtered, recolored, or reconstructed. */}
      <img className="signature-master__asset" src={source} width={asset.width} height={asset.height} alt="" aria-hidden draggable={false} />
      {reflectionSource&&reflectionIntensity>0?<img className="signature-master__environment-reflection" src={reflectionSource} alt="" aria-hidden draggable={false} style={{opacity:reflectionIntensity/100}} />:null}
      {!masteredChassis&&iconSvg && text(props.signatureRole)==="semantic-plug" && !semanticSource ? <span className="signature-master__semantic-icon" style={{inset:`${iconInset}%`,color:iconTreatment?.color??iconRecipe?.artworkFill??iconRecipe?.textColor??"currentColor",transform:`translateY(${iconTreatment?.offsetY??0}%) scale(${iconTreatment?.scale??1})`}} data-signature-icon={text(props.signatureSemanticIcon)} data-signature-icon-render-mode={text(props.iconRenderMode,"stroke")} data-signature-icon-treatment={iconTreatment?.mode} data-signature-icon-material={iconMaterial} aria-hidden dangerouslySetInnerHTML={{__html:iconSvg}} /> : null}
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
