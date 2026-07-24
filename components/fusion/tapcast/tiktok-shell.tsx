"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { KeywordsSuggestPanel } from "@/components/fusion/keywords/keywords-suggest-panel";

type Cast = {
  id: string;
  title: string;
  status: string;
  mode: string;
  caption: string;
  hashtags: string[];
  composition?: { aspectRatio: string; width: number; height: number };
  externalDraftId?: string;
  externalPostId?: string;
  retryCount: number;
  funnel?: {
    stages: Array<{ id: string; label: string; status: string }>;
  };
  analytics?: {
    views: number;
    likes: number;
    keepsAttributed: number;
    walletAddsAttributed: number;
  };
  campaignId?: string;
  cardId?: string;
  tapPointId?: string;
};

export function TikTokTapCastShell() {
  const [casts, setCasts] = useState<Cast[]>([]);
  const [selected, setSelected] = useState<Cast | null>(null);
  const [title, setTitle] = useState("Weekly Special TikTok");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusLabel, setStatusLabel] = useState("VERIFIED — CREDENTIALS REQUIRED");
  const [note, setNote] = useState("");
  const [missing, setMissing] = useState<string[]>([]);

  const reload = useCallback(async () => {
    const res = await fetch("/api/tapcast/tiktok");
    const json = await res.json();
    if (res.ok) {
      setCasts(json.casts ?? []);
      setStatusLabel(json.statusLabel ?? statusLabel);
      setNote(json.note ?? "");
      setMissing(json.readiness?.missingEnvVars ?? []);
      if (selected) {
        const fresh = (json.casts as Cast[] | undefined)?.find((c) => c.id === selected.id);
        if (fresh) setSelected(fresh);
      }
    }
  }, [selected, statusLabel]);

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/tapcast/tiktok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.ok) {
        setMessage(json.error ?? "Failed");
      } else {
        setMessage(`OK (${json.mode ?? "mock"})`);
        if (json.data?.cast) setSelected(json.data.cast);
        else if (json.data?.id) setSelected(json.data);
        else if (json.data?.adaptations) {
          setMessage(
            `Adaptations: ${json.data.adaptations.map((a: { network: string }) => a.network).join(", ")}`
          );
        }
        await reload();
      }
      return json;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6" data-testid="tiktok-shell">
      <header className="space-y-2 border-b border-white/8 pb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Experiences · TapCast · TikTok
        </p>
        <h1
          data-testid="tiktok-tapcast-heading"
          className="text-2xl font-semibold tracking-tight text-white"
        >
          TikTok
        </h1>
        <p className="max-w-2xl text-sm text-white/55">
          First-class TapCast workflow: connect readiness, 9:16 composition, storyboard, caption,
          draft upload (mock), approval, schedule, Direct Post (gated), retry, Campaign/Card/Tap
          Point association, analytics stubs, Reels/Shorts adaptation.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/experiences/tapcast"
            className="text-xs text-primary underline-offset-4 hover:underline"
            data-testid="tiktok-back-to-hub"
          >
            ← Omnichannel TapCast hub
          </Link>
          <span
            data-testid="tiktok-live-badge"
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
              "border-sky-500/40 text-sky-200"
            )}
          >
            {statusLabel}
          </span>
          <span className="text-xs text-white/45">{note}</span>
        </div>
        {missing.length > 0 ? (
          <p className="text-xs text-amber-200/80">
            Missing for live: {missing.join(", ")} — mock posting works without them.
          </p>
        ) : (
          <p className="text-xs text-emerald-300/80">
            OAuth env present — Direct Post still gated without access token + proof.
          </p>
        )}
      </header>

      <KeywordsSuggestPanel
        surface="tiktok"
        defaultChannel="tiktok"
        campaignTitle={selected?.title ?? title}
        existingContentSnippets={
          selected ? [selected.caption, ...(selected.hashtags ?? [])] : undefined
        }
        onApply={(terms) => {
          if (!selected) return;
          const tags = terms
            .filter((t) => t.kind === "hashtag" || t.value.startsWith("#"))
            .map((t) => (t.value.startsWith("#") ? t.value : `#${t.value}`));
          if (!tags.length) return;
          void post({
            action: "caption",
            castId: selected.id,
            caption: selected.caption,
            hashtags: [...new Set([...(selected.hashtags ?? []), ...tags])],
          });
        }}
      />

      {message ? (
        <p
          data-testid="tiktok-message"
          className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/70"
        >
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={busy}
          data-testid="tiktok-connect"
          onClick={() => post({ action: "connect" })}
        >
          Connect (mock)
        </Button>
        <Button
          disabled={busy}
          data-testid="tiktok-create"
          onClick={() => post({ action: "create", title })}
        >
          Create cast
        </Button>
        <div className="flex items-center gap-2">
          <Input
            data-testid="tiktok-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-9 w-56 bg-black/40"
          />
          <Button
            disabled={busy}
            data-testid="tiktok-create-funnel"
            onClick={() => post({ action: "funnel_workflow", title })}
          >
            Run funnel workflow
          </Button>
        </div>
        <Link
          href="/dashboard/experiences/canvas"
          data-testid="tiktok-open-canvas"
          className="inline-flex h-9 items-center text-xs text-primary underline-offset-4 hover:underline"
        >
          Open in TapCanvas →
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-2" data-testid="tiktok-cast-list">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/35">Casts</p>
          <ul className="space-y-1">
            {casts.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  data-testid={`tiktok-cast-${c.id}`}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-left text-sm",
                    selected?.id === c.id
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-white/10 text-white/70"
                  )}
                  onClick={() => setSelected(c)}
                >
                  <span className="block truncate font-medium">{c.title}</span>
                  <span className="text-[10px] uppercase text-white/40">
                    {c.status} · {c.mode}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="space-y-4">
          {!selected ? (
            <p className="text-sm text-white/45" data-testid="tiktok-empty">
              Run the funnel workflow or create a cast to continue.
            </p>
          ) : (
            <>
              <div
                data-testid="tiktok-cast-detail"
                className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
              >
                <div className="mb-3 flex aspect-[9/16] max-h-64 w-36 items-center justify-center rounded-lg border border-primary/30 bg-gradient-to-b from-primary/20 to-black text-center text-xs text-primary">
                  9:16
                  <br />
                  {selected.composition?.width ?? 1080}×
                  {selected.composition?.height ?? 1920}
                </div>
                <h2
                  data-testid="tiktok-cast-title"
                  className="text-lg font-medium text-white"
                >
                  {selected.title}
                </h2>
                <p className="mt-1 text-sm text-white/55">{selected.caption}</p>
                <p className="mt-1 text-xs text-primary/80">
                  {selected.hashtags?.join(" ")}
                </p>
                <p
                  data-testid="tiktok-cast-status"
                  className="mt-2 text-xs text-white/40"
                >
                  Status: {selected.status} · retries: {selected.retryCount}
                  {selected.externalDraftId
                    ? ` · draft ${selected.externalDraftId}`
                    : ""}
                  {selected.externalPostId
                    ? ` · post ${selected.externalPostId}`
                    : ""}
                </p>
                <p className="mt-1 text-xs text-white/35">
                  Links: campaign {selected.campaignId ?? "—"} · card{" "}
                  {selected.cardId ?? "—"} · tap point {selected.tapPointId ?? "—"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={busy}
                  data-testid="tiktok-compose"
                  onClick={() =>
                    post({
                      action: "compose",
                      castId: selected.id,
                      coverNote: "Offer frame",
                    })
                  }
                >
                  Compose 9:16
                </Button>
                <Button
                  size="sm"
                  disabled={busy}
                  data-testid="tiktok-upload-draft"
                  onClick={() => post({ action: "upload_draft", castId: selected.id })}
                >
                  Upload draft (mock)
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  data-testid="tiktok-request-approval"
                  onClick={() =>
                    post({ action: "request_approval", castId: selected.id })
                  }
                >
                  Request approval
                </Button>
                <Button
                  size="sm"
                  disabled={busy}
                  data-testid="tiktok-approve"
                  onClick={() =>
                    post({
                      action: "resolve_approval",
                      castId: selected.id,
                      decision: "approve",
                    })
                  }
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  disabled={busy}
                  data-testid="tiktok-schedule"
                  onClick={() =>
                    post({
                      action: "schedule",
                      castId: selected.id,
                      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
                    })
                  }
                >
                  Schedule
                </Button>
                <Button
                  size="sm"
                  disabled={busy}
                  data-testid="tiktok-direct-post"
                  onClick={() => post({ action: "direct_post", castId: selected.id })}
                >
                  Direct Post
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/15"
                  disabled={busy}
                  data-testid="tiktok-retry"
                  onClick={() => post({ action: "retry", castId: selected.id })}
                >
                  Fail + retry
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/15"
                  disabled={busy}
                  data-testid="tiktok-analytics"
                  onClick={() => post({ action: "analytics", castId: selected.id })}
                >
                  Analytics stub
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/15"
                  disabled={busy}
                  data-testid="tiktok-adapt"
                  onClick={() => post({ action: "adapt", castId: selected.id })}
                >
                  Adapt Reels/Shorts
                </Button>
              </div>

              {selected.funnel ? (
                <div data-testid="tiktok-funnel">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/35">
                    Relationship funnel
                  </p>
                  <ol className="flex flex-wrap gap-2">
                    {selected.funnel.stages.map((s) => (
                      <li
                        key={s.id}
                        data-testid={`tiktok-funnel-stage-${s.id}`}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px]",
                          s.status === "measured" || s.status === "active"
                            ? "border-primary/40 text-primary"
                            : "border-white/15 text-white/50"
                        )}
                      >
                        {s.label}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              {selected.analytics ? (
                <p data-testid="tiktok-analytics-summary" className="text-xs text-white/45">
                  Views {selected.analytics.views} · Likes {selected.analytics.likes} · Keeps{" "}
                  {selected.analytics.keepsAttributed} · Wallet adds{" "}
                  {selected.analytics.walletAddsAttributed}
                </p>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
