"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Lock,
  LockOpen,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CHANNEL_LABEL,
  KEYWORD_CHANNELS,
  type ConflictWarning,
  type KeywordBrandPack,
  type KeywordChannel,
  type KeywordSuggestion,
  type RegenerateMode,
} from "@/lib/fusion/keywords/client";

export type KeywordsPanelSurface =
  | "brand_kit"
  | "campaign"
  | "card"
  | "tapcast"
  | "tiktok"
  | "email"
  | "tapcanvas"
  | "tapflow"
  | "inbox"
  | "assets"
  | "templates"
  | "autopilot";

type KeywordsPanelProps = {
  surface: KeywordsPanelSurface;
  defaultChannel?: KeywordChannel;
  defaultOpen?: boolean;
  compact?: boolean;
  campaignTitle?: string;
  campaignId?: string;
  existingContentSnippets?: string[];
  locationLabels?: string[];
  knownProducts?: string[];
  knownOffers?: string[];
  audienceHints?: string[];
  seasonHint?: string;
  /** Called when user applies selected terms to the host surface */
  onApply?: (terms: KeywordSuggestion[], meta: { channel: KeywordChannel }) => void;
  className?: string;
};

const REGEN_MODES: { id: RegenerateMode; label: string }[] = [
  { id: "more_local", label: "More local" },
  { id: "more_niche", label: "More niche" },
  { id: "broader", label: "Broader" },
  { id: "shorter", label: "Shorter" },
  { id: "channel_specific", label: "Channel-specific" },
  { id: "more_professional", label: "More professional" },
  { id: "more_playful", label: "More playful" },
  { id: "language_specific", label: "Language-specific" },
];

const API = "/api/ai/keywords";

export function KeywordsSuggestPanel({
  surface,
  defaultChannel = "instagram",
  defaultOpen = false,
  compact = true,
  campaignTitle,
  campaignId,
  existingContentSnippets,
  locationLabels,
  knownProducts,
  knownOffers,
  audienceHints,
  seasonHint,
  onApply,
  className,
}: KeywordsPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [channel, setChannel] = useState<KeywordChannel>(defaultChannel);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<KeywordSuggestion[]>([]);
  const [warnings, setWarnings] = useState<ConflictWarning[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pack, setPack] = useState<KeywordBrandPack | null>(null);
  const [runId, setRunId] = useState<string | undefined>();
  const [trendLabel, setTrendLabel] = useState("VERIFIED — CREDENTIALS REQUIRED");
  const [featureOff, setFeatureOff] = useState(false);

  const groundPayload = useMemo(
    () => ({
      campaignTitle,
      campaignId,
      existingContentSnippets,
      locationLabels,
      knownProducts,
      knownOffers,
      audienceHints,
      seasonHint,
    }),
    [
      campaignTitle,
      campaignId,
      existingContentSnippets,
      locationLabels,
      knownProducts,
      knownOffers,
      audienceHints,
      seasonHint,
    ]
  );

  const loadPack = useCallback(async () => {
    const res = await fetch(API);
    const json = await res.json();
    if (res.status === 503 || json.code === "feature_off") {
      setFeatureOff(true);
      setMessage(json.error ?? "Keywords feature is off");
      return;
    }
    setFeatureOff(false);
    if (res.ok && json.pack) {
      setPack(json.pack);
      if (json.trendEnrichment?.label) setTrendLabel(json.trendEnrichment.label);
    }
  }, []);

  useEffect(() => {
    if (open) void loadPack();
  }, [open, loadPack]);

  async function runSuggest(mode?: RegenerateMode) {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode ? "regenerate" : "suggest",
          channel,
          mode,
          surface,
          campaignId,
          ground: groundPayload,
        }),
      });
      const json = await res.json();
      if (json.placeholder || json.code === "feature_off" || res.status === 503) {
        setFeatureOff(true);
        setMessage(json.error ?? "Keywords feature is off");
        return;
      }
      if (!res.ok) {
        setMessage(typeof json.error === "string" ? json.error : "Suggest failed");
        return;
      }
      setSuggestions(json.suggestions ?? []);
      setWarnings(json.warnings ?? []);
      if (json.runId) setRunId(json.runId);
      if (json.trendEnrichment?.label) setTrendLabel(json.trendEnrichment.label);
      setSelected(new Set());
      setMessage(
        `${json.suggestions?.length ?? 0} grounded suggestions · trends: ${trendLabel}`
      );
    } finally {
      setLoading(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedTerms = useMemo(
    () => suggestions.filter((s) => selected.has(s.id) && s.family !== "avoid_exclusion"),
    [suggestions, selected]
  );

  async function acceptSelected(persist = true) {
    if (!selectedTerms.length) return;
    setLoading(true);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "accept",
          terms: selectedTerms.map((s) => ({
            id: s.id,
            value: s.value,
            kind: s.kind,
            family: s.family,
            channels: s.channels,
          })),
          target:
            selectedTerms[0]?.kind === "hashtag" ? "brandedHashtags" : "approvedTerms",
          persist,
          runId,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setPack(json.pack);
        setMessage(`Accepted ${selectedTerms.length} term(s) into Brand Pack`);
      } else {
        setMessage(json.error ?? "Accept failed");
      }
    } finally {
      setLoading(false);
    }
  }

  async function rejectSelected() {
    if (!selectedTerms.length) return;
    setLoading(true);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          suggestions: selectedTerms.map((s) => ({
            id: s.id,
            value: s.value,
            kind: s.kind,
            family: s.family,
          })),
          runId,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        const rejectedIds = new Set(selectedTerms.map((s) => s.id));
        setSuggestions((prev) => prev.filter((s) => !rejectedIds.has(s.id)));
        setSelected(new Set());
        setMessage(`Rejected ${json.rejected ?? selectedTerms.length} suggestion(s)`);
      } else {
        setMessage(json.error ?? "Reject failed");
      }
    } finally {
      setLoading(false);
    }
  }

  async function saveBrandPack() {
    if (!pack) return;
    setLoading(true);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_brand_pack", pack }),
      });
      const json = await res.json();
      if (res.ok) {
        setPack(json.pack);
        setMessage("Brand Pack saved");
      } else {
        setMessage(json.error ?? "Save failed");
      }
    } finally {
      setLoading(false);
    }
  }

  async function lockTerm(termId: string, locked: boolean) {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "lock", termId, locked }),
    });
    const json = await res.json();
    if (res.ok) setPack(json.pack);
  }

  async function copySelected() {
    if (!selectedTerms.length) return;
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "copy_metadata",
        terms: selectedTerms.map((s) => ({
          id: s.id,
          value: s.value,
          kind: s.kind,
        })),
      }),
    });
    const json = await res.json();
    if (res.ok && json.text) {
      await navigator.clipboard.writeText(json.text);
      setMessage("Copied to clipboard");
    }
  }

  function applySelected() {
    if (!selectedTerms.length) return;
    onApply?.(selectedTerms, { channel });
    void fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "apply",
        channel,
        terms: selectedTerms.map((s) => ({
          id: s.id,
          value: s.value,
          kind: s.kind,
          family: s.family,
        })),
      }),
    });
    setMessage(`Applied ${selectedTerms.length} term(s) to ${surface}`);
  }

  return (
    <div className={cn("space-y-2", className)} data-testid="keywords-panel-root">
      <Button
        type="button"
        size="sm"
        variant="outline"
        data-testid="keywords-suggest-button"
        onClick={() => setOpen((v) => !v)}
        className={cn(compact && "h-8 text-xs")}
      >
        <Sparkles className="mr-1.5 size-3.5" />
        Suggest keywords &amp; hashtags
      </Button>

      {open ? (
        <div
          className="rounded-lg border border-border/70 bg-card/40 p-3 space-y-3"
          data-testid="keywords-panel"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Keywords &amp; Hashtags</p>
              <p className="text-[11px] text-muted-foreground">
                Grounded from Brand Kit / campaign facts · not a generic prompt box
              </p>
              <p className="text-[10px] text-amber-500/90 mt-0.5" data-testid="keywords-trend-status">
                Trends: {trendLabel}
              </p>
              <p
                className="text-[10px] text-muted-foreground mt-0.5"
                data-testid="keywords-panel-readiness"
              >
                {featureOff
                  ? "DISABLED — ai.keywords kill switch"
                  : "FUNCTIONAL — FINAL VERIFICATION REQUIRED"}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X className="size-3.5" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[11px] text-muted-foreground">Channel</label>
            <select
              className="h-8 rounded-md border border-border bg-background px-2 text-xs"
              value={channel}
              data-testid="keywords-channel"
              onChange={(e) => setChannel(e.target.value as KeywordChannel)}
            >
              {KEYWORD_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABEL[c]}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              data-testid="keywords-run-suggest"
              data-ready={featureOff ? "0" : "1"}
              disabled={loading || featureOff}
              onClick={() => void runSuggest()}
            >
              {loading ? "Working…" : "Suggest"}
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {REGEN_MODES.map((m) => (
              <Button
                key={m.id}
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-[11px]"
                data-testid={`keywords-regen-${m.id}`}
                disabled={loading}
                onClick={() => void runSuggest(m.id)}
              >
                <RefreshCw className="mr-1 size-3" />
                {m.label}
              </Button>
            ))}
          </div>

          {warnings.length > 0 ? (
            <ul className="space-y-1 rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-[11px]">
              {warnings.slice(0, 6).map((w, i) => (
                <li key={`${w.code}-${i}`}>
                  <span className="font-medium uppercase">{w.code}</span>: {w.message}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="max-h-56 space-y-1.5 overflow-y-auto" data-testid="keywords-suggestions">
            {suggestions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Run Suggest to generate grounded keywords from known Brand Kit / campaign facts.
              </p>
            ) : (
              suggestions.map((s) => (
                <label
                  key={s.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-md border border-transparent px-2 py-1.5 text-xs hover:bg-muted/40",
                    selected.has(s.id) && "border-primary/40 bg-primary/5",
                    s.family === "avoid_exclusion" && "opacity-60"
                  )}
                  data-testid={`keywords-suggestion-${s.id}`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={selected.has(s.id)}
                    disabled={s.family === "avoid_exclusion"}
                    onChange={() => toggle(s.id)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{s.value}</span>
                    <span className="ml-1.5 text-[10px] uppercase text-muted-foreground">
                      {s.family} · {s.confidence}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      {s.rationale}
                    </span>
                    {s.sourceFacts[0] ? (
                      <span className="block text-[10px] text-muted-foreground/80">
                        Source: {s.sourceFacts[0].field}={s.sourceFacts[0].value} (
                        {s.sourceFacts[0].evidence})
                      </span>
                    ) : null}
                  </span>
                </label>
              ))
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              data-testid="keywords-accept"
              disabled={!selectedTerms.length || loading}
              onClick={() => void acceptSelected(true)}
            >
              <Check className="mr-1 size-3.5" />
              Accept
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid="keywords-reject"
              disabled={!selectedTerms.length || loading}
              onClick={() => void rejectSelected()}
            >
              Reject
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid="keywords-add-set"
              disabled={!selectedTerms.length || loading}
              onClick={() => void acceptSelected(true)}
            >
              Add set
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid="keywords-apply"
              disabled={!selectedTerms.length}
              onClick={applySelected}
            >
              Apply
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid="keywords-copy"
              disabled={!selectedTerms.length}
              onClick={() => void copySelected()}
            >
              <Copy className="mr-1 size-3.5" />
              Copy
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid="keywords-save-brand-pack"
              disabled={!pack || loading}
              onClick={() => void saveBrandPack()}
            >
              Save Brand Pack
            </Button>
          </div>

          {pack ? (
            <div className="space-y-1 border-t border-border/50 pt-2" data-testid="keywords-brand-pack">
              <p className="text-[11px] font-medium">Brand Pack (persisted)</p>
              <p className="text-[10px] text-muted-foreground">
                Locale {pack.locale} · {pack.approvedTerms.length} approved ·{" "}
                {pack.brandedHashtags.length} branded hashtags · {pack.bannedTerms.length} banned
              </p>
              <ul className="flex flex-wrap gap-1">
                {[...pack.approvedTerms, ...pack.brandedHashtags].slice(0, 12).map((t) => (
                  <li
                    key={t.id}
                    className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[10px]"
                  >
                    {t.value}
                    <button
                      type="button"
                      className="opacity-70 hover:opacity-100"
                      aria-label={t.locked ? "Unlock" : "Lock"}
                      data-testid={`keywords-lock-${t.id}`}
                      onClick={() => void lockTerm(t.id, !t.locked)}
                    >
                      {t.locked ? <Lock className="size-2.5" /> : <LockOpen className="size-2.5" />}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {message ? (
            <p className="text-[11px] text-primary" data-testid="keywords-message">
              {message}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
