"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { KeywordsSuggestPanel } from "@/components/fusion/keywords/keywords-suggest-panel";

type ChannelRow = {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  firstClass: boolean;
  href: string;
  supportsMock: boolean;
  liveConfigured: boolean;
  missingEnvVars: string[];
  capabilities: {
    mockPublishPath: string;
    livePublishPath: string | null;
    media: string[];
    scheduling: boolean;
    analytics: boolean;
    messaging: boolean;
    communityOps: boolean;
  };
  notes: string;
};

type Variant = {
  id: string;
  campaignId: string;
  channelId: string;
  title: string;
  status: string;
  copy: string;
  hashtags: string[];
  readiness: { ready: boolean; publishPath: string; blockers: string[] };
  externalPostId?: string;
  lastError?: string;
  tikTokCastId?: string;
  preview?: { warnings: string[]; dimensionNote: string };
};

type Readiness = {
  channelId: string;
  connected: boolean;
  connectionMode?: string;
  missingEnvVars: string[];
  liveConfigured: boolean;
  note: string;
};

type HubInitial = {
  channels: ChannelRow[];
  readiness: Readiness[];
  variants: Variant[];
  statusLabel: string;
  persistence: string;
};

export function TapCastHubShell({ initial }: { initial?: HubInitial }) {
  const [channels, setChannels] = useState<ChannelRow[]>(initial?.channels ?? []);
  const [readiness, setReadiness] = useState<Readiness[]>(initial?.readiness ?? []);
  const [variants, setVariants] = useState<Variant[]>(initial?.variants ?? []);
  const [statusLabel, setStatusLabel] = useState(
    initial?.statusLabel ?? "VERIFIED — CREDENTIALS REQUIRED"
  );
  const [persistence, setPersistence] = useState(initial?.persistence ?? "memory");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [campaignTitle, setCampaignTitle] = useState("Weekend Special");
  const [lastCampaignId, setLastCampaignId] = useState<string | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([
    "tiktok",
    "instagram",
    "youtube",
    "x",
  ]);

  const readinessById = useMemo(() => {
    const m = new Map<string, Readiness>();
    for (const r of readiness) m.set(r.channelId, r);
    return m;
  }, [readiness]);

  const reload = useCallback(async () => {
    const res = await fetch("/api/tapcast");
    const json = await res.json();
    if (res.ok) {
      setChannels(json.registry?.channels ?? json.channels ?? []);
      setReadiness(json.readiness ?? []);
      setVariants(json.variants ?? []);
      setStatusLabel(json.statusLabel ?? statusLabel);
      setPersistence(json.persistence ?? "memory");
    }
  }, [statusLabel]);

  useEffect(() => {
    if (initial?.channels?.length) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/tapcast");
      const json = await res.json();
      if (cancelled || !res.ok) return;
      setChannels(json.registry?.channels ?? json.channels ?? []);
      setReadiness(json.readiness ?? []);
      setVariants(json.variants ?? []);
      setStatusLabel(json.statusLabel ?? "VERIFIED — CREDENTIALS REQUIRED");
      setPersistence(json.persistence ?? "memory");
    })();
    return () => {
      cancelled = true;
    };
  }, [initial?.channels?.length]);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/tapcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.ok) {
        setMessage(json.error ?? "Failed");
      } else {
        setMessage(`OK (${json.mode ?? "mock"})`);
      }
      await reload();
      return json;
    } finally {
      setBusy(false);
    }
  }

  function toggleChannel(id: string) {
    setSelectedChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  const byCategory = useMemo(() => {
    const groups: Record<string, ChannelRow[]> = {};
    for (const c of channels) {
      (groups[c.categoryLabel] ??= []).push(c);
    }
    return groups;
  }, [channels]);

  return (
    <div className="space-y-8 p-5 lg:p-8" data-testid="tapcast-hub">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Experiences · TapCast
        </p>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="tapcast-hub-heading">
          Omnichannel TapCast
        </h1>
        <p className="max-w-3xl text-sm text-white/60">
          Channel capability registry with mock adapters, campaign-native variants, failure
          isolation, and TapCanvas distribution hooks. TikTok stays first-class.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span
            className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-amber-200"
            data-testid="tapcast-live-badge"
          >
            {statusLabel}
          </span>
          <span className="text-white/45">Persistence: {persistence}</span>
          <span className="text-white/45">{channels.length} channels</span>
          <Link
            href="/dashboard/experiences/tapcast/tiktok"
            className="text-primary underline-offset-4 hover:underline"
            data-testid="tapcast-tiktok-link"
          >
            Open TikTok workspace →
          </Link>
        </div>
      </header>

      <div data-testid="tapcast-keywords-mount" className="max-w-xl">
        <KeywordsSuggestPanel
          surface="tapcast"
          defaultChannel="instagram"
          campaignTitle={campaignTitle}
          compact
        />
      </div>

      {message && (
        <p className="text-sm text-primary" data-testid="tapcast-message">
          {message}
        </p>
      )}

      <section className="space-y-4" data-testid="tapcast-channel-registry">
        <h2 className="text-lg font-medium">Channel capability registry</h2>
        {Object.entries(byCategory).map(([label, rows]) => (
          <div key={label} className="space-y-2">
            <h3 className="text-sm font-semibold text-white/70">{label}</h3>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((c) => {
                const ready = readinessById.get(c.id);
                return (
                  <div
                    key={c.id}
                    id={c.id}
                    data-testid={`tapcast-channel-${c.id}`}
                    className={cn(
                      "rounded-lg border border-white/10 bg-black/40 p-4 space-y-2",
                      c.firstClass && "border-primary/40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">
                          {c.name}
                          {c.firstClass ? " · first-class" : ""}
                        </p>
                        <p className="text-xs text-white/45">
                          Mock path: {c.capabilities.mockPublishPath}
                          {c.capabilities.livePublishPath
                            ? ` · Live: ${c.capabilities.livePublishPath}`
                            : " · Live: not claimed"}
                        </p>
                      </div>
                      <span className="text-[10px] uppercase tracking-wide text-amber-200/80">
                        VERIFIED
                      </span>
                    </div>
                    <p className="text-xs text-white/50 line-clamp-2">{c.notes}</p>
                    <p className="text-xs text-white/40">
                      Media: {c.capabilities.media.join(", ")}
                    </p>
                    {c.missingEnvVars.length > 0 ? (
                      <p
                        className="text-xs text-amber-200/70"
                        data-testid={`tapcast-missing-${c.id}`}
                      >
                        Missing env: {c.missingEnvVars.join(", ")}
                      </p>
                    ) : (
                      <p className="text-xs text-emerald-300/70">Live env present (uncertified)</p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        data-testid={`tapcast-connect-${c.id}`}
                        onClick={() =>
                          void post({ action: "connect", channelId: c.id })
                        }
                      >
                        {ready?.connected ? `Connected (${ready.connectionMode})` : "Mock connect"}
                      </Button>
                      <Link href={c.href}>
                        <Button size="sm" variant="outline">
                          {c.firstClass ? "Open workspace" : "Open"}
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3" data-testid="tapcast-variant-lab">
        <h2 className="text-lg font-medium">Campaign channel variants</h2>
        <p className="text-sm text-white/50">
          Create channel-native copy/media/dimensions from one campaign — no blind cross-post.
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-white/50">Campaign title</label>
            <Input
              value={campaignTitle}
              onChange={(e) => setCampaignTitle(e.target.value)}
              className="w-64"
              data-testid="tapcast-campaign-title"
            />
          </div>
          <Button
            disabled={busy || selectedChannels.length === 0}
            data-testid="tapcast-create-variants"
            onClick={() => {
              const campaignId = `camp_demo_${Date.now()}`;
              setLastCampaignId(campaignId);
              void (async () => {
                // Prefer Brand Kit vocabulary — never invent hard-coded tags.
                let hashtags: string[] = [];
                try {
                  const kw = await fetch("/api/ai/keywords", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "suggest",
                      channel: "tiktok",
                      ground: { campaignTitle },
                      limit: 5,
                    }),
                  });
                  const json = await kw.json();
                  if (kw.ok && Array.isArray(json.suggestions)) {
                    hashtags = json.suggestions
                      .filter(
                        (s: { kind?: string; family?: string; value?: string }) =>
                          s.kind === "hashtag" && s.family !== "avoid_exclusion" && s.value
                      )
                      .map((s: { value: string }) => s.value)
                      .slice(0, 5);
                  }
                } catch {
                  /* grounded empty is fine */
                }
                await post({
                  action: "create_variants",
                  campaignId,
                  channelIds: selectedChannels,
                  source: {
                    title: campaignTitle,
                    offerText: "Buy one get one · Keep this Card",
                    body: "Weekend only at participating Tap Points.",
                    cta: "Keep Card",
                    hashtags,
                  },
                });
              })();
            }}
          >
            Create variants
          </Button>
          <Button
            variant="secondary"
            disabled={busy || !lastCampaignId}
            data-testid="tapcast-publish-campaign"
            onClick={() => {
              if (!lastCampaignId) return;
              void post({
                action: "publish_campaign",
                campaignId: lastCampaignId,
                forceFailChannels: ["x"],
              });
            }}
          >
            Publish mock (isolate X fail)
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {channels
            .filter((c) => c.category === "publishing_social")
            .map((c) => (
              <button
                key={c.id}
                type="button"
                data-testid={`tapcast-select-${c.id}`}
                onClick={() => toggleChannel(c.id)}
                className={cn(
                  "rounded border px-2 py-1 text-xs",
                  selectedChannels.includes(c.id)
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-white/15 text-white/50"
                )}
              >
                {c.name}
              </button>
            ))}
        </div>
      </section>

      <section className="space-y-2" data-testid="tapcast-variants-list">
        <h2 className="text-lg font-medium">Variants ({variants.length})</h2>
        {variants.length === 0 && (
          <p className="text-sm text-white/45">No variants yet — create from a campaign above.</p>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {variants.map((v) => (
            <div
              key={v.id}
              data-testid={`tapcast-variant-${v.channelId}`}
              data-campaign-id={v.campaignId}
              className="rounded-lg border border-white/10 bg-black/30 p-3 space-y-2"
            >
              <div className="flex justify-between gap-2">
                <p className="font-medium text-sm">{v.title}</p>
                <span className="text-xs text-white/50">{v.status}</span>
              </div>
              <p className="text-xs text-white/55 line-clamp-3">{v.copy}</p>
              <p className="text-[11px] text-white/40">
                Path: {v.readiness.publishPath}
                {v.preview?.dimensionNote ? ` · ${v.preview.dimensionNote}` : ""}
                {v.tikTokCastId ? ` · TikTok cast ${v.tikTokCastId}` : ""}
              </p>
              {v.lastError && (
                <p className="text-xs text-red-300/80">Error: {v.lastError}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    void post({
                      action: "approve",
                      variantId: v.id,
                      decision: "approve",
                    })
                  }
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => void post({ action: "publish_mock", variantId: v.id })}
                >
                  Publish mock
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void post({ action: "retry", variantId: v.id })}
                >
                  Retry
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void post({ action: "analytics", variantId: v.id })}
                >
                  Analytics
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
