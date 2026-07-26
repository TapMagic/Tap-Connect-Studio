"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { Expand, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type ExpandedTextFieldProps = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Recommended soft max; shows guidance, does not hard-block unless maxLength set */
  recommendedMax?: number;
  maxLength?: number;
  preview?: ReactNode;
  /** Preserve selection when opening/closing expand */
  className?: string;
  disabled?: boolean;
  error?: string | null;
  /** Compact single-line appearance for short labels — not used for substantial text */
  compact?: boolean;
  "data-testid"?: string;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "id">;

/**
 * Auto-growing substantial text field with Expand editor.
 * Short labels should keep using Input; descriptions/messages/terms use this.
 */
export function ExpandedTextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  recommendedMax,
  maxLength,
  preview,
  className,
  disabled,
  error,
  compact = false,
  "data-testid": testId,
  ...rest
}: ExpandedTextFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const drawerTitleId = useId();
  const taRef = useRef<HTMLTextAreaElement>(null);
  const expandRef = useRef<HTMLTextAreaElement>(null);
  const [expanded, setExpanded] = useState(false);
  const selectionRef = useRef<{ start: number; end: number } | null>(null);

  const autoGrow = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(480, Math.max(compact ? 40 : 72, el.scrollHeight));
    el.style.height = `${next}px`;
  }, [compact]);

  useEffect(() => {
    autoGrow(taRef.current);
  }, [value, autoGrow]);

  useEffect(() => {
    if (!expanded) return;
    const el = expandRef.current;
    if (!el) return;
    el.focus();
    const sel = selectionRef.current;
    if (sel) {
      el.setSelectionRange(sel.start, sel.end);
    } else {
      el.setSelectionRange(el.value.length, el.value.length);
    }
    autoGrow(el);
  }, [expanded, autoGrow]);

  function rememberSelection(el: HTMLTextAreaElement | null) {
    if (!el) return;
    selectionRef.current = {
      start: el.selectionStart,
      end: el.selectionEnd,
    };
  }

  function openExpand() {
    rememberSelection(taRef.current);
    setExpanded(true);
  }

  function closeExpand() {
    rememberSelection(expandRef.current);
    setExpanded(false);
    requestAnimationFrame(() => {
      const el = taRef.current;
      if (!el) return;
      el.focus();
      const sel = selectionRef.current;
      if (sel) el.setSelectionRange(sel.start, sel.end);
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (expanded) closeExpand();
      else openExpand();
    }
    if (e.key === "Escape" && expanded) {
      e.preventDefault();
      closeExpand();
    }
    rest.onKeyDown?.(e);
  }

  const lengthHint =
    recommendedMax != null
      ? `${value.length}/${recommendedMax} recommended`
      : maxLength != null
        ? `${value.length}/${maxLength}`
        : `${value.length} characters`;

  const overRecommended =
    recommendedMax != null && value.length > recommendedMax;

  return (
    <div className={cn("space-y-1.5", className)} data-testid={testId}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={fieldId} className="text-xs font-medium text-muted-foreground">
          {label}
        </Label>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 gap-1 px-2 text-[11px]"
          onClick={openExpand}
          disabled={disabled}
          aria-haspopup="dialog"
          data-testid={testId ? `${testId}-expand` : "expanded-text-open"}
        >
          <Expand className="h-3 w-3" aria-hidden />
          Expand editor
        </Button>
      </div>
      <textarea
        {...rest}
        ref={taRef}
        id={fieldId}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={compact ? 1 : 3}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={`${fieldId}-hint`}
        className={cn(
          "w-full resize-none overflow-hidden rounded-lg border border-input bg-background/50 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive"
        )}
        onChange={(e) => {
          onChange(e.target.value);
          autoGrow(e.target);
        }}
        onSelect={(e) => rememberSelection(e.currentTarget)}
        onKeyDown={onKeyDown}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          id={`${fieldId}-hint`}
          className={cn(
            "text-[10px] text-muted-foreground",
            overRecommended && "text-amber-300/90"
          )}
        >
          {lengthHint}
          {error ? ` · ${error}` : null}
        </p>
        <span className="text-[10px] text-muted-foreground/70">⌘/Ctrl+Enter expand</span>
      </div>
      {preview ? (
        <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Preview
          </p>
          <div className="text-sm leading-relaxed whitespace-pre-wrap">{preview}</div>
        </div>
      ) : null}

      {expanded ? (
        <div
          className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/60"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeExpand();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={drawerTitleId}
            data-testid={testId ? `${testId}-drawer` : "expanded-text-drawer"}
            className="flex h-full w-full max-w-3xl flex-col border-l border-white/10 bg-[#0a0f1a] shadow-2xl"
          >
            <header className="flex items-start justify-between gap-3 border-b border-white/8 px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Expanded editor
                </p>
                <h2 id={drawerTitleId} className="mt-0.5 text-base font-semibold text-white">
                  {label}
                </h2>
                <p className="mt-1 text-[11px] text-white/45">
                  Full text without clipping. Esc or ⌘/Ctrl+Enter to close. Selection is preserved.
                </p>
              </div>
              <button
                type="button"
                onClick={closeExpand}
                className="rounded-lg border border-white/10 p-2 text-white/55 hover:bg-white/5 hover:text-white"
                aria-label="Close expanded editor"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="grid min-h-0 flex-1 gap-4 overflow-auto p-5 lg:grid-cols-2">
              <div className="flex min-h-0 flex-col gap-2">
                <Label htmlFor={`${fieldId}-expanded`} className="text-xs text-white/50">
                  Edit
                </Label>
                <textarea
                  ref={expandRef}
                  id={`${fieldId}-expanded`}
                  value={value}
                  disabled={disabled}
                  placeholder={placeholder}
                  maxLength={maxLength}
                  className="min-h-[50vh] w-full flex-1 resize-y rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm leading-relaxed text-white outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  onChange={(e) => onChange(e.target.value)}
                  onSelect={(e) => rememberSelection(e.currentTarget)}
                  onKeyDown={onKeyDown}
                />
                <p
                  className={cn(
                    "text-[11px] text-white/40",
                    overRecommended && "text-amber-300/90"
                  )}
                >
                  {lengthHint}
                  {error ? ` · ${error}` : null}
                </p>
              </div>
              <div className="flex min-h-0 flex-col gap-2">
                <p className="text-xs text-white/50">Preview</p>
                <div className="min-h-[50vh] flex-1 overflow-auto rounded-xl border border-white/10 bg-[#111827] p-4 text-sm leading-relaxed whitespace-pre-wrap text-white/90">
                  {preview ?? (value.trim() ? value : (
                    <span className="text-white/35">Nothing to preview yet.</span>
                  ))}
                </div>
              </div>
            </div>
            <footer className="flex justify-end gap-2 border-t border-white/8 px-5 py-3">
              <Button type="button" variant="secondary" onClick={closeExpand}>
                Done
              </Button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
