"use client";

import { useMemo, useState, useTransition } from "react";
import { FEATURE_DEFINITIONS, listRegistryStatus } from "@/lib/fusion/features";
import type { FeatureOverride } from "@/lib/fusion/features";
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

  function toggle(row: Row) {
    const nextEnabled = !row.enabled;
    if (!reason.trim()) {
      setMessage("Enter a reason before changing feature availability.");
      return;
    }

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
      setMessage(
        `${nextEnabled ? "Enabled" : "Disabled"} ${row.name} · stored in ${data.storage}`
      );
    });
  }

  return (
    <div className="space-y-4">
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

      <div className="overflow-hidden rounded-xl border border-border/60">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Feature</th>
              <th className="px-3 py-2 font-medium">Maturity</th>
              <th className="px-3 py-2 font-medium">Ready</th>
              <th className="px-3 py-2 font-medium">On</th>
              <th className="px-3 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-t border-border/40 align-top">
                <td className="px-3 py-2">
                  <p className="font-medium">{row.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{row.id}</p>
                  <p className="text-[11px] text-muted-foreground">{row.pillar}</p>
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
                      row.readiness === "ready"
                        ? "text-emerald-500"
                        : row.readiness === "ready_with_warning"
                          ? "text-amber-500"
                          : "text-rose-500"
                    )}
                  >
                    {row.readiness}
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    {row.executable ? "executable" : "not executable"}
                  </p>
                </td>
                <td className="px-3 py-2">{row.enabled ? "Yes" : "No"}</td>
                <td className="px-3 py-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={row.enabled ? "outline" : "default"}
                    onClick={() => toggle(row)}
                    disabled={row.maturity === "retired" || pending}
                  >
                    {row.enabled ? "Disable" : "Enable"}
                  </Button>
                </td>
              </tr>
            ))}
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
