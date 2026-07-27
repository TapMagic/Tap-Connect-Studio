"use client";

/**
 * Shared Card preview that resolves button properties through the visual core.
 * Brand Kit workspace and Card surfaces must share this resolver path.
 */

import { cn } from "@/lib/utils";
import {
  applyResolvedToSectionStyle,
  resolveSelectedAction,
  type CardVisualModel,
} from "@/lib/fusion/authoring/card-visual-resolve";
import { provenanceLabel } from "@/lib/fusion/authoring/visual-property";
import { brandColorsFromKit } from "@/lib/fusion/authoring/brand-kit-adapter";
import { resolveFontFamily } from "@/lib/fusion/authoring/brand-kit-adapter";
import { readableOn } from "@/lib/fusion/authoring/contrast";

export type SharedCardPreviewProps = {
  model: CardVisualModel;
  businessName?: string;
  logoUrl?: string | null;
  className?: string;
  onSelectItem?: (id: string) => void;
  testId?: string;
};

export function SharedCardPreview({
  model,
  businessName = "Your Brand",
  logoUrl,
  className,
  onSelectItem,
  testId = "shared-card-preview",
}: SharedCardPreviewProps) {
  const colors = brandColorsFromKit(model.brand);
  const display = resolveFontFamily(model.brand, "display");
  const body = resolveFontFamily(model.brand, "body");
  const selected =
    model.items.find((i) => i.id === model.selectedItemId) ?? model.items[0];
  const resolved = resolveSelectedAction(model);
  const style = resolved ? applyResolvedToSectionStyle(resolved) : null;

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[320px] overflow-hidden rounded-[1.75rem] border border-white/10 shadow-2xl",
        className
      )}
      style={{ backgroundColor: colors.background, color: colors.headline }}
      data-testid={testId}
      data-resolver="shared-visual-core-v0"
    >
      <div
        className="relative px-5 pb-6 pt-8"
        style={{ backgroundColor: colors.surface }}
        data-testid="shared-card-preview-surface"
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="mb-4 h-10 w-auto max-w-[160px] object-contain"
            data-testid="shared-card-preview-logo"
          />
        ) : null}
        <h2
          className="text-xl font-semibold tracking-tight"
          style={{ fontFamily: display.css, color: colors.headline }}
          data-testid="shared-card-preview-headline"
        >
          {businessName}
        </h2>
        <p
          className="mt-2 text-sm leading-relaxed opacity-90"
          style={{ fontFamily: body.css, color: colors.body }}
        >
          Tap to connect — inherited from Brand Kit.
        </p>

        <div className="mt-5 flex flex-col gap-2" data-testid="shared-card-preview-actions">
          {model.items.map((item) => {
            const isSelected = item.id === selected?.id;
            const r = resolveSelectedAction({ ...model, selectedItemId: item.id });
            const s = r ? applyResolvedToSectionStyle(r) : null;
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`shared-card-action-${item.id}`}
                data-source-background={s?.dataSources.background}
                data-source-foreground={s?.dataSources.foreground}
                data-source-radius={s?.dataSources.radius}
                data-source-icon={s?.dataSources.icon}
                className={cn(
                  "flex min-h-11 w-full items-center justify-center gap-2 px-4 text-sm font-medium outline-none ring-offset-2 transition focus-visible:ring-2 focus-visible:ring-primary",
                  isSelected && "ring-2 ring-white/40"
                )}
                style={{
                  backgroundColor: s?.backgroundColor || colors.cta,
                  color: s?.color || readableOn(s?.backgroundColor || colors.cta),
                  borderRadius: s?.borderRadius || model.surfaceRadius,
                }}
                onClick={() => onSelectItem?.(item.id)}
              >
                <span aria-hidden className="text-xs opacity-80">
                  {s?.icon || "◆"}
                </span>
                {item.label}
              </button>
            );
          })}
        </div>

        {style && selected ? (
          <p
            className="mt-4 text-[10px] uppercase tracking-wider opacity-60"
            data-testid="shared-card-provenance"
          >
            Background: {provenanceLabel(
              (style.dataSources.background as "brand" | "surface" | "preset" | "custom") ||
                "brand"
            )}
            {" · "}
            Text: {provenanceLabel(
              (style.dataSources.foreground as "brand" | "surface" | "preset" | "custom") ||
                "brand"
            )}
            {" · "}
            Radius: {provenanceLabel(
              (style.dataSources.radius as "brand" | "surface" | "preset" | "custom") || "brand"
            )}
            {" · "}
            Icon: {provenanceLabel(
              (style.dataSources.icon as "brand" | "surface" | "preset" | "custom") || "preset"
            )}
          </p>
        ) : null}
      </div>
    </div>
  );
}
