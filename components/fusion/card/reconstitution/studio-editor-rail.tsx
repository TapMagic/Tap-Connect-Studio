"use client";

import {
  Badge,
  ImageIcon,
  Layers3,
  LayoutTemplate,
  Palette,
  Plus,
  Type,
} from "lucide-react";
import type { StudioRailId } from "@/lib/fusion/creative-studio/reconstitution/studio-rail-registry";
import { cn } from "@/lib/utils";

const ICONS = {
  "layout-template": LayoutTemplate,
  plus: Plus,
  type: Type,
  palette: Palette,
  badge: Badge,
  image: ImageIcon,
  layers: Layers3,
} as const;

export function StudioEditorRail({
  destinations,
  activeId,
  onActivate,
}: {
  destinations: Array<{
    id: StudioRailId;
    label: string;
    description: string;
    icon: keyof typeof ICONS;
    readiness: "ready" | "preview" | "disabled" | "hidden";
    interactive: boolean;
  }>;
  activeId: StudioRailId | null;
  onActivate: (id: StudioRailId) => void;
}) {
  return (
    <nav
      aria-label="Editor tools"
      className="hidden w-[76px] shrink-0 bg-[#080d15] px-2 py-3 md:flex md:flex-col md:gap-1"
      data-testid="studio-editor-rail"
    >
      {destinations.map((destination) => {
        const Icon = ICONS[destination.icon];
        return (
          <button
            key={destination.id}
            type="button"
            disabled={!destination.interactive}
            aria-pressed={activeId === destination.id}
            aria-label={destination.label}
            title={destination.interactive ? destination.description : `${destination.label} — Coming soon`}
            onClick={() => onActivate(destination.id)}
            className={cn(
              "relative flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-medium text-white/56 transition",
              destination.interactive && "hover:bg-white/[.055] hover:text-white",
              activeId === destination.id && "bg-white/[.07] text-[#d8ff82] after:absolute after:left-0 after:h-7 after:w-0.5 after:rounded-full after:bg-[#b8ff2c]",
              !destination.interactive && "cursor-not-allowed text-white/24"
            )}
            data-testid={`studio-rail-${destination.id}`}
            data-readiness={destination.readiness}
          >
            <Icon className="h-5 w-5" aria-hidden />
            <span>{destination.label}</span>
            {destination.readiness === "preview" ? (
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-cyan-300" aria-label="Internal preview" />
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
