"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NestedPanelShell,
  PanelNavRow,
} from "@/components/fusion/creative-studio/nested-panel-shell";
import type { TapCardSection } from "@/lib/brand/tap-card";

type MediaLevel = "root" | "source" | "fit" | "a11y" | "advanced";

export type ImagePanelStackProps = {
  selected: TapCardSection | null;
  onPatchSection: (id: string, patch: Partial<TapCardSection>, label?: string) => void;
  onClose?: () => void;
  /** Header / brand logo URL when no image section is selected */
  headerLogoUrl?: string;
  onPatchHeaderLogo?: (url: string) => void;
  showHeaderLogo?: boolean;
  onToggleHeaderLogo?: (on: boolean) => void;
};

/**
 * Level 0–2 Contextual Inspector for Card Image / Media / Logo selection.
 */
export function ImagePanelStack({
  selected,
  onPatchSection,
  onClose,
  headerLogoUrl = "",
  onPatchHeaderLogo,
  showHeaderLogo,
  onToggleHeaderLogo,
}: ImagePanelStackProps) {
  const [level, setLevel] = useState<MediaLevel>("root");
  const isImage =
    selected?.type === "image" ||
    selected?.type === "logo_block" ||
    selected?.type === "hero";

  const crumbs = useMemo(() => {
    if (level === "root") return ["Image / Media"];
    const labels: Record<MediaLevel, string> = {
      root: "Image / Media",
      source: "Source",
      fit: "Fit & Crop",
      a11y: "Accessibility",
      advanced: "Advanced",
    };
    return ["Image / Media", labels[level]];
  }, [level]);

  if (!isImage && !onPatchHeaderLogo) {
    return (
      <NestedPanelShell
        title="Image / Media"
        breadcrumbs={["Image / Media"]}
        depth={0}
        onClose={onClose}
        testId="image-panel-stack"
      >
        <p className="text-xs text-white/55" data-testid="image-panel-empty">
          Select an image, logo, or hero block on the Card — or enable the header logo below.
        </p>
        {onToggleHeaderLogo ? (
          <label className="mt-3 flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={showHeaderLogo === true}
              onChange={(e) => onToggleHeaderLogo(e.target.checked)}
              data-testid="image-panel-header-logo-toggle"
            />
            Logo above card
          </label>
        ) : null}
      </NestedPanelShell>
    );
  }

  const src =
    (selected && (selected.imageUrl || selected.logoUrl)) ||
    headerLogoUrl ||
    "";
  const alt = (selected && selected.label) || "";

  function patchSelected(patch: Partial<TapCardSection>, label: string) {
    if (!selected) return;
    onPatchSection(selected.id, patch, label);
  }

  return (
    <NestedPanelShell
      title={level === "root" ? "Image / Media" : crumbs[crumbs.length - 1]}
      breadcrumbs={crumbs}
      depth={level === "root" ? 0 : 1}
      onBack={level === "root" ? undefined : () => setLevel("root")}
      onClose={onClose}
      testId="image-panel-stack"
    >
      {level === "root" ? (
        <div className="space-y-2" data-testid="image-panel-hub">
          <p className="text-xs text-white/55">
            {selected
              ? `Selected ${selected.type}`
              : "Card header logo"}
          </p>
          <PanelNavRow
            label="Source"
            hint="URL or logo"
            testId="image-open-source"
            onClick={() => setLevel("source")}
          />
          <PanelNavRow
            label="Fit & Crop"
            hint="Cover / contain"
            testId="image-open-fit"
            onClick={() => setLevel("fit")}
          />
          <PanelNavRow
            label="Accessibility"
            hint="Alt text"
            testId="image-open-a11y"
            onClick={() => setLevel("a11y")}
          />
          <PanelNavRow
            label="Advanced"
            testId="image-open-advanced"
            onClick={() => setLevel("advanced")}
          />
          {onToggleHeaderLogo ? (
            <label className="flex items-center gap-2 border-t border-white/10 pt-2 text-xs">
              <input
                type="checkbox"
                checked={showHeaderLogo === true}
                onChange={(e) => onToggleHeaderLogo(e.target.checked)}
                data-testid="image-panel-header-logo-toggle"
              />
              Logo above card
            </label>
          ) : null}
        </div>
      ) : null}

      {level === "source" ? (
        <div className="space-y-2" data-testid="image-panel-source">
          <Label className="text-xs">Image URL</Label>
          <Input
            value={String(src || "")}
            data-testid="image-panel-src"
            onChange={(e) => {
              const url = e.target.value;
              if (selected) {
                patchSelected(
                  selected.type === "logo_block"
                    ? { logoUrl: url }
                    : { imageUrl: url },
                  "Changed image source"
                );
              } else {
                onPatchHeaderLogo?.(url);
              }
            }}
          />
        </div>
      ) : null}

      {level === "fit" ? (
        <div className="space-y-2" data-testid="image-panel-fit">
          <Label className="text-xs">Logo scale</Label>
          <input
            type="range"
            min={40}
            max={160}
            value={Math.round((selected?.logoScale ?? 1) * 100)}
            data-testid="image-logo-scale"
            className="w-full"
            disabled={!selected}
            onChange={(e) =>
              selected &&
              patchSelected(
                { logoScale: Number(e.target.value) / 100 },
                "Changed logo scale"
              )
            }
          />
          <p className="text-[11px] text-white/45">
            Cover / contain cropping for freeform media is in Creative Composition frames.
          </p>
        </div>
      ) : null}

      {level === "a11y" ? (
        <div className="space-y-2" data-testid="image-panel-a11y">
          <Label className="text-xs">Accessible label</Label>
          <Input
            value={String(alt || "")}
            data-testid="image-panel-alt"
            onChange={(e) =>
              selected &&
              patchSelected({ label: e.target.value }, "Changed image label")
            }
          />
        </div>
      ) : null}

      {level === "advanced" ? (
        <div className="space-y-2" data-testid="image-panel-advanced">
          <p className="text-[11px] text-white/45">
            Crop focal points and brand logo library live in Brand Kit. Composition frames
            support mask, focal, and scale on the Creative Composition Block.
          </p>
        </div>
      ) : null}
    </NestedPanelShell>
  );
}
