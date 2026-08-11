"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  Lock,
  Sparkles,
  Globe,
  Phone,
  Mail,
  MapPin,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import "./top-shelf.css";
import { ButtonBase, GlossOverlay, IconRing, OuterGlowRing } from "./TopShelfPrimitives";
import { topShelfPaletteFromAnchor } from "./palette";
import {
  TOP_SHELF_CANONICAL_RECIPE_ID,
  readTopShelfParams,
} from "./recipe";

const ICON_MAP: Record<string, LucideIcon> = {
  lock: Lock,
  sparkles: Sparkles,
  globe: Globe,
  phone: Phone,
  mail: Mail,
  "map-pin": MapPin,
  "arrow-up-right": ArrowUpRight,
};

function resolveIcon(name: string | undefined): LucideIcon | undefined {
  if (!name || name === "none") return undefined;
  return ICON_MAP[name] || ICON_MAP[name.toLowerCase()] || Sparkles;
}

/**
 * Shared Edit/Preview/Public paint for Top Shelf Premium Action.
 * Uses installed package layers — not a parallel Button engine.
 */
export function TopShelfStudioPremiumAction({
  props,
  label,
  description,
  children,
}: {
  props: Record<string, unknown>;
  label: string;
  description?: string;
  children?: ReactNode;
}) {
  const params = readTopShelfParams(props);
  const palette = topShelfPaletteFromAnchor(params.anchorColor);
  const Icon = resolveIcon(typeof props.icon === "string" ? props.icon : undefined);
  const showDescription = params.descriptionVisible !== false && Boolean(description);
  const ring =
    params.iconRingEnabled !== false && Icon ? (
      <IconRing icon={Icon} size="lg" palette={palette} />
    ) : null;
  const gloss = params.glossIntensity ?? 1;
  const radius = Math.min(999, Math.max(18, params.radiusPx ?? 999));

  return (
    <OuterGlowRing palette={palette} intensity={params.haloIntensity} className="ts-studio-host">
      <ButtonBase
        as="span"
        palette={palette}
        className="ts-premium-action"
        style={
          {
            borderRadius: radius,
            width: "100%",
            minHeight: 52,
            ["--ts-gloss-opacity" as string]: String(gloss),
            ["--ts-depth" as string]: String(params.depth ?? 0.8),
          } as CSSProperties
        }
        disabled={props.disabled === true}
      >
        <GlossOverlay intensity={gloss} />
        {params.iconRingPlacement === "left" ? ring : null}
        <span className="ts-copy-stack">
          <span className="ts-copy-stack__label">{label}</span>
          {showDescription && description ? (
            <span className="ts-copy-stack__description">{description}</span>
          ) : null}
          {children}
        </span>
        {params.iconRingPlacement === "right" ? ring : null}
        {params.rightCueVisible !== false ? (
          <span className="ts-action-cue" aria-hidden>
            {params.rightCue || "→"}
          </span>
        ) : null}
      </ButtonBase>
      <span className="sr-only" data-testid="vp-topshelf-recipe" data-vp-assembly={TOP_SHELF_CANONICAL_RECIPE_ID}>
        {TOP_SHELF_CANONICAL_RECIPE_ID}
      </span>
    </OuterGlowRing>
  );
}

export function isTopShelfPremiumActionProps(props: Record<string, unknown>): boolean {
  const vp = props.visualParts;
  if (!vp || typeof vp !== "object") return false;
  const bag = vp as Record<string, unknown>;
  return (
    bag.assemblyRecipeId === TOP_SHELF_CANONICAL_RECIPE_ID ||
    bag.curatedFamilyId === "family_top_shelf_premium_action" ||
    props.vpTopShelfRecipe === true
  );
}
