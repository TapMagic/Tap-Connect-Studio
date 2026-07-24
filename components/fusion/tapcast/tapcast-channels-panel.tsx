"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type ChannelSnap = {
  id: string;
  name: string;
  categoryLabel: string;
  firstClass: boolean;
  liveConfigured: boolean;
  missingEnvVars: string[];
  capabilities: { mockPublishPath: string; livePublishPath: string | null };
  href: string;
};

type Ready = {
  channelId: string;
  connected: boolean;
  connectionMode?: string;
  missingEnvVars: string[];
};

type PanelInitial = {
  channels: ChannelSnap[];
  readiness: Ready[];
  statusLabel: string;
};

/**
 * Settings / Admin TapCast panel — mock connect, health, missing env, VERIFIED badge.
 */
export function TapCastChannelsPanel({ initial }: { initial?: PanelInitial }) {
  const [channels, setChannels] = useState<ChannelSnap[]>(initial?.channels ?? []);
  const [readiness, setReadiness] = useState<Ready[]>(initial?.readiness ?? []);
  const [statusLabel, setStatusLabel] = useState(
    initial?.statusLabel ?? "VERIFIED — CREDENTIALS REQUIRED"
  );
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const res = await fetch("/api/tapcast?view=registry");
    const json = await res.json();
    if (res.ok) {
      setChannels(json.channels ?? []);
      setReadiness(json.readiness ?? []);
      setStatusLabel(json.statusLabel ?? statusLabel);
    }
  }, [statusLabel]);

  useEffect(() => {
    if (!initial?.channels?.length) void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connect(channelId: string) {
    setBusy(true);
    try {
      await fetch("/api/tapcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect", channelId }),
      });
      await reload();
    } finally {
      setBusy(false);
    }
  }

  const readyMap = new Map(readiness.map((r) => [r.channelId, r]));

  return (
    <section
      id="tapcast-channels"
      className="space-y-4 rounded-lg border border-white/10 bg-black/30 p-5"
      data-testid="tapcast-channels-panel"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            className="text-lg font-semibold"
            data-testid="tapcast-channels-heading"
          >
            TapCast channels
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Omnichannel capability registry — mock connect works without credentials. Live
            publish remains credential-gated.
          </p>
        </div>
        <span
          className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-200"
          data-testid="tapcast-channels-live-badge"
        >
          {statusLabel}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-white/45">
            <tr>
              <th className="py-2 pr-3">Channel</th>
              <th className="py-2 pr-3">Category</th>
              <th className="py-2 pr-3">Mock path</th>
              <th className="py-2 pr-3">Env / health</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((c) => {
              const r = readyMap.get(c.id);
              return (
                <tr
                  key={c.id}
                  className="border-t border-white/10"
                  data-testid={`tapcast-admin-row-${c.id}`}
                >
                  <td className="py-2 pr-3">
                    {c.name}
                    {c.firstClass ? (
                      <Link
                        href={c.href}
                        className="ml-2 text-xs text-primary underline-offset-2 hover:underline"
                      >
                        first-class
                      </Link>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3 text-white/55">{c.categoryLabel}</td>
                  <td className="py-2 pr-3 font-mono text-xs">
                    {c.capabilities.mockPublishPath}
                  </td>
                  <td className="py-2 pr-3 text-xs">
                    {c.missingEnvVars.length > 0 ? (
                      <span className="text-amber-200/80">
                        Missing: {c.missingEnvVars.slice(0, 2).join(", ")}
                        {c.missingEnvVars.length > 2 ? "…" : ""}
                      </span>
                    ) : (
                      <span className="text-emerald-300/70">Env present</span>
                    )}
                    {r?.connected ? (
                      <span className="ml-2 text-white/50">· {r.connectionMode}</span>
                    ) : null}
                  </td>
                  <td className="py-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      data-testid={`tapcast-admin-connect-${c.id}`}
                      onClick={() => void connect(c.id)}
                    >
                      {r?.connected ? "Reconnect" : "Mock connect"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-white/40">
        Hub:{" "}
        <Link
          href="/dashboard/experiences/tapcast"
          className="text-primary underline-offset-4 hover:underline"
        >
          Experiences → TapCast
        </Link>
      </p>
    </section>
  );
}
