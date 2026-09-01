"use client";

import { useEffect, useState } from "react";

type PlugEvidence = {
  actionId: string;
  semanticId: string;
  assetId: string;
  sourceSha: string;
  sourceUrl: string;
  loaded: boolean;
  naturalSize: string;
  appearanceContract: string;
  appearanceOptions: string;
  rendererValues: string;
  depthTreatment: string;
  depthRenderer: string;
  computedDepth: string;
  legacyPseudoContent: string;
  assembly: string;
  assemblyId: string;
  rendererVersion: string;
};

function evidenceFingerprint(plugs: PlugEvidence[]): string {
  const value = JSON.stringify(plugs.map((plug) => ({
    actionId: plug.actionId,
    semanticId: plug.semanticId,
    assetId: plug.assetId,
    sourceSha: plug.sourceSha,
    appearanceContract: plug.appearanceContract,
    appearanceOptions: plug.appearanceOptions,
    rendererValues: plug.rendererValues,
    depthTreatment: plug.depthTreatment,
    depthRenderer: plug.depthRenderer,
    assembly: plug.assembly,
    assemblyId: plug.assemblyId,
    rendererVersion: plug.rendererVersion,
  })));
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

async function waitForImage(image: HTMLImageElement | null): Promise<void> {
  if (!image || (image.complete && image.naturalWidth > 0)) return;
  await new Promise<void>((resolve) => {
    const done = () => resolve();
    image.addEventListener("load", done, { once: true });
    image.addEventListener("error", done, { once: true });
  });
}

export function LiveDeviceDebugEvidence({ cardId, revision, snapshotRevision, sessionId, sessionCreatedAt, followMode }: { cardId: string; revision: number; snapshotRevision: number; sessionId: string; sessionCreatedAt: string; followMode: "follow" | "freeze" }) {
  const [plugs, setPlugs] = useState<PlugEvidence[]>([]);
  const [userAgent, setUserAgent] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-signature-role="semantic-plug"]'));
      await Promise.all(elements.map((element) => waitForImage(element.querySelector("img.signature-master__asset"))));
      if (!active) return;
      setUserAgent(window.navigator.userAgent);
      setPlugs(elements.map((element) => {
        const image = element.querySelector<HTMLImageElement>("img.signature-master__asset");
        const depth = element.querySelector<HTMLElement>(".signature-master__depth");
        const depthStyle = depth ? getComputedStyle(depth) : null;
        const pseudo = getComputedStyle(element, "::before");
        return {
          actionId: element.dataset.signatureActionId || "missing",
          semanticId: element.dataset.signatureComponentId || "missing",
          assetId: element.dataset.signatureAssetId || "missing",
          sourceSha: element.dataset.signatureSourceSha || "missing",
          sourceUrl: image?.currentSrc || image?.src || "missing",
          loaded: Boolean(image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0),
          naturalSize: image ? `${image.naturalWidth}×${image.naturalHeight}` : "missing",
          appearanceContract: element.dataset.signatureAppearanceContract || "missing",
          appearanceOptions: element.dataset.signatureAppearanceOptions || "missing",
          rendererValues: element.dataset.signatureAppearanceRendererValues || "missing",
          depthTreatment: element.dataset.signatureDepth || "missing",
          depthRenderer: depth?.dataset.signatureDepthRenderer || "missing",
          computedDepth: depthStyle
            ? `display=${depthStyle.display}; z=${depthStyle.zIndex}; filter=${depthStyle.filter}; shadow=${depthStyle.boxShadow}`
            : "missing",
          legacyPseudoContent: pseudo.content || "none",
          assembly: `${element.dataset.signatureRecipeId || "missing"}@${element.dataset.signatureRecipeVersion || "missing"}`,
          assemblyId: element.dataset.signatureAssemblyInstanceId || "missing",
          rendererVersion: element.dataset.signatureRendererVersion || "missing",
        };
      }));
    })();
    return () => { active = false; };
  }, [revision]);

  return (
    <details className="fixed bottom-2 left-2 right-2 z-[1000] max-h-[58dvh] overflow-auto rounded-xl border border-lime-300/50 bg-[#07100af2] p-3 text-[11px] leading-snug text-white shadow-2xl" data-testid="live-device-debug-evidence">
      <summary className="cursor-pointer font-semibold text-lime-200">Live Device evidence · revision {revision} · {plugs.length} plugs</summary>
      <p className="mt-2 break-all"><strong>Card / session:</strong> {cardId} · {sessionId}</p>
      <p><strong>Session:</strong> signed-hmac-sha256.v1 · {followMode} · created {sessionCreatedAt}</p>
      <p><strong>Revision:</strong> served {revision} · snapshot {snapshotRevision}</p>
      <p><strong>Projection fingerprint:</strong> {evidenceFingerprint(plugs)}</p>
      <p className="mt-2 break-all text-white/65">{userAgent}</p>
      {plugs.map((plug, index) => (
        <section className="mt-3 border-t border-white/15 pt-2" key={`${plug.actionId}:${plug.semanticId}:${index}`} data-testid="live-device-debug-plug">
          <p><strong>Action:</strong> {plug.actionId}</p>
          <p><strong>Semantic / Asset:</strong> {plug.semanticId} · {plug.assetId}</p>
          <p className="break-all"><strong>Source:</strong> {plug.sourceUrl}</p>
          <p><strong>SHA / loaded:</strong> {plug.sourceSha} · {String(plug.loaded)} · {plug.naturalSize}</p>
          <p><strong>Assembly:</strong> {plug.assembly} · {plug.assemblyId}</p>
          <p className="break-all"><strong>Appearance:</strong> {plug.appearanceContract} · {plug.appearanceOptions}</p>
          <p className="break-all"><strong>Renderer:</strong> {plug.rendererVersion} · {plug.rendererValues}</p>
          <p><strong>Depth:</strong> {plug.depthTreatment} · {plug.depthRenderer}</p>
          <p className="break-all"><strong>Computed:</strong> {plug.computedDepth}</p>
          <p><strong>Legacy pseudo:</strong> {plug.legacyPseudoContent}</p>
        </section>
      ))}
    </details>
  );
}
