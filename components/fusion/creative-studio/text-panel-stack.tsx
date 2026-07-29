"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { ProfessionalTypographyPanel } from "@/components/fusion/creative-studio/professional-typography-panel";
import {
  NestedPanelShell,
  PanelNavRow,
} from "@/components/fusion/creative-studio/nested-panel-shell";
import type { TapCardSection, TapConnectCardConfig } from "@/lib/brand/tap-card";
import { ExpandedTextField } from "@/components/design/expanded-text-field";

type TextLevel =
  | "root"
  | "content"
  | "typography"
  | "appearance"
  | "color"
  | "alignment"
  | "width"
  | "spacing"
  | "effects"
  | "responsive"
  | "a11y"
  | "advanced";

const ROOT_ITEMS: { id: TextLevel; label: string; hint?: string }[] = [
  { id: "content", label: "Content" },
  { id: "typography", label: "Typography & Formatting" },
  { id: "appearance", label: "Appearance", hint: "Color, alignment, width, effects" },
  { id: "responsive", label: "Responsive" },
  { id: "a11y", label: "Accessibility" },
  { id: "advanced", label: "Advanced" },
];

const APPEARANCE_ITEMS: { id: TextLevel; label: string }[] = [
  { id: "color", label: "Color" },
  { id: "alignment", label: "Alignment" },
  { id: "width", label: "Width" },
  { id: "spacing", label: "Spacing" },
  { id: "effects", label: "Effects" },
];

export type TextPanelStackProps = {
  /** Selected text-like section, or null for Card title typography */
  selected: TapCardSection | null;
  config: TapConnectCardConfig;
  onPatchSection: (id: string, patch: Partial<TapCardSection>, label?: string) => void;
  onPatchConfig: (patch: Partial<TapConnectCardConfig>, label?: string) => void;
  onClose?: () => void;
  brandColors?: string[];
};

export function TextPanelStack({
  selected,
  config,
  onPatchSection,
  onPatchConfig,
  onClose,
  brandColors = ["#22c55e", "#0ea5e9", "#f59e0b", "#f8fafc", "#0b0f19"],
}: TextPanelStackProps) {
  const [level, setLevel] = useState<TextLevel>("root");
  const format = selected?.format ?? config.titleFormat ?? {};
  const sample =
    selected?.text ||
    selected?.label ||
    selected?.headline ||
    "Your Card headline";

  const crumbs = useMemo(() => {
    if (level === "root") return ["Text"];
    if (APPEARANCE_ITEMS.some((a) => a.id === level)) {
      return [
        "Text",
        "Appearance",
        APPEARANCE_ITEMS.find((a) => a.id === level)?.label || level,
      ];
    }
    return ["Text", ROOT_ITEMS.find((r) => r.id === level)?.label || level];
  }, [level]);

  function patchFormat(next: typeof format, label: string) {
    if (selected) onPatchSection(selected.id, { format: next }, label);
    else onPatchConfig({ titleFormat: next }, label);
  }

  if (level === "typography") {
    return (
      <div data-testid="text-panel-typography">
        <ProfessionalTypographyPanel
          value={format}
          sampleText={typeof sample === "string" ? sample : "Your Card headline"}
          brandFontIds={["inter", "source-serif-4", "playfair"]}
          onClose={onClose}
          onChange={(f) => patchFormat(f, "Changed typography")}
        />
        <div className="border-t border-white/10 p-2">
          <button
            type="button"
            className="min-h-10 text-xs text-white/60"
            data-testid="panel-stack-back"
            onClick={() => setLevel("root")}
          >
            ← Back to Text
          </button>
        </div>
      </div>
    );
  }

  return (
    <NestedPanelShell
      title={
        level === "root"
          ? selected
            ? selected.label || "Text"
            : "Card text"
          : ROOT_ITEMS.find((r) => r.id === level)?.label || "Text"
      }
      breadcrumbs={crumbs}
      depth={
        level === "root"
          ? 0
          : APPEARANCE_ITEMS.some((a) => a.id === level) && level !== "appearance"
            ? 2
            : 1
      }
      onBack={
        level === "root"
          ? undefined
          : () =>
              setLevel(
                APPEARANCE_ITEMS.some((a) => a.id === level) && level !== "appearance"
                  ? "appearance"
                  : "root"
              )
      }
      onClose={onClose}
      testId="text-panel-stack"
    >
      {level === "root" ? (
        <div className="space-y-3" data-testid="text-panel-root">
          <div
            className="rounded-md border border-white/10 bg-white/[0.03] p-3 space-y-2"
            data-testid="text-panel-hub"
          >
            <p className="text-[10px] uppercase tracking-wide text-white/40">
              Common controls
            </p>
            <button
              type="button"
              className="flex min-h-10 w-full items-center justify-between rounded-md border border-white/10 px-3 text-left text-xs text-white/85"
              data-testid="text-hub-open-font"
              onClick={() => setLevel("typography")}
            >
              <span>
                Font ·{" "}
                <span style={{ fontFamily: format.fontFamily || "inherit" }}>
                  {format.fontFamily || "Brand default"}
                </span>
              </span>
              <span className="text-white/35">›</span>
            </button>
            <div className="flex flex-wrap gap-2">
              {brandColors.slice(0, 5).map((c) => (
                <button
                  key={c}
                  type="button"
                  className="h-8 w-8 rounded-md border border-white/20"
                  style={{ background: c }}
                  aria-label={`Quick color ${c}`}
                  data-testid={`text-hub-color-${c.replace("#", "")}`}
                  onClick={() =>
                    patchFormat({ ...format, color: c }, "Applied Brand color")
                  }
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  ["left", "Left"],
                  ["center", "Center"],
                  ["right", "Right"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`min-h-9 rounded-md border px-2 text-[11px] ${
                    (format.align || "left") === id
                      ? "border-white/35 bg-white/10"
                      : "border-white/10"
                  }`}
                  data-testid={`text-hub-align-${id}`}
                  onClick={() =>
                    patchFormat({ ...format, align: id }, "Changed text alignment")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {ROOT_ITEMS.map((item) => (
            <PanelNavRow
              key={item.id}
              label={item.label}
              hint={item.hint}
              testId={`text-panel-open-${item.id}`}
              onClick={() => setLevel(item.id)}
            />
          ))}
        </div>
      ) : null}

      {level === "appearance" ? (
        <div className="space-y-2" data-testid="text-panel-appearance">
          <p className="text-[11px] text-white/45">
            Visual properties for this text. Open a group for dedicated controls.
          </p>
          {APPEARANCE_ITEMS.map((item) => (
            <PanelNavRow
              key={item.id}
              label={item.label}
              testId={`text-panel-open-${item.id}`}
              onClick={() => setLevel(item.id)}
            />
          ))}
        </div>
      ) : null}

      {level === "content" ? (
        <div className="space-y-3" data-testid="text-panel-content">
          {selected ? (
            <>
              <ExpandedTextField
                label="Text content"
                value={selected.text || selected.label || selected.headline || ""}
                onChange={(text) => {
                  if (selected.type === "text" || selected.type === "spacer") {
                    onPatchSection(selected.id, { text }, "Changed text content");
                  } else if (selected.headline !== undefined || selected.type === "identity") {
                    onPatchSection(selected.id, { headline: text }, "Changed text content");
                  } else {
                    onPatchSection(selected.id, { label: text }, "Changed text content");
                  }
                }}
              />
              <p className="text-[10px] text-white/35">
                {(selected.text || selected.label || selected.headline || "").length} characters
              </p>
            </>
          ) : (
            <p className="text-sm text-white/60">
              Select a text block on the Card, or open Typography for Card title styles.
            </p>
          )}
        </div>
      ) : null}

      {level === "color" ? (
        <div className="space-y-3" data-testid="text-panel-color">
          <p className="text-[11px] text-white/45">Brand colors</p>
          <div className="flex flex-wrap gap-2">
            {brandColors.map((c) => (
              <button
                key={c}
                type="button"
                className="h-10 w-10 rounded-md border border-white/20"
                style={{ background: c }}
                aria-label={`Apply color ${c}`}
                data-testid={`text-color-${c.replace("#", "")}`}
                onClick={() =>
                  patchFormat({ ...format, color: c }, "Applied Brand color")
                }
              />
            ))}
          </div>
          <label className="block space-y-1">
            <span className="text-[11px] text-white/45">Custom color</span>
            <input
              type="color"
              className="h-10 w-full"
              value={format.color || "#f8fafc"}
              onChange={(e) =>
                patchFormat({ ...format, color: e.target.value }, "Changed text color")
              }
            />
          </label>
          {selected ? (
            <label className="block space-y-1">
              <span className="text-[11px] text-white/45">Block background</span>
              <input
                type="color"
                className="h-10 w-full"
                value={selected.backgroundColor || "#0b0f19"}
                onChange={(e) =>
                  onPatchSection(
                    selected.id,
                    { backgroundColor: e.target.value },
                    "Changed text background"
                  )
                }
              />
            </label>
          ) : null}
          <button
            type="button"
            className="min-h-10 text-xs text-white/60 underline"
            onClick={() => {
              const next = { ...format };
              delete next.color;
              patchFormat(next, "Restored inherited typography");
            }}
          >
            Reset to inherited color
          </button>
        </div>
      ) : null}

      {level === "alignment" ? (
        <div className="flex gap-1" data-testid="text-panel-alignment">
          {(["left", "center", "right", "justify"] as const).map((align) => (
            <button
              key={align}
              type="button"
              className={`min-h-11 flex-1 rounded-md border text-xs capitalize ${
                format.align === align
                  ? "border-white/40 bg-white/10"
                  : "border-white/10"
              }`}
              onClick={() =>
                patchFormat(
                  { ...format, align },
                  align === "center" ? "Centered text" : "Changed text alignment"
                )
              }
            >
              {align}
            </button>
          ))}
        </div>
      ) : null}

      {level === "width" ? (
        <div className="space-y-3" data-testid="text-panel-width">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected?.fullWidth !== false}
              disabled={!selected}
              onChange={(e) =>
                selected &&
                onPatchSection(
                  selected.id,
                  { fullWidth: e.target.checked },
                  "Changed text width"
                )
              }
            />
            Full width
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(selected?.wrap ?? true)}
              disabled={!selected}
              onChange={(e) =>
                selected &&
                onPatchSection(selected.id, { wrap: e.target.checked }, "Changed text wrap")
              }
            />
            Allow wrapping
          </label>
          <p className="text-[11px] text-white/40">
            Custom max-width is not independently stored yet; width follows Card layout.
          </p>
        </div>
      ) : null}

      {level === "spacing" ? (
        <div className="space-y-3" data-testid="text-panel-spacing">
          <label className="block space-y-1">
            <span className="text-[11px] text-white/45">
              Horizontal padding {selected?.paddingX ?? 0}px
            </span>
            <input
              type="range"
              min={0}
              max={48}
              disabled={!selected}
              value={selected?.paddingX ?? 0}
              onChange={(e) =>
                selected &&
                onPatchSection(
                  selected.id,
                  { paddingX: Number(e.target.value) },
                  "Changed text spacing"
                )
              }
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] text-white/45">
              Vertical padding {selected?.paddingY ?? 0}px
            </span>
            <input
              type="range"
              min={0}
              max={48}
              disabled={!selected}
              value={selected?.paddingY ?? 0}
              onChange={(e) =>
                selected &&
                onPatchSection(
                  selected.id,
                  { paddingY: Number(e.target.value) },
                  "Changed text spacing"
                )
              }
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] text-white/45">
              Line height{" "}
              {typeof format.lineHeight === "number" ? format.lineHeight : 1.35}
            </span>
            <input
              type="range"
              min={0.9}
              max={2.2}
              step={0.05}
              value={typeof format.lineHeight === "number" ? format.lineHeight : 1.35}
              onChange={(e) =>
                patchFormat(
                  { ...format, lineHeight: Number(e.target.value) },
                  "Changed line height"
                )
              }
            />
          </label>
        </div>
      ) : null}

      {level === "effects" ? (
        <div className="space-y-3" data-testid="text-panel-effects">
          <label className="block space-y-1">
            <span className="text-[11px] text-white/45">
              Opacity {selected?.opacity ?? 100}%
            </span>
            <input
              type="range"
              min={30}
              max={100}
              disabled={!selected}
              value={selected?.opacity ?? 100}
              onChange={(e) =>
                selected &&
                onPatchSection(
                  selected.id,
                  { opacity: Number(e.target.value) },
                  "Changed text opacity"
                )
              }
            />
          </label>
          <p className="text-[11px] text-white/40">
            Decorative glow on body text is avoided to protect readability.
          </p>
        </div>
      ) : null}

      {level === "responsive" ? (
        <div className="space-y-2 text-sm text-white/70" data-testid="text-panel-responsive">
          <p>
            Point sizes scale with the Card surface. Independent desktop/tablet/phone type
            overrides are not authored separately — hierarchy stays shared.
          </p>
        </div>
      ) : null}

      {level === "a11y" ? (
        <div className="space-y-3" data-testid="text-panel-a11y">
          <label className="block space-y-1">
            <span className="text-[11px] text-white/45">Accessible name</span>
            <Input
              value={selected?.altText ?? ""}
              disabled={!selected}
              onChange={(e) =>
                selected &&
                onPatchSection(
                  selected.id,
                  { altText: e.target.value },
                  "Changed accessibility label"
                )
              }
            />
          </label>
          <p className="text-[11px] text-white/40">
            Prefer sufficient contrast between text and Card surface. Brand lime is reserved
            for forward actions, not body emphasis.
          </p>
        </div>
      ) : null}

      {level === "advanced" ? (
        <div className="space-y-3" data-testid="text-panel-advanced">
          <label className="block space-y-1">
            <span className="text-[11px] text-white/45">Max lines</span>
            <Input
              type="number"
              min={1}
              max={20}
              value={format.maxLines ?? ""}
              onChange={(e) =>
                patchFormat(
                  {
                    ...format,
                    maxLines: e.target.value ? Number(e.target.value) : undefined,
                  },
                  "Changed text max lines"
                )
              }
            />
          </label>
        </div>
      ) : null}
    </NestedPanelShell>
  );
}
