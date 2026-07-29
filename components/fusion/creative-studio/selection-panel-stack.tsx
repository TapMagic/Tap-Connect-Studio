"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  NestedPanelShell,
  PanelNavRow,
} from "@/components/fusion/creative-studio/nested-panel-shell";
import type { TapCardSection } from "@/lib/brand/tap-card";

type Level = "root" | "fields" | "hint";

export type SelectionPanelStackProps = {
  selected: TapCardSection | null;
  patchSection: (
    id: string,
    patch: Partial<TapCardSection>,
    label?: string
  ) => void;
  onOpenTool: (toolId: string) => void;
  onClose?: () => void;
};

/**
 * Level-0 Selection Hub for the Content / Inspector tool.
 * Object-specific deep editors slide in via onOpenTool (typography, buttons, …).
 */
export function SelectionPanelStack({
  selected,
  patchSection,
  onOpenTool,
  onClose,
}: SelectionPanelStackProps) {
  const [level, setLevel] = useState<Level>("root");

  const crumbs = useMemo(() => {
    const name = selected ? selected.label || selected.type : "Inspector";
    if (level === "root") return [name];
    if (level === "fields") return [name, "Fields"];
    return [name, "How editing works"];
  }, [level, selected]);

  const depth = level === "root" ? 0 : 1;

  const typeTool =
    selected?.type === "action"
      ? "buttons"
      : selected?.type === "text" || selected?.type === "identity"
        ? "typography"
        : selected?.type === "hero" ||
            selected?.type === "logo_block" ||
            selected?.type === "image"
          ? "media"
          : selected?.type === "special_offer"
            ? "offer"
            : selected?.type === "creative_composition"
              ? "composition"
              : null;

  return (
    <NestedPanelShell
      title={
        level === "root"
          ? selected
            ? selected.label || selected.type
            : "Inspector"
          : crumbs[crumbs.length - 1]
      }
      breadcrumbs={crumbs}
      depth={depth}
      onBack={level === "root" ? undefined : () => setLevel("root")}
      onClose={onClose}
      testId="selection-panel-stack"
    >
      {level === "root" ? (
        <div className="space-y-2" data-testid="selection-panel-hub">
          <p className="text-[10px] uppercase tracking-wide text-white/40">
            Selection Hub
          </p>
          {!selected ? (
            <p
              className="rounded-md border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] text-white/55"
              data-testid="selection-hub-empty"
            >
              Select a segment on the Card or Outline. Design tools open from this
              hub — Colors, Typography, Buttons, and Media stay one decision away.
            </p>
          ) : (
            <>
              <p className="text-sm text-white/90" data-testid="selection-hub-label">
                {selected.label || selected.type}
              </p>
              <p className="text-[11px] text-white/45">{selected.type}</p>
              <PanelNavRow
                label="Fields"
                hint="Label, enable, destinations"
                testId="selection-open-fields"
                onClick={() => setLevel("fields")}
              />
              {typeTool ? (
                <PanelNavRow
                  label={
                    typeTool === "buttons"
                      ? "Button editor"
                      : typeTool === "typography"
                        ? "Typography"
                        : typeTool === "media"
                          ? "Image & media"
                          : typeTool === "offer"
                            ? "Offer Spotlight"
                            : "Composition"
                  }
                  hint="Opens the specialized sliding editor"
                  testId={`selection-open-${typeTool}`}
                  onClick={() => onOpenTool(typeTool)}
                />
              ) : null}
              <PanelNavRow
                label="Appearance"
                hint="Colors, Brand, Layout"
                testId="selection-open-appearance"
                onClick={() => onOpenTool("appearance")}
              />
            </>
          )}
          <PanelNavRow
            label="How editing works"
            testId="selection-open-hint"
            onClick={() => setLevel("hint")}
          />
        </div>
      ) : null}

      {level === "fields" && selected ? (
        <div className="space-y-3" data-testid="selection-panel-fields">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.enabled}
              onChange={(e) =>
                patchSection(selected.id, { enabled: e.target.checked })
              }
            />
            Enabled
          </label>
          <Input
            value={selected.label ?? ""}
            onChange={(e) =>
              patchSection(selected.id, { label: e.target.value })
            }
            placeholder="Label"
            aria-label="Segment label"
            data-testid="card-content-label"
          />
          {selected.type === "action" ? (
            <Input
              value={selected.href ?? ""}
              onChange={(e) =>
                patchSection(selected.id, { href: e.target.value })
              }
              placeholder="https://…"
              data-testid="card-content-href"
            />
          ) : null}
          {selected.type === "text" ? (
            <Input
              value={selected.text ?? ""}
              onChange={(e) =>
                patchSection(selected.id, { text: e.target.value })
              }
              placeholder="Text"
              data-testid="card-content-text"
            />
          ) : null}
        </div>
      ) : null}

      {level === "hint" ? (
        <p
          className="rounded-md border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] text-white/55"
          data-testid="selection-panel-hint"
        >
          Level 0 is this Selection Hub. Level 1 slides in for fields and specialized
          editors. Back reverses the motion; Close returns space to the canvas.
        </p>
      ) : null}
    </NestedPanelShell>
  );
}
