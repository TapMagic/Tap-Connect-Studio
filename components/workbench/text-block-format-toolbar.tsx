"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Underline,
} from "lucide-react";
import type { BlockStyle } from "@/lib/types/campaign";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const SIZE_OPTIONS: { id: NonNullable<BlockStyle["fontSize"]>; label: string }[] = [
  { id: "sm", label: "S" },
  { id: "base", label: "M" },
  { id: "lg", label: "L" },
  { id: "xl", label: "XL" },
  { id: "2xl", label: "2XL" },
  { id: "3xl", label: "Hero" },
];

type Props = {
  style?: BlockStyle;
  onChange: (next: BlockStyle) => void;
  /** Headline blocks also store alignment in block data */
  dataAlignment?: string;
  onDataAlignmentChange?: (align: "left" | "center" | "right") => void;
  className?: string;
};

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm transition",
        active
          ? "border-primary/60 bg-primary/15 text-primary"
          : "border-border/50 bg-background/80 text-muted-foreground hover:border-primary/40 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export function TextBlockFormatToolbar({
  style = {},
  onChange,
  dataAlignment,
  onDataAlignmentChange,
  className,
}: Props) {
  function patch(patch: BlockStyle) {
    onChange({ ...style, ...patch });
  }

  const align = (style.align ?? dataAlignment ?? "left") as "left" | "center" | "right";
  const isBold = style.fontWeight === "bold" || style.fontWeight === "semibold";

  function setAlign(next: "left" | "center" | "right") {
    patch({ align: next });
    onDataAlignmentChange?.(next);
  }

  return (
    <div
      className={cn(
        "space-y-2 rounded-lg border border-primary/25 bg-primary/5 p-2.5",
        className
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
        Text formatting
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <ToolbarButton
          title="Bold"
          active={isBold}
          onClick={() =>
            patch({ fontWeight: isBold ? "normal" : "bold" })
          }
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={style.italic === true}
          onClick={() => patch({ italic: !style.italic })}
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          active={style.underline === true}
          onClick={() => patch({ underline: !style.underline })}
        >
          <Underline className="h-3.5 w-3.5" />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-border/60" aria-hidden />

        <ToolbarButton
          title="Align left"
          active={align === "left"}
          onClick={() => setAlign("left")}
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Align center"
          active={align === "center"}
          onClick={() => setAlign("center")}
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Align right"
          active={align === "right"}
          onClick={() => setAlign("right")}
        >
          <AlignRight className="h-3.5 w-3.5" />
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-border/60" aria-hidden />

        <select
          aria-label="Text size"
          className="h-8 min-w-[4.5rem] rounded-md border border-border/50 bg-background px-2 text-xs"
          value={style.fontSize ?? "base"}
          onChange={(e) =>
            patch({ fontSize: e.target.value as BlockStyle["fontSize"] })
          }
        >
          {SIZE_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>

        <label className="inline-flex h-8 items-center gap-1 rounded-md border border-border/50 bg-background px-1.5">
          <span className="sr-only">Text color</span>
          <input
            type="color"
            aria-label="Text color"
            value={style.textColor ?? "#f8fafc"}
            onChange={(e) => patch({ textColor: e.target.value })}
            className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="space-y-0.5">
          <Label className="text-[10px] text-muted-foreground">Font</Label>
          <select
            className="flex h-8 min-w-[7rem] rounded-md border border-border/50 bg-background px-2 text-xs"
            value={style.fontFamily ?? "sans"}
            onChange={(e) =>
              patch({ fontFamily: e.target.value as BlockStyle["fontFamily"] })
            }
          >
            <option value="sans">Modern sans</option>
            <option value="serif">Serif</option>
            <option value="display">Display</option>
            <option value="rounded">Rounded</option>
            <option value="mono">Mono</option>
            <option value="script">Script</option>
          </select>
        </div>
        <div className="space-y-0.5">
          <Label className="text-[10px] text-muted-foreground">Highlight</Label>
          <input
            type="color"
            aria-label="Highlight background"
            value={style.backgroundColor ?? "#0b0f19"}
            onChange={(e) => patch({ backgroundColor: e.target.value })}
            className="h-8 w-10 cursor-pointer rounded border border-border/50"
          />
        </div>
      </div>
    </div>
  );
}
