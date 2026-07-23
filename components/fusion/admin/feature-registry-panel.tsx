"use client";

import { useMemo, useState, useTransition } from "react";
import { FEATURE_DEFINITIONS, listRegistryStatus } from "@/lib/fusion/features";
import type { FeatureOverride } from "@/lib/fusion/features";
import {
  describeActivationState,
  isKillSwitchFeature,
  killSwitchConfirmTitle,
  overrideBadge,
  requiresToggleConfirm,
  toggleButtonLabel,
  toggleImpactWarning,
} from "@/lib/fusion/features/admin-copy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Row = ReturnType<typeof listRegistryStatus>[number];

export function FeatureRegistryPanel({
  initialOverrides = [],
  internalOperator = true,
}: {
  initialOverrides?: FeatureOverride[];
  internalOperator?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [pillar, setPillar] = useState<string>("all");
  const [overrides, setOverrides] = useState(initialOverrides);
  const [reason, setReason] = useState("Admin activation");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [pendingToggle, setPendingToggle] = useState<{
    row: Row;
    nextEnabled: boolean;
    warning: string;
  } | null>(null);

  const rows = useMemo(
    () =>
      listRegistryStatus({
        overrides,
        internalOperator,
      }),
    [overrides, internalOperator]
  );

  const pillars = useMemo(
    () => Array.from(new Set(FEATURE_DEFINITIONS.map((f) => f.pillar))).sort(),
    []
  );

  const filtered = rows.filter((r) => {
    if (pillar !== "all" && r.pillar !== pillar) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return r.id.includes(q) || r.name.toLowerCase().includes(q) || r.pillar.includes(q);
  });

  function executeToggle(row: Row, nextEnabled: boolean) {
    startTransition(async () => {
      const res = await fetch("/api/admin/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          featureId: row.id,
          enabled: nextEnabled,
          scope: "global",
          reason: reason.trim(),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        storage?: string;
        override?: FeatureOverride;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.override) {
        setMessage(data.error || "Failed to persist override");
        return;
      }
      setOverrides((prev) => {
        const without = prev.filter(
          (o) => !(o.featureId === data.override!.featureId && o.scope === data.override!.scope)
        );
        return [...without, data.override!];
      });
      const killSwitchNote = isKillSwitchFeature(row.id) && !nextEnabled ? " · kill-switch active" : "";
      setMessage(
        `${nextEnabled ? "Enabled" : "Disabled"} ${row.name} · stored in ${data.storage}${killSwitchNote}`
      );
    });
  }

  function toggle(row: Row) {
    const nextEnabled = !row.enabled;
    if (!reason.trim()) {
      setMessage("Enter a reason before changing feature availability.");
      return;
    }

    const warning = toggleImpactWarning(row, nextEnabled);
    if (warning && requiresToggleConfirm(row, nextEnabled)) {
      setPendingToggle({ row, nextEnabled, warning });
      return;
    }

    executeToggle(row, nextEnabled);
  }

  function confirmPendingToggle() {
    if (!pendingToggle) return;
    const { row, nextEnabled } = pendingToggle;
    setPendingToggle(null);
    executeToggle(row, nextEnabled);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Kill-switch vs executable</p>
        <p className="mt-1">
          <strong>On</strong> = registry switch (override or default).{" "}
          <strong>Executable</strong> = routes/APIs can run without credential blockers. Turning OFF a
          comms or wallet feature is a kill-switch — it hides surfaces even when mocks exist.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Search features</p>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="id, name, pillar…"
          />
        </div>
        <div className="min-w-[180px] flex-1 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Change reason (required)</p>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this changing?"
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Pillar</p>
          <select
            className="flex h-9 rounded-lg border border-input bg-background px-2 text-sm"
            value={pillar}
            onChange={(e) => setPillar(e.target.value)}
          >
            <option value="all">All</option>
            {pillars.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {message ? (
        <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
          {message}
        </p>
      ) : null}

      {pendingToggle ? (
        <div
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3"
          role="alertdialog"
          aria-labelledby="kill-switch-confirm-title"
        >
          <p id="kill-switch-confirm-title" className="text-sm font-semibold text-amber-600 dark:text-amber-400">
            {isKillSwitchFeature(pendingToggle.row.id)
              ? killSwitchConfirmTitle(pendingToggle.row.name)
              : `Confirm disable — ${pendingToggle.row.name}`}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{pendingToggle.warning}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Reason: <span className="font-medium text-foreground">{reason.trim()}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={confirmPendingToggle}
            >
              {isKillSwitchFeature(pendingToggle.row.id) ? "Apply kill-switch" : "Confirm disable"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => setPendingToggle(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border/60">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Feature</th>
              <th className="px-3 py-2 font-medium">Maturity</th>
              <th className="px-3 py-2 font-medium">Activation</th>
              <th className="px-3 py-2 font-medium">On</th>
              <th className="px-3 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const overrideLabel = overrideBadge(row, overrides);
              return (
                <tr key={row.id} className="border-t border-border/40 align-top">
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1">
                      <p className="font-medium">{row.name}</p>
                      {isKillSwitchFeature(row.id) ? (
                        <Badge variant="outline" className="text-[10px] text-amber-600">
                          kill-switch
                        </Badge>
                      ) : null}
                    </div>
                    <p className="font-mono text-[11px] text-muted-foreground">{row.id}</p>
                    <p className="text-[11px] text-muted-foreground">{row.pillar}</p>
                    {overrideLabel ? (
                      <Badge variant="secondary" className="mt-1 text-[10px]">
                        {overrideLabel}
                      </Badge>
                    ) : null}
                    {row.blockers.length ? (
                      <ul className="mt-1 list-disc pl-4 text-[11px] text-amber-600 dark:text-amber-400">
                        {row.blockers.slice(0, 3).map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {row.maturity}
                    </Badge>
                    <p className="mt-1 text-[11px] text-muted-foreground">{row.implementation}</p>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "text-[11px] font-medium",
                        row.executable
                          ? "text-emerald-500"
                          : row.enabled
                            ? "text-amber-500"
                            : "text-rose-500"
                      )}
                    >
                      {row.executable ? "executable" : row.enabled ? "on, not executable" : "off"}
                    </span>
                    <p className="text-[11px] text-muted-foreground">{describeActivationState(row)}</p>
                  </td>
                  <td className="px-3 py-2">
                    <span className={row.enabled ? "font-medium text-primary" : "text-muted-foreground"}>
                      {row.enabled ? "Yes" : "No"}
                    </span>
                    {!row.enabled && row.defaultEnabled ? (
                      <p className="text-[10px] text-amber-600">default was ON</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={row.enabled ? "outline" : "default"}
                      onClick={() => toggle(row)}
                      disabled={row.maturity === "retired" || pending}
                    >
                      {toggleButtonLabel(row)}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Toggles cannot bypass missing credentials or uncertified providers. Changes require a reason
        and are audited. Without DATABASE_URL, overrides persist to{" "}
        <code className="font-mono">.fusion/feature-overrides.json</code>.
      </p>
    </div>
  );
}
