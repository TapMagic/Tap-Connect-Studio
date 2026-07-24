"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Eraser, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  clearBgRemoveProvenance,
  findBgRemoveWhereUsed,
  getBgRemoveAdapter,
  getBgRemoveProvenance,
  rememberBgRemoveProvenance,
  removeBackground,
  type BgRemovePreviewMode,
  type BgRemoveProvenance,
} from "@/lib/media/bg-remove";

type PanelProps = {
  imageUrl: string;
  onApply: (derivedUrl: string, provenance: BgRemoveProvenance) => void;
  onRestore: (originalUrl: string) => void;
  onClose: () => void;
  whereUsedBlobs?: unknown[];
};

/**
 * Non-destructive Remove Background workflow — preview, apply derived asset,
 * restore original, refine, light/dark preview, crop/focal, padding, optional shadow.
 * Remounts when opened so preview state resets without effect setState.
 */
export function BgRemovePanel({
  open,
  ...props
}: PanelProps & { open: boolean }) {
  if (!open) return null;
  return <BgRemovePanelInner key={props.imageUrl} {...props} />;
}

function BgRemovePanelInner({
  imageUrl,
  onApply,
  onRestore,
  onClose,
  whereUsedBlobs = [],
}: PanelProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<Element | null>(null);
  const [previewMode, setPreviewMode] = useState<BgRemovePreviewMode>("checker");
  const [paddingPx, setPaddingPx] = useState(8);
  const [shadow, setShadow] = useState(false);
  const [refine, setRefine] = useState(false);
  const [threshold, setThreshold] = useState(42);
  const [cropLoose, setCropLoose] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [provenance, setProvenance] = useState<BgRemoveProvenance | null>(null);
  const adapter = getBgRemoveAdapter();

  useEffect(() => {
    openerRef.current = document.activeElement;
    const t = window.setTimeout(() => closeRef.current?.focus(), 0);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus();
    };
  }, [onClose]);

  const runPreview = useCallback(async () => {
    setBusy(true);
    setError(null);
    const result = await removeBackground({
      imageUrl,
      threshold,
      paddingPx,
      shadow,
      refine,
      crop: cropLoose ? { x: 0.05, y: 0.05, w: 0.9, h: 0.9 } : undefined,
      focal: { x: 0.5, y: 0.45 },
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      setPreviewUrl(null);
      return;
    }
    setPreviewUrl(result.derivedUrl);
    setProvenance(result.provenance);
  }, [imageUrl, threshold, paddingPx, shadow, refine, cropLoose]);

  const existing = getBgRemoveProvenance(imageUrl);
  const bgClass =
    previewMode === "light"
      ? "bg-white"
      : previewMode === "dark"
        ? "bg-zinc-900"
        : "bg-[length:16px_16px] bg-[linear-gradient(45deg,#333_25%,transparent_25%),linear-gradient(-45deg,#333_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#333_75%),linear-gradient(-45deg,transparent_75%,#333_75%)] bg-[position:0_0,0_8px,8px_-8px,-8px_0]";

  const whereUsed = (() => {
    const p = provenance || existing;
    if (!p || whereUsedBlobs.length === 0) return null;
    const hits = findBgRemoveWhereUsed(p, whereUsedBlobs);
    const total = hits.reduce((s, h) => s + h.count, 0);
    return { total, hits };
  })();

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
      data-testid="bg-remove-overlay"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        data-testid="bg-remove-panel"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div>
            <p id={titleId} className="font-semibold">
              Remove background
            </p>
            <p className="text-xs text-muted-foreground">
              {adapter.label}
              {adapter.unavailableReason ? ` — ${adapter.unavailableReason}` : " · non-destructive"}
            </p>
          </div>
          <Button
            ref={closeRef}
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            data-testid="bg-remove-cancel"
          >
            <X className="mr-1 h-4 w-4" />
            Close
          </Button>
        </div>

        <div className="space-y-3 overflow-y-auto p-4">
          <div
            className={`flex min-h-[180px] items-center justify-center rounded-xl border border-border/40 p-4 ${bgClass}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl || imageUrl}
              alt="Background removal preview"
              className="max-h-48 max-w-full object-contain"
              data-testid="bg-remove-preview"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(["checker", "light", "dark"] as const).map((mode) => (
              <Button
                key={mode}
                type="button"
                size="sm"
                variant={previewMode === mode ? "default" : "outline"}
                onClick={() => setPreviewMode(mode)}
                data-testid={`bg-preview-${mode}`}
              >
                {mode}
              </Button>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-[10px]">Sensitivity {threshold}</Label>
              <input
                type="range"
                min={12}
                max={90}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full"
                aria-label="Removal sensitivity"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-[10px]">Subject padding {paddingPx}px</Label>
              <input
                type="range"
                min={0}
                max={32}
                value={paddingPx}
                onChange={(e) => setPaddingPx(Number(e.target.value))}
                className="w-full"
                aria-label="Subject padding"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-xs">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={refine}
                onChange={(e) => setRefine(e.target.checked)}
                aria-label="Edge refinement"
              />
              Edge refinement
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={shadow}
                onChange={(e) => setShadow(e.target.checked)}
                aria-label="Soft shadow"
              />
              Soft shadow
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={cropLoose}
                onChange={(e) => setCropLoose(e.target.checked)}
                aria-label="Crop margins (focal center)"
              />
              Crop margins (focal center)
            </label>
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          {provenance ? (
            <p className="text-[10px] text-muted-foreground" data-testid="bg-remove-provenance">
              Provider {provenance.provider} · {new Date(provenance.createdAt).toLocaleString()} ·
              original preserved for restore
            </p>
          ) : null}
          {existing ? (
            <p className="text-[10px] text-muted-foreground">
              Prior cutout on file — restore returns the original URL.
            </p>
          ) : null}
          {whereUsed ? (
            <p className="text-[10px] text-muted-foreground" data-testid="bg-remove-where-used">
              Where used: {whereUsed.total} reference{whereUsed.total === 1 ? "" : "s"} across
              scanned surfaces
              {whereUsed.hits.map((h) => (h.count ? ` · ${h.count}` : "")).join("")}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground" data-testid="bg-remove-where-used">
              Where used: run preview to attach provenance, then scan library references.
            </p>
          )}
          <p className="text-[10px] text-muted-foreground" data-testid="bg-remove-undo-hint">
            Apply is non-destructive. Restore original anytime; campaign Undo also reverts the URL.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border/60 px-4 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void runPreview()}
            data-testid="bg-remove-preview-btn"
          >
            <Eraser className="mr-1 h-3.5 w-3.5" />
            {busy ? "Working…" : "Preview cutout"}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={busy || !previewUrl || !provenance}
            onClick={() => {
              if (!previewUrl || !provenance) return;
              rememberBgRemoveProvenance(provenance);
              onApply(previewUrl, provenance);
              onClose();
            }}
            data-testid="bg-remove-apply"
          >
            Apply derived asset
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              const orig = provenance?.originalUrl || existing?.originalUrl || imageUrl;
              if (existing) clearBgRemoveProvenance(existing.derivedUrl);
              if (provenance) clearBgRemoveProvenance(provenance.derivedUrl);
              onRestore(orig);
              onClose();
            }}
            data-testid="bg-remove-restore"
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Restore original
          </Button>
        </div>
      </div>
    </div>
  );
}
