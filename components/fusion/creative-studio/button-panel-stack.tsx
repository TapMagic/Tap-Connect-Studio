"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FinishPicker } from "@/components/design/format-controls";
import { ProfessionalTypographyPanel } from "@/components/fusion/creative-studio/professional-typography-panel";
import {
  NestedPanelShell,
  PanelNavRow,
} from "@/components/fusion/creative-studio/nested-panel-shell";
import {
  CONTENT_ALIGN_OPTIONS,
  ICON_PLACEMENT_OPTIONS,
  ICON_SIZE_OPTIONS,
} from "@/lib/design/button-layout";
import {
  TAP_CARD_ACTION_CATALOG,
  TAP_CARD_SHAPE_OPTIONS,
  resolveActionHref,
  type TapCardActionKind,
  type TapCardButtonShape,
  type TapCardSection,
  type TapConnectCardConfig,
} from "@/lib/brand/tap-card";
import type { BrandContactProfile } from "@/lib/brand/contact-profile";
import { cn } from "@/lib/utils";

type ButtonLevel =
  | "root"
  | "content"
  | "action"
  | "typography"
  | "appearance"
  | "shape"
  | "spacing"
  | "icon"
  | "visibility"
  | "behavior"
  | "test"
  | "advanced";

const ROOT_ITEMS: { id: ButtonLevel; label: string; hint?: string }[] = [
  { id: "content", label: "Content & Action", hint: "Label and destination" },
  { id: "typography", label: "Typography" },
  { id: "appearance", label: "Appearance", hint: "Fill, shape, border, glow" },
  { id: "spacing", label: "Layout & Spacing" },
  { id: "icon", label: "Icon" },
  { id: "behavior", label: "Behavior" },
  { id: "test", label: "Test Action" },
  { id: "advanced", label: "Advanced" },
];

export type ButtonPanelStackProps = {
  selected: TapCardSection;
  config: TapConnectCardConfig;
  profile: BrandContactProfile;
  reviewUrl?: string | null;
  onPatch: (patch: Partial<TapCardSection>, label?: string) => void;
  onPatchConfig?: (patch: Partial<TapConnectCardConfig>, label?: string) => void;
  onClose?: () => void;
  onTestAction?: () => void;
};

export function ButtonPanelStack({
  selected,
  config,
  profile,
  reviewUrl,
  onPatch,
  onPatchConfig,
  onClose,
  onTestAction,
}: ButtonPanelStackProps) {
  const [level, setLevel] = useState<ButtonLevel>("root");
  const crumbs = useMemo(() => {
    if (level === "root") return ["Button"];
    const item = ROOT_ITEMS.find((r) => r.id === level);
    return ["Button", item?.label || level];
  }, [level]);

  const title =
    level === "root"
      ? selected.label || "Button"
      : ROOT_ITEMS.find((r) => r.id === level)?.label || "Button";

  const destination = resolveActionHref(selected, profile, reviewUrl) || selected.href || "";

  function back() {
    setLevel("root");
  }

  if (level === "typography") {
    return (
      <div data-testid="button-panel-typography">
        <ProfessionalTypographyPanel
          value={selected.format ?? {}}
          sampleText={selected.label || "Button"}
          brandFontIds={["inter", "source-serif-4", "playfair"]}
          onClose={onClose}
          onChange={(format) => onPatch({ format }, "Changed button typography")}
        />
        <div className="border-t border-white/10 p-2">
          <button
            type="button"
            className="min-h-10 text-xs text-white/60"
            data-testid="panel-stack-back"
            onClick={back}
          >
            ← Back to Button
          </button>
        </div>
      </div>
    );
  }

  return (
    <NestedPanelShell
      title={title}
      breadcrumbs={crumbs}
      depth={level === "root" ? 0 : 1}
      onBack={level === "root" ? undefined : back}
      onClose={onClose}
      testId="button-panel-stack"
    >
      {level === "root" ? (
        <div className="space-y-3" data-testid="button-panel-root">
          <div
            className="rounded-md border border-white/10 bg-white/[0.03] p-3 space-y-2"
            data-testid="button-panel-hub"
          >
            <p className="text-[10px] uppercase tracking-wide text-white/40">
              Common controls
            </p>
            <p className="text-sm text-white/90" data-testid="button-hub-label">
              {selected.label || "Button"}
            </p>
            <p className="truncate text-[11px] text-white/45" data-testid="button-hub-destination">
              {selected.actionKind || "action"} · {destination || "No destination"}
            </p>
            <button
              type="button"
              className="flex min-h-10 w-full items-center justify-between rounded-md border border-white/10 px-3 text-left text-xs"
              data-testid="button-hub-open-typography"
              onClick={() => setLevel("typography")}
            >
              <span>
                Font ·{" "}
                <span style={{ fontFamily: selected.format?.fontFamily || "inherit" }}>
                  {selected.format?.fontFamily || "Brand default"}
                </span>
              </span>
              <span className="text-white/35">›</span>
            </button>
            <div className="flex gap-2">
              <label className="flex-1 space-y-1">
                <span className="text-[10px] text-white/40">Fill</span>
                <input
                  type="color"
                  className="h-9 w-full"
                  value={selected.backgroundColor || config.pillColor || "#222222"}
                  data-testid="button-hub-fill"
                  onChange={(e) =>
                    onPatch({ backgroundColor: e.target.value }, "Changed button fill")
                  }
                />
              </label>
              <label className="flex-1 space-y-1">
                <span className="text-[10px] text-white/40">Text</span>
                <input
                  type="color"
                  className="h-9 w-full"
                  value={selected.textColor || config.pillTextColor || "#ffffff"}
                  data-testid="button-hub-text-color"
                  onChange={(e) =>
                    onPatch({ textColor: e.target.value }, "Changed button text color")
                  }
                />
              </label>
            </div>
            <Button
              type="button"
              className="min-h-10 w-full bg-primary text-primary-foreground"
              data-testid="button-hub-test-action"
              onClick={() => onTestAction?.()}
            >
              Test Action
            </Button>
          </div>
          <p className="text-[11px] text-white/45">
            Editing {selected.label || selected.actionKind || "button"} · Edit selects —
            use Test Action to try the destination.
          </p>
          {ROOT_ITEMS.map((item) => (
            <PanelNavRow
              key={item.id}
              label={item.label}
              hint={item.hint}
              testId={`button-panel-open-${item.id}`}
              onClick={() => setLevel(item.id === "content" ? "content" : item.id)}
            />
          ))}
          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-between rounded-md border border-white/10 px-3 text-left text-sm text-white/85 hover:bg-white/5"
            data-testid="button-panel-open-action"
            onClick={() => setLevel("action")}
          >
            Action destination
            <span className="text-white/35">›</span>
          </button>
          <div className="border-t border-white/10 pt-3">
            <Label className="text-[10px] text-white/45">All actions layout</Label>
            <div className="mt-1 flex flex-wrap gap-1">
              {(
                [
                  ["stack", "List"],
                  ["grid_2", "Two columns"],
                  ["icon_row", "Icon row"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={cn(
                    "min-h-10 rounded-md border px-2 text-xs",
                    config.actionsLayout === id
                      ? "border-white/35 bg-white/10"
                      : "border-white/10"
                  )}
                  onClick={() =>
                    onPatchConfig?.(
                      { actionsLayout: id },
                      "Changed actions layout"
                    )
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {level === "content" ? (
        <div className="space-y-3" data-testid="button-panel-content">
          <label className="block space-y-1">
            <span className="text-[11px] text-white/45">Visible label</span>
            <Input
              value={selected.label ?? ""}
              data-testid="button-label-input"
              onChange={(e) => onPatch({ label: e.target.value }, "Changed button label")}
            />
            <span className="text-[10px] text-white/35">
              {(selected.label || "").length} characters
            </span>
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] text-white/45">Supporting text</span>
            <Input
              value={selected.description ?? ""}
              onChange={(e) =>
                onPatch({ description: e.target.value }, "Changed button supporting text")
              }
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] text-white/45">Accessibility label</span>
            <Input
              value={selected.altText ?? ""}
              placeholder={selected.label || "Describe the button"}
              onChange={(e) =>
                onPatch({ altText: e.target.value }, "Changed button accessibility label")
              }
            />
          </label>
        </div>
      ) : null}

      {level === "action" ? (
        <div className="space-y-3" data-testid="button-panel-action">
          <label className="block space-y-1">
            <span className="text-[11px] text-white/45">Action type</span>
            <select
              className="h-10 w-full rounded-md border border-white/15 bg-black/30 px-2 text-sm"
              value={selected.actionKind || "custom"}
              data-testid="button-action-kind"
              onChange={(e) =>
                onPatch(
                  { actionKind: e.target.value as TapCardActionKind },
                  "Changed button action type"
                )
              }
            >
              {TAP_CARD_ACTION_CATALOG.map((c) => (
                <option key={c.kind} value={c.kind}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] text-white/45">Destination</span>
            <Input
              value={selected.href ?? ""}
              placeholder="https://… · tel: · mailto: · maps…"
              data-testid="button-destination-input"
              onChange={(e) =>
                onPatch({ href: e.target.value }, "Changed website destination")
              }
            />
          </label>
          <p className="break-all text-[11px] text-white/45" data-testid="button-resolved-destination">
            Resolved: {destination || "None"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-10"
              data-testid="button-copy-destination"
              disabled={!destination}
              onClick={() => {
                if (destination) void navigator.clipboard.writeText(destination);
              }}
            >
              Copy destination
            </Button>
            <Button
              type="button"
              className="min-h-10 bg-primary text-primary-foreground"
              data-testid="button-test-action"
              onClick={() => onTestAction?.()}
            >
              Test Action
            </Button>
          </div>
          <p className="text-[11px] text-white/40">
            Test Action opens the destination safely. Edit mode never activates the Card button
            by accident.
          </p>
        </div>
      ) : null}

      {level === "appearance" ? (
        <div className="space-y-3" data-testid="button-panel-appearance">
          <FinishPicker
            label="Finish"
            value={selected.finish || config.defaultFinish}
            allowNone
            onChange={(finish) => onPatch({ finish }, "Changed button finish")}
          />
          <label className="block space-y-1">
            <span className="text-[11px] text-white/45">Fill</span>
            <input
              type="color"
              className="h-10 w-full"
              value={selected.backgroundColor || config.pillColor || "#222222"}
              onChange={(e) =>
                onPatch({ backgroundColor: e.target.value }, "Changed button fill")
              }
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] text-white/45">Text color</span>
            <input
              type="color"
              className="h-10 w-full"
              value={selected.textColor || config.pillTextColor || "#ffffff"}
              onChange={(e) =>
                onPatch({ textColor: e.target.value }, "Changed button text color")
              }
            />
          </label>
          <div className="space-y-2">
            <p className="text-[11px] text-white/45">Shape</p>
            <div className="grid grid-cols-2 gap-2">
              {TAP_CARD_SHAPE_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={cn(
                    "min-h-11 rounded-md border px-2 text-xs",
                    (selected.shape || config.defaultShape) === o.id
                      ? "border-white/40 bg-white/10"
                      : "border-white/10"
                  )}
                  data-testid={`button-shape-${o.id}`}
                  onClick={() =>
                    onPatch(
                      { shape: o.id as TapCardButtonShape },
                      "Changed button shape"
                    )
                  }
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <label className="block space-y-1">
            <span className="text-[11px] text-white/45">
              Opacity {selected.opacity ?? 100}%
            </span>
            <input
              type="range"
              min={20}
              max={100}
              value={selected.opacity ?? 100}
              onChange={(e) =>
                onPatch({ opacity: Number(e.target.value) }, "Changed button opacity")
              }
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] text-white/45">Glow / neon</span>
            <input
              type="color"
              className="h-10 w-full"
              value={selected.neonColor || config.neonColor || "#a3e635"}
              onChange={(e) =>
                onPatch({ neonColor: e.target.value }, "Changed button glow")
              }
            />
          </label>
          <p className="text-[11px] text-white/40">
            Hover, focus, and pressed treatments follow the selected finish on the live Card.
          </p>
        </div>
      ) : null}

      {level === "shape" ? (
        <div className="space-y-3" data-testid="button-panel-shape">
          <p className="text-[11px] text-white/45">
            Shape lives in Appearance. Use Back, then Appearance.
          </p>
          <button
            type="button"
            className="min-h-10 text-xs text-white/70"
            onClick={() => setLevel("appearance")}
          >
            Open Appearance
          </button>
        </div>
      ) : null}

      {level === "spacing" ? (
        <div className="space-y-3" data-testid="button-panel-spacing">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.fullWidth !== false}
              onChange={(e) =>
                onPatch(
                  { fullWidth: e.target.checked },
                  e.target.checked ? "Set button to full width" : "Set button to auto width"
                )
              }
            />
            Full width
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] text-white/45">
              Horizontal padding {selected.paddingX ?? 16}px
            </span>
            <input
              type="range"
              min={4}
              max={48}
              value={selected.paddingX ?? 16}
              onChange={(e) =>
                onPatch({ paddingX: Number(e.target.value) }, "Changed button padding")
              }
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] text-white/45">
              Vertical padding {selected.paddingY ?? 12}px
            </span>
            <input
              type="range"
              min={4}
              max={40}
              value={selected.paddingY ?? 12}
              onChange={(e) =>
                onPatch({ paddingY: Number(e.target.value) }, "Changed button padding")
              }
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] text-white/45">
              Min height {selected.minHeight ?? 44}px
            </span>
            <input
              type="range"
              min={32}
              max={72}
              value={selected.minHeight ?? 44}
              onChange={(e) =>
                onPatch({ minHeight: Number(e.target.value) }, "Changed button height")
              }
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] text-white/45">Content alignment</span>
            <select
              className="h-10 w-full rounded-md border border-white/15 bg-black/30 px-2 text-sm"
              value={selected.contentAlign || "center"}
              onChange={(e) =>
                onPatch(
                  { contentAlign: e.target.value as "start" | "center" | "end" },
                  "Changed button alignment"
                )
              }
            >
              {CONTENT_ALIGN_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(selected.wrap)}
              onChange={(e) => onPatch({ wrap: e.target.checked }, "Changed button wrap")}
            />
            Allow label wrap
          </label>
        </div>
      ) : null}

      {level === "icon" ? (
        <div className="space-y-3" data-testid="button-panel-icon">
          <label className="block space-y-1">
            <span className="text-[11px] text-white/45">Icon id</span>
            <Input
              value={selected.icon || selected.actionKind || ""}
              onChange={(e) => onPatch({ icon: e.target.value }, "Changed button icon")}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] text-white/45">Position</span>
            <select
              className="h-10 w-full rounded-md border border-white/15 bg-black/30 px-2 text-sm"
              value={selected.iconPosition || "before"}
              onChange={(e) =>
                onPatch(
                  {
                    iconPosition: e.target.value as NonNullable<
                      TapCardSection["iconPosition"]
                    >,
                  },
                  "Changed button icon"
                )
              }
            >
              {ICON_PLACEMENT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] text-white/45">Size</span>
            <select
              className="h-10 w-full rounded-md border border-white/15 bg-black/30 px-2 text-sm"
              value={selected.iconSize || "md"}
              onChange={(e) =>
                onPatch(
                  { iconSize: e.target.value as "sm" | "md" | "lg" },
                  "Changed button icon"
                )
              }
            >
              {ICON_SIZE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] text-white/45">
              Icon gap {selected.iconGap ?? 8}px
            </span>
            <input
              type="range"
              min={0}
              max={24}
              value={selected.iconGap ?? 8}
              onChange={(e) =>
                onPatch({ iconGap: Number(e.target.value) }, "Changed button icon")
              }
            />
          </label>
        </div>
      ) : null}

      {level === "visibility" ? (
        <div className="space-y-3" data-testid="button-panel-visibility">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.enabled !== false}
              onChange={(e) =>
                onPatch(
                  { enabled: e.target.checked },
                  e.target.checked ? "Showed button" : "Hid button"
                )
              }
            />
            Visible on Card
          </label>
          <p className="text-[11px] text-white/40">
            Per-device show/hide is not independently authored yet. Visibility applies to all
            devices honestly.
          </p>
        </div>
      ) : null}

      {level === "behavior" ? (
        <div className="space-y-3" data-testid="button-panel-behavior">
          <p className="text-sm text-white/80">
            In Edit mode, tapping this button selects it. In Preview as customer, it activates
            safely.
          </p>
          <p className="text-[11px] text-white/45">
            External http(s) destinations open in a new tab with noopener. Phone, email, and maps
            use device handlers. Support and payment paths stay preview-safe.
          </p>
        </div>
      ) : null}

      {level === "test" ? (
        <div className="space-y-3" data-testid="button-panel-test">
          <p className="text-sm text-white/80">
            Test: {selected.label || "Button"}
          </p>
          <p className="break-all text-xs text-white/55">{destination || "No destination"}</p>
          <Button
            type="button"
            className="min-h-11 w-full bg-primary text-primary-foreground"
            data-testid="button-test-action-primary"
            onClick={() => onTestAction?.()}
          >
            Test Action
          </Button>
          <p className="text-[11px] text-white/40">
            Does not publish, send messages, charge, or contact customers.
          </p>
        </div>
      ) : null}

      {level === "advanced" ? (
        <div className="space-y-3" data-testid="button-panel-advanced">
          <label className="block space-y-1">
            <span className="text-[11px] text-white/45">Custom icon URL</span>
            <Input
              value={selected.iconUrl ?? ""}
              onChange={(e) =>
                onPatch({ iconUrl: e.target.value }, "Changed button icon")
              }
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] text-white/45">Icon tint</span>
            <input
              type="color"
              className="h-10 w-full"
              value={selected.iconColor || "#ffffff"}
              onChange={(e) =>
                onPatch({ iconColor: e.target.value }, "Changed button icon")
              }
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] text-white/45">Appearance mode</span>
            <select
              className="h-10 w-full rounded-md border border-white/15 bg-black/30 px-2 text-sm"
              value={selected.appearance || "icon_text"}
              onChange={(e) =>
                onPatch(
                  {
                    appearance: e.target.value as
                      | "icon_text"
                      | "icon_only"
                      | "text",
                  },
                  "Changed button appearance mode"
                )
              }
            >
              <option value="icon_text">Icon + text</option>
              <option value="icon_only">Icon only</option>
              <option value="text">Text only</option>
            </select>
          </label>
        </div>
      ) : null}
    </NestedPanelShell>
  );
}
