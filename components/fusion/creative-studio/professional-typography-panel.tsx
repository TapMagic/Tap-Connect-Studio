"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FONT_CATALOG,
  FONT_CATEGORY_LABELS,
  fontCssStack,
  getFontById,
  searchFonts,
  type FontCategory,
  type FontFamilyDefinition,
} from "@/lib/fusion/creative-studio/fonts/catalog";
import {
  ensureFontLoaded,
  isFontLoaded,
  pushRecentFont,
  readFavoriteFonts,
  readRecentFonts,
  toggleFavoriteFont,
} from "@/lib/fusion/creative-studio/fonts/load";
import {
  POINT_SIZE_PRESETS,
  clampPointSize,
  formatPointSize,
  ptToPx,
  resolvePointSize,
} from "@/lib/fusion/creative-studio/fonts/points";
import type { TextFormat } from "@/lib/design/premium-finish";

type PanelLevel = "root" | "typography" | "font" | "sample";

export type ProfessionalTypographyPanelProps = {
  value?: TextFormat;
  onChange: (next: TextFormat) => void;
  sampleText?: string;
  brandFontIds?: string[];
  onClose?: () => void;
  className?: string;
};

export function ProfessionalTypographyPanel({
  value = {},
  onChange,
  sampleText = "The quick brown fox",
  brandFontIds = ["inter"],
  onClose,
  className,
}: ProfessionalTypographyPanelProps) {
  const [level, setLevel] = useState<PanelLevel>("root");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FontCategory | "all">("all");
  const [recent, setRecent] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [sampleMode, setSampleMode] = useState<
    "card" | "custom" | "alphabet" | "numbers" | "headline" | "paragraph"
  >("card");
  const [customSample, setCustomSample] = useState("");
  const [candidateId, setCandidateId] = useState<string | null>(null);

  useEffect(() => {
    setRecent(readRecentFonts());
    setFavorites(readFavoriteFonts());
  }, []);

  const currentFont = useMemo(() => {
    if (value.customFontFamily) {
      const byFamily = FONT_CATALOG.find(
        (f) => value.customFontFamily?.includes(f.family)
      );
      if (byFamily) return byFamily;
    }
    return getFontById("inter")!;
  }, [value.customFontFamily]);

  const pointSize = resolvePointSize({
    fontSizePx: value.fontSizePx,
    fontSize: value.fontSize,
  });

  const results = useMemo(
    () => searchFonts(query, { category }),
    [query, category]
  );

  async function pickFont(font: FontFamilyDefinition) {
    setLoadingId(font.id);
    try {
      await ensureFontLoaded(font.id);
      onChange({
        ...value,
        customFontFamily: fontCssStack(font),
        fontFamily: undefined,
      });
      setRecent(pushRecentFont(font.id));
      setCandidateId(font.id);
      setLevel("typography");
    } finally {
      setLoadingId(null);
    }
  }

  function setPointSize(pt: number) {
    const next = clampPointSize(pt);
    onChange({
      ...value,
      fontSizePx: Math.round(ptToPx(next)),
      fontSize: undefined,
    });
  }

  const previewText =
    sampleMode === "alphabet"
      ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz"
      : sampleMode === "numbers"
        ? "0123456789 !?@#$%"
        : sampleMode === "headline"
          ? sampleText.slice(0, 48) || "Headline Sample"
          : sampleMode === "paragraph"
            ? `${sampleText}. Premium authoring uses clear hierarchy, calm spacing, and honest controls.`
            : sampleMode === "custom"
              ? customSample || sampleText
              : sampleText;

  const weightOptions = currentFont.weights;

  return (
    <div
      className={cn("flex h-full min-h-0 flex-col", className)}
      data-testid="professional-typography-panel"
      data-panel-level={level}
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        {level !== "root" ? (
          <button
            type="button"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-white/15 text-white/80"
            data-testid="panel-stack-back"
            aria-label="Back one panel level"
            onClick={() =>
              setLevel(
                level === "sample"
                  ? "font"
                  : level === "font"
                    ? "typography"
                    : "root"
              )
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white" data-testid="panel-stack-title">
            {level === "root"
              ? "Text"
              : level === "typography"
                ? "Typography"
                : level === "font"
                  ? "Font"
                  : "Font sample"}
          </p>
          <p className="truncate text-[11px] text-white/45" data-testid="panel-stack-breadcrumb">
            {["Text", level !== "root" ? "Typography" : null, level === "font" || level === "sample" ? "Font" : null, level === "sample" ? "Sample" : null]
              .filter(Boolean)
              .join(" → ")}
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-white/15 text-white/70"
            data-testid="panel-stack-close"
            aria-label="Close panel"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {level === "root" ? (
          <div className="space-y-2" data-testid="text-panel-root">
            {(
              [
                ["typography", "Typography"],
                ["font", "Font"],
                ["sample", "Font sample window"],
              ] as const
            ).map(([next, label]) => (
              <button
                key={next}
                type="button"
                className="flex min-h-11 w-full items-center justify-between rounded-md border border-white/10 px-3 text-left text-sm text-white/85 hover:bg-white/5"
                data-testid={`text-panel-open-${next}`}
                onClick={() =>
                  setLevel(next === "font" || next === "sample" ? next : "typography")
                }
              >
                {label}
                <span className="text-white/35">›</span>
              </button>
            ))}
            <label className="block space-y-1 pt-2">
              <span className="text-[11px] uppercase tracking-wide text-white/45">
                Size
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="min-h-10 min-w-10 rounded-md border border-white/15"
                  aria-label="Decrease point size"
                  data-testid="point-size-decrement"
                  onClick={() => setPointSize(pointSize - 1)}
                >
                  −
                </button>
                <input
                  type="number"
                  className="h-10 w-full rounded-md border border-white/15 bg-black/30 px-2 text-sm text-white"
                  value={pointSize}
                  min={6}
                  max={120}
                  data-testid="point-size-input"
                  aria-label="Font size in points"
                  onChange={(e) => setPointSize(Number(e.target.value))}
                />
                <button
                  type="button"
                  className="min-h-10 min-w-10 rounded-md border border-white/15"
                  aria-label="Increase point size"
                  data-testid="point-size-increment"
                  onClick={() => setPointSize(pointSize + 1)}
                >
                  +
                </button>
              </div>
              <p className="text-xs text-white/50" data-testid="point-size-label">
                {formatPointSize(pointSize)}
              </p>
            </label>
          </div>
        ) : null}

        {level === "typography" ? (
          <div className="space-y-3" data-testid="typography-controls">
            <button
              type="button"
              className="flex min-h-11 w-full items-center justify-between rounded-md border border-white/10 px-3 text-left text-sm"
              data-testid="open-font-picker"
              onClick={() => setLevel("font")}
            >
              <span>
                Font · <span style={{ fontFamily: fontCssStack(currentFont) }}>{currentFont.family}</span>
              </span>
              <span className="text-white/35">›</span>
            </button>

            <label className="block space-y-1">
              <span className="text-[11px] text-white/45">Size (pt)</span>
              <input
                type="range"
                min={6}
                max={72}
                value={pointSize}
                data-testid="point-size-slider"
                onChange={(e) => setPointSize(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex flex-wrap gap-1">
                {POINT_SIZE_PRESETS.map((pt) => (
                  <button
                    key={pt}
                    type="button"
                    className={cn(
                      "rounded border px-2 py-1 text-[11px]",
                      pointSize === pt
                        ? "border-white/40 bg-white/10 text-white"
                        : "border-white/10 text-white/60"
                    )}
                    onClick={() => setPointSize(pt)}
                  >
                    {pt}
                  </button>
                ))}
              </div>
            </label>

            <label className="block space-y-1">
              <span className="text-[11px] text-white/45">Weight</span>
              <select
                className="h-10 w-full rounded-md border border-white/15 bg-black/30 px-2 text-sm"
                data-testid="font-weight-select"
                value={
                  value.fontWeight === "black"
                    ? 900
                    : value.fontWeight === "bold"
                      ? 700
                      : value.fontWeight === "semibold"
                        ? 600
                        : value.fontWeight === "medium"
                          ? 500
                          : 400
                }
                onChange={(e) => {
                  const w = Number(e.target.value);
                  const map: Record<number, TextFormat["fontWeight"]> = {
                    400: "normal",
                    500: "medium",
                    600: "semibold",
                    700: "bold",
                    800: "bold",
                    900: "black",
                  };
                  onChange({ ...value, fontWeight: map[w] || "normal" });
                }}
              >
                {weightOptions.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!currentFont.italics}
                aria-pressed={Boolean(value.italic)}
                data-testid="toggle-italic"
                className={cn(
                  "min-h-10 rounded-md border px-3 text-sm italic",
                  value.italic ? "border-white/40 bg-white/10" : "border-white/15",
                  !currentFont.italics && "opacity-40"
                )}
                onClick={() =>
                  currentFont.italics && onChange({ ...value, italic: !value.italic })
                }
              >
                Italic
              </button>
              <button
                type="button"
                aria-pressed={Boolean(value.underline)}
                data-testid="toggle-underline"
                className={cn(
                  "min-h-10 rounded-md border px-3 text-sm underline",
                  value.underline ? "border-white/40 bg-white/10" : "border-white/15"
                )}
                onClick={() => onChange({ ...value, underline: !value.underline })}
              >
                Underline
              </button>
            </div>

            <div className="flex gap-1" role="group" aria-label="Alignment">
              {(["left", "center", "right", "justify"] as const).map((align) => (
                <button
                  key={align}
                  type="button"
                  aria-pressed={value.align === align}
                  data-testid={`align-${align}`}
                  className={cn(
                    "min-h-10 flex-1 rounded-md border text-xs capitalize",
                    value.align === align
                      ? "border-white/40 bg-white/10"
                      : "border-white/15 text-white/70"
                  )}
                  onClick={() => onChange({ ...value, align })}
                >
                  {align}
                </button>
              ))}
            </div>

            <label className="block space-y-1">
              <span className="text-[11px] text-white/45">Letter spacing (em)</span>
              <input
                type="number"
                step="0.01"
                className="h-10 w-full rounded-md border border-white/15 bg-black/30 px-2 text-sm"
                data-testid="letter-spacing-input"
                value={value.letterSpacingEm ?? 0}
                onChange={(e) =>
                  onChange({
                    ...value,
                    letterSpacingEm: Number(e.target.value),
                  })
                }
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[11px] text-white/45">Line height</span>
              <input
                type="number"
                step="0.05"
                min={0.8}
                max={3}
                className="h-10 w-full rounded-md border border-white/15 bg-black/30 px-2 text-sm"
                data-testid="line-height-input"
                value={typeof value.lineHeight === "number" ? value.lineHeight : 1.35}
                onChange={(e) =>
                  onChange({ ...value, lineHeight: Number(e.target.value) })
                }
              />
            </label>
          </div>
        ) : null}

        {level === "font" ? (
          <div className="space-y-3" data-testid="font-picker-panel">
            <input
              type="search"
              placeholder="Search fonts"
              className="h-11 w-full rounded-md border border-white/15 bg-black/30 px-3 text-sm"
              data-testid="font-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="flex flex-wrap gap-1" data-testid="font-category-filters">
              <button
                type="button"
                className={cn(
                  "rounded-full border px-2 py-1 text-[11px]",
                  category === "all" ? "border-white/40 bg-white/10" : "border-white/10"
                )}
                onClick={() => setCategory("all")}
              >
                All
              </button>
              {(Object.keys(FONT_CATEGORY_LABELS) as FontCategory[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cn(
                    "rounded-full border px-2 py-1 text-[11px]",
                    category === c ? "border-white/40 bg-white/10" : "border-white/10"
                  )}
                  data-testid={`font-category-${c}`}
                  onClick={() => setCategory(c)}
                >
                  {FONT_CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>

            {brandFontIds.length ? (
              <section data-testid="brand-fonts">
                <p className="mb-1 text-[11px] uppercase tracking-wide text-white/45">
                  Brand fonts
                </p>
                <FontRows
                  ids={brandFontIds}
                  currentId={currentFont.id}
                  favorites={favorites}
                  loadingId={loadingId}
                  onPick={pickFont}
                  onToggleFavorite={(id) => setFavorites(toggleFavoriteFont(id))}
                  onPreview={(id) => {
                    setCandidateId(id);
                    setLevel("sample");
                  }}
                />
              </section>
            ) : null}

            {recent.length ? (
              <section data-testid="recent-fonts">
                <p className="mb-1 text-[11px] uppercase tracking-wide text-white/45">
                  Recently used
                </p>
                <FontRows
                  ids={recent}
                  currentId={currentFont.id}
                  favorites={favorites}
                  loadingId={loadingId}
                  onPick={pickFont}
                  onToggleFavorite={(id) => setFavorites(toggleFavoriteFont(id))}
                  onPreview={(id) => {
                    setCandidateId(id);
                    setLevel("sample");
                  }}
                />
              </section>
            ) : null}

            {favorites.length ? (
              <section data-testid="favorite-fonts">
                <p className="mb-1 text-[11px] uppercase tracking-wide text-white/45">
                  Favorites
                </p>
                <FontRows
                  ids={favorites}
                  currentId={currentFont.id}
                  favorites={favorites}
                  loadingId={loadingId}
                  onPick={pickFont}
                  onToggleFavorite={(id) => setFavorites(toggleFavoriteFont(id))}
                  onPreview={(id) => {
                    setCandidateId(id);
                    setLevel("sample");
                  }}
                />
              </section>
            ) : null}

            <section data-testid="font-library">
              <p className="mb-1 text-[11px] uppercase tracking-wide text-white/45">
                Library ({results.length})
              </p>
              <ul className="space-y-1">
                {results.map((font) => (
                  <FontRow
                    key={font.id}
                    font={font}
                    current={font.id === currentFont.id}
                    favorite={favorites.includes(font.id)}
                    loading={loadingId === font.id}
                    onPick={() => void pickFont(font)}
                    onToggleFavorite={() => setFavorites(toggleFavoriteFont(font.id))}
                    onPreview={() => {
                      setCandidateId(font.id);
                      setLevel("sample");
                    }}
                  />
                ))}
              </ul>
            </section>
          </div>
        ) : null}

        {level === "sample" ? (
          <div className="space-y-3" data-testid="font-sample-window">
            <div className="flex flex-wrap gap-1">
              {(
                [
                  ["card", "Card text"],
                  ["custom", "Custom"],
                  ["alphabet", "Alphabet"],
                  ["numbers", "Numbers"],
                  ["headline", "Headline"],
                  ["paragraph", "Paragraph"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={cn(
                    "rounded-full border px-2 py-1 text-[11px]",
                    sampleMode === id ? "border-white/40 bg-white/10" : "border-white/10"
                  )}
                  data-testid={`font-sample-mode-${id}`}
                  onClick={() => setSampleMode(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            {sampleMode === "custom" ? (
              <input
                className="h-10 w-full rounded-md border border-white/15 bg-black/30 px-2 text-sm"
                value={customSample}
                placeholder="Type sample text"
                data-testid="font-sample-custom"
                onChange={(e) => setCustomSample(e.target.value)}
              />
            ) : null}
            <div
              className="min-h-[140px] rounded-lg border border-white/10 bg-[#f5f1ea] p-4 text-[#1a1a1a]"
              style={{
                fontFamily: fontCssStack(
                  getFontById(candidateId || currentFont.id) || currentFont
                ),
                fontSize: `${ptToPx(pointSize)}px`,
                fontWeight:
                  value.fontWeight === "bold"
                    ? 700
                    : value.fontWeight === "semibold"
                      ? 600
                      : value.fontWeight === "medium"
                        ? 500
                        : 400,
                fontStyle: value.italic ? "italic" : "normal",
                textDecoration: value.underline ? "underline" : undefined,
                lineHeight:
                  typeof value.lineHeight === "number" ? value.lineHeight : 1.35,
                letterSpacing:
                  typeof value.letterSpacingEm === "number"
                    ? `${value.letterSpacingEm}em`
                    : undefined,
              }}
              data-testid="font-sample-preview"
            >
              {previewText}
            </div>
            <button
              type="button"
              className="min-h-11 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground"
              data-testid="font-sample-apply"
              onClick={() => {
                const font = getFontById(candidateId || currentFont.id);
                if (font) void pickFont(font);
              }}
            >
              Apply font
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FontRows(props: {
  ids: string[];
  currentId: string;
  favorites: string[];
  loadingId: string | null;
  onPick: (font: FontFamilyDefinition) => void;
  onToggleFavorite: (id: string) => void;
  onPreview: (id: string) => void;
}) {
  return (
    <ul className="space-y-1">
      {props.ids.map((id) => {
        const font = getFontById(id);
        if (!font) return null;
        return (
          <FontRow
            key={id}
            font={font}
            current={id === props.currentId}
            favorite={props.favorites.includes(id)}
            loading={props.loadingId === id}
            onPick={() => props.onPick(font)}
            onToggleFavorite={() => props.onToggleFavorite(id)}
            onPreview={() => props.onPreview(id)}
          />
        );
      })}
    </ul>
  );
}

function FontRow({
  font,
  current,
  favorite,
  loading,
  onPick,
  onToggleFavorite,
  onPreview,
}: {
  font: FontFamilyDefinition;
  current: boolean;
  favorite: boolean;
  loading: boolean;
  onPick: () => void;
  onToggleFavorite: () => void;
  onPreview: () => void;
}) {
  const [ready, setReady] = useState(isFontLoaded(font.id));
  useEffect(() => {
    let cancelled = false;
    void ensureFontLoaded(font.id, [400])
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [font.id]);

  return (
    <li>
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border px-2 py-2",
          current ? "border-white/35 bg-white/8" : "border-white/10"
        )}
        data-testid={`font-row-${font.id}`}
        data-font-loaded={ready ? "true" : "false"}
      >
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={onPick}
        >
          <span className="block truncate text-[11px] text-white/50">
            {font.family}
            {loading ? " · loading…" : !ready ? " · …" : ""}
          </span>
          <span
            className="block truncate text-base text-white"
            style={{ fontFamily: ready ? fontCssStack(font) : undefined }}
          >
            {font.family}
          </span>
          <span className="block text-[10px] text-white/35">
            {font.weights.join(" · ")}
            {font.italics ? " · italic" : ""}
          </span>
        </button>
        <button
          type="button"
          className="min-h-9 min-w-9 rounded border border-white/10 text-xs text-white/60"
          data-testid={`font-preview-${font.id}`}
          aria-label={`Preview ${font.family}`}
          onClick={onPreview}
        >
          Aa
        </button>
        <button
          type="button"
          className="min-h-9 min-w-9 rounded border border-white/10"
          aria-label={favorite ? "Remove favorite" : "Favorite"}
          data-testid={`font-favorite-${font.id}`}
          onClick={onToggleFavorite}
        >
          <Star
            className={cn("mx-auto h-3.5 w-3.5", favorite && "fill-amber-300 text-amber-300")}
          />
        </button>
      </div>
    </li>
  );
}
