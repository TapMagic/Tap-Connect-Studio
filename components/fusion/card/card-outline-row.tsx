"use client";

/**
 * Shared Card Outline row contract:
 * drag handle · block icon · readable name · visibility · lock · overflow
 */

import { useId, useState } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Lock,
  MoreHorizontal,
  Trash2,
  Unlock,
  Image as ImageIcon,
  Type,
  Square,
  MousePointerClick,
  Sparkles,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TapCardSection } from "@/lib/brand/tap-card";
import { sectionDisplayName } from "@/lib/fusion/creative-studio/history-labels";
import { cardBlockSourceLabel } from "@/lib/fusion/card/block-model";

function BlockIcon({ section }: { section: TapCardSection }) {
  switch (section.type) {
    case "action":
      return <MousePointerClick className="h-3.5 w-3.5 shrink-0 text-white/50" aria-hidden />;
    case "image":
    case "logo_block":
      return <ImageIcon className="h-3.5 w-3.5 shrink-0 text-white/50" aria-hidden />;
    case "text":
    case "promo_header":
      return <Type className="h-3.5 w-3.5 shrink-0 text-white/50" aria-hidden />;
    case "special_offer":
      return <Sparkles className="h-3.5 w-3.5 shrink-0 text-white/50" aria-hidden />;
    case "spacer":
      return <Square className="h-3.5 w-3.5 shrink-0 text-white/50" aria-hidden />;
    case "creative_composition":
      return <Layers className="h-3.5 w-3.5 shrink-0 text-white/50" aria-hidden />;
    default:
      return <Square className="h-3.5 w-3.5 shrink-0 text-white/50" aria-hidden />;
  }
}

export type CardOutlineRowProps = {
  section: TapCardSection;
  index: number;
  total: number;
  selected: boolean;
  dragging: boolean;
  dropTarget?: boolean;
  onSelect: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  onToggleVisible: () => void;
  onToggleLock: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveTop: () => void;
  onMoveBottom: () => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onDelete: () => void;
};

export function CardOutlineRow({
  section,
  index,
  total,
  selected,
  dragging,
  dropTarget = false,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onToggleVisible,
  onToggleLock,
  onMoveUp,
  onMoveDown,
  onMoveTop,
  onMoveBottom,
  onDuplicate,
  onCopy,
  onDelete,
}: CardOutlineRowProps) {
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const name = sectionDisplayName(section);
  const locked = Boolean(section.locked);
  const visible = section.enabled !== false;

  return (
    <li
      data-testid={`card-outline-row-${section.id}`}
      data-outline-type={section.type}
      data-outline-locked={locked ? "1" : "0"}
      data-outline-visible={visible ? "1" : "0"}
      className={cn(
        "relative rounded-lg border",
        selected
          ? "border-white/30 bg-white/10"
          : "border-white/10 bg-white/[0.02] hover:border-white/20",
        !visible && "opacity-55",
        dragging && "opacity-50",
        dropTarget &&
          "border-primary/80 bg-primary/10 before:absolute before:-top-1 before:left-2 before:right-2 before:h-0.5 before:rounded-full before:bg-primary before:shadow-[0_0_12px_var(--primary)]"
      )}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex items-center gap-1 px-1.5 py-1.5">
        <button
          type="button"
          draggable
          aria-label={`Drag to reorder ${name}`}
          data-testid={`card-outline-drag-${section.id}`}
          className="inline-flex h-9 w-8 shrink-0 cursor-grab items-center justify-center rounded border border-white/10 bg-white/[0.04] text-white/75 hover:border-primary/45 hover:bg-primary/10 hover:text-white active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", section.id);
            onDragStart();
          }}
          onDragEnd={onDragEnd}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" && (e.altKey || e.metaKey)) {
              e.preventDefault();
              onMoveUp();
            } else if (e.key === "ArrowDown" && (e.altKey || e.metaKey)) {
              e.preventDefault();
              onMoveDown();
            }
          }}
        >
          <GripVertical className="h-5 w-5" aria-hidden />
        </button>

        <BlockIcon section={section} />

        <div className="min-w-0 flex-1">
          <button
            type="button"
            className="block w-full truncate rounded px-1 pt-1 text-left text-[13px] font-medium text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-pressed={selected}
            aria-label={`Select ${name}`}
            data-testid={`card-outline-select-${section.id}`}
            onClick={onSelect}
          >
            {name}
          </button>
          <p className="truncate px-1 pb-1 text-[9px] text-white/40" data-testid={`card-outline-source-${section.id}`}>
            {cardBlockSourceLabel(section)}
          </p>
        </div>

        <button
          type="button"
          className="inline-flex h-9 w-8 shrink-0 items-center justify-center rounded text-white/55 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label={visible ? `Hide ${name}` : `Show ${name}`}
          aria-pressed={!visible}
          data-testid={`card-outline-visibility-${section.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisible();
          }}
        >
          {visible ? (
            <Eye className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <EyeOff className="h-3.5 w-3.5" aria-hidden />
          )}
        </button>

        <button
          type="button"
          className="inline-flex h-9 w-8 shrink-0 items-center justify-center rounded text-white/55 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label={locked ? `Unlock ${name}` : `Lock ${name}`}
          aria-pressed={locked}
          data-testid={`card-outline-lock-${section.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock();
          }}
        >
          {locked ? (
            <Lock className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Unlock className="h-3.5 w-3.5" aria-hidden />
          )}
        </button>

        <div className="relative">
          <button
            type="button"
            className="inline-flex h-9 w-8 shrink-0 items-center justify-center rounded text-white/55 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label={`More actions for ${name}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            data-testid={`card-outline-menu-${section.id}`}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
          >
            <MoreHorizontal className="h-3.5 w-3.5" aria-hidden />
          </button>
          {menuOpen ? (
            <div
              id={menuId}
              role="menu"
              className="absolute right-0 top-full z-20 mt-1 min-w-[11rem] rounded-lg border border-white/15 bg-[#0c1220] py-1 shadow-xl"
              data-testid={`card-outline-menu-panel-${section.id}`}
            >
              {(
                [
                  ["Move up", onMoveUp, index === 0],
                  ["Move down", onMoveDown, index >= total - 1],
                  ["Move to top", onMoveTop, index === 0],
                  ["Move to bottom", onMoveBottom, index >= total - 1],
                ] as const
              ).map(([label, action, disabled]) => (
                <button
                  key={label}
                  type="button"
                  role="menuitem"
                  disabled={disabled}
                  className="flex w-full px-3 py-2 text-left text-xs text-white/85 hover:bg-white/5 disabled:opacity-35"
                  onClick={() => {
                    setMenuOpen(false);
                    action();
                  }}
                >
                  {label}
                </button>
              ))}
              <div className="my-1 border-t border-white/10" />
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white/85 hover:bg-white/5"
                onClick={() => {
                  setMenuOpen(false);
                  onDuplicate();
                }}
              >
                <Copy className="h-3 w-3" aria-hidden /> Duplicate
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full px-3 py-2 text-left text-xs text-white/85 hover:bg-white/5"
                onClick={() => {
                  setMenuOpen(false);
                  onCopy();
                }}
              >
                Copy
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-300 hover:bg-white/5"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
              >
                <Trash2 className="h-3 w-3" aria-hidden /> Delete
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}
