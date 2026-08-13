"use client";

import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { COSMIC_GLASS_ASSETS, COSMIC_GLASS_CANONICAL_RECIPE_ID, readCosmicGlassParams } from "./recipe";
import "./cosmic-glass.css";

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function identityUrl(props: Record<string, unknown>) {
  return text(props.iconMediaUrl, text(props.logoUrl, text(props.imageUrl, "/tap-connect-logo.png")));
}

export function CosmicGlassStudioAction({
  props,
  label,
  description,
}: {
  props: Record<string, unknown>;
  label: string;
  description?: string;
}) {
  const params = readCosmicGlassParams(props);
  const hostRef = useRef<HTMLSpanElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const receiverRef = useRef<HTMLSpanElement>(null);
  const cueRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    const ring = ringRef.current;
    const receiver = receiverRef.current;
    const cue = cueRef.current;
    if (!host || !ring || !receiver || !cue) return;
    const measure = () => {
      const h = host.getBoundingClientRect();
      const r = ring.getBoundingClientRect();
      const receiverBox = receiver.getBoundingClientRect();
      const c = cue.getBoundingClientRect();
      host.style.setProperty("--cg-text-left", `${Math.max(0, Math.max(r.right, receiverBox.right) - h.left + Math.max(4, h.width * 0.012))}px`);
      host.style.setProperty("--cg-text-right", `${Math.max(28, h.right - c.left + Math.max(12, h.width * 0.018))}px`);
      host.dataset.cgMeasured = "true";
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    observer.observe(ring);
    observer.observe(receiver);
    observer.observe(cue);
    return () => observer.disconnect();
  }, [params.ringShape, params.cueVisible]);

  return (
    <span
      ref={hostRef}
      className="cg-action"
      data-cg-ring-finish={params.ringFinish}
      data-cg-ring-shape={params.ringShape}
      data-cg-identity-bezel={params.identityBezel}
      data-vp-cosmic-glass="true"
      data-vp-assembly={COSMIC_GLASS_CANONICAL_RECIPE_ID}
    >
      <span className="cg-chassis-shadow" aria-hidden />
      <span className="cg-chassis cg-chassis-gold" aria-hidden>
        <span className="cg-chassis cg-chassis-blue">
          <span className="cg-chassis cg-chassis-face">
            <span className="cg-chassis-gloss" />
            <span className="cg-filament" />
          </span>
        </span>
      </span>

      <span ref={receiverRef} className="cg-ring-receiver" data-testid="cosmic-glass-ring-receiver" aria-hidden>
        <span className="cg-ring-receiver-channel" />
        <span className="cg-ring-receiver-lip" />
        <span className="cg-ring-contact-shadow" />
      </span>

      <span ref={ringRef} className="cg-ring" data-testid="cosmic-glass-ring-seat" aria-hidden>
        <span className="cg-ring-hull">
          <span className="cg-ring-groove">
            <span className="cg-ring-collar">
              <span className="cg-ring-seat">
                <img
                  className="cg-identity"
                  src={identityUrl(props)}
                  alt=""
                  data-cg-identity-fit={params.identityFit}
                  data-cg-identity-scale={params.identityScale}
                  style={{
                    width: `${78 * params.identityScale}%`,
                    height: `${78 * params.identityScale}%`,
                    left: `${50 + params.identityPositionX * 18}%`,
                    top: `${50 + params.identityPositionY * 18}%`,
                    objectFit: params.identityFit,
                  }}
                />
              </span>
            </span>
          </span>
        </span>
        <span className="cg-ring-notch cg-ring-notch-top" />
        <span className="cg-ring-notch cg-ring-notch-right" />
        <span className="cg-ring-notch cg-ring-notch-bottom" />
        <span className="cg-ring-notch cg-ring-notch-left" />
      </span>

      <span className="cg-copy" data-testid="cosmic-glass-copy">
        {params.eyebrowVisible ? <span className="cg-eyebrow">{text(props.eyebrow, "SIGNATURE ACTION")}</span> : null}
        <span className="cg-title">{label}</span>
        {params.descriptionVisible && description ? <span className="cg-description">{description}</span> : null}
      </span>
      <span ref={cueRef} className="cg-cue" aria-hidden style={{ opacity: params.cueVisible ? 1 : 0 }}>→</span>
      <span className="sr-only" data-testid="vp-cosmic-glass-recipe">{COSMIC_GLASS_CANONICAL_RECIPE_ID}</span>
    </span>
  );
}

export function CosmicGlassDivider({ props, label }: { props: Record<string, unknown>; label?: string }) {
  const params = readCosmicGlassParams(props);
  const centerIdentity = identityUrl(props);
  return (
    <div
      className="cg-divider"
      role="img"
      aria-label={label || "Cosmic Glass divider"}
      data-vp-cosmic-divider="true"
      data-cg-divider-center={params.dividerCenter}
      data-cg-divider-scale={params.dividerScale}
      data-cg-divider-span={params.dividerSpan}
      data-cg-divider-position-x={params.dividerPositionX}
      style={{
        ["--cg-divider-intensity" as string]: String(params.dividerIntensity),
        width: `${params.dividerSpan * 100}%`,
        opacity: params.dividerOpacity,
        filter: `brightness(${0.72 + params.dividerIntensity * 0.28})`,
        transform: `translateX(${params.dividerPositionX * 8}%) scale(${params.dividerScale})`,
      } as CSSProperties}
    >
      {/* Recovered finished assets: placement and intensity only; rods are never redrawn in CSS. */}
      <img className="cg-divider-rod" src={COSMIC_GLASS_ASSETS.leftRod} alt="" aria-hidden />
      <span className="cg-divider-center" aria-hidden>
        {params.dividerCenter === "diamond" ? <img src={COSMIC_GLASS_ASSETS.centerDiamond} alt="" /> : null}
        {params.dividerCenter === "identity" ? <img className="cg-divider-identity" src={centerIdentity} alt="" /> : null}
        {params.dividerCenter === "none" ? <span className="cg-divider-dot" /> : null}
      </span>
      <img className="cg-divider-rod" src={COSMIC_GLASS_ASSETS.rightRod} alt="" aria-hidden />
    </div>
  );
}

export function isCosmicGlassProps(props: Record<string, unknown>) {
  const vp = props.visualParts;
  const bag = vp && typeof vp === "object" ? vp as Record<string, unknown> : {};
  return bag.assemblyRecipeId === COSMIC_GLASS_CANONICAL_RECIPE_ID ||
    bag.curatedFamilyId === "family_cosmic_glass_signature" || props.vpCosmicGlassRecipe === true;
}
