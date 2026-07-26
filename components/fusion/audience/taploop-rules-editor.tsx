"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type EarnRuleDraft = {
  id: string;
  label: string;
  points: number;
  event: string;
};

export type TierDraft = {
  id?: string;
  name: string;
  rank: number;
  thresholdPoints: number;
  perks: string[];
};

const EVENT_OPTIONS = [
  { value: "tap", label: "Visit / tap" },
  { value: "purchase", label: "Purchase" },
  { value: "referral", label: "Referral" },
  { value: "custom", label: "Custom event" },
];

function parseSafe<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Guided earn-rules + tiers editor. JSON remains an Advanced escape hatch.
 * Fully controlled by parent JSON strings — no sync effects.
 */
export function TapLoopRulesEditor({
  earnRulesJson,
  tiersJson,
  onEarnRulesChange,
  onTiersChange,
}: {
  earnRulesJson: string;
  tiersJson: string;
  onEarnRulesChange: (json: string) => void;
  onTiersChange: (json: string) => void;
}) {
  const [mode, setMode] = useState<"guided" | "json">("guided");
  const panelId = useId();
  const rules = parseSafe(earnRulesJson, [] as EarnRuleDraft[]);
  const tiers = parseSafe(tiersJson, [] as TierDraft[]);

  function commitRules(next: EarnRuleDraft[]) {
    onEarnRulesChange(JSON.stringify(next));
  }

  function commitTiers(next: TierDraft[]) {
    onTiersChange(JSON.stringify(next));
  }

  return (
    <div className="space-y-3" data-testid="taploop-rules-editor">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          How members earn points and unlock tiers — no JSON required.
        </p>
        <div className="inline-flex rounded-lg border border-border/60 p-0.5">
          <button
            type="button"
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
              mode === "guided" ? "bg-primary/15 text-primary" : "text-muted-foreground"
            }`}
            aria-pressed={mode === "guided"}
            data-testid="taploop-rules-mode-guided"
            onClick={() => setMode("guided")}
          >
            Guided
          </button>
          <button
            type="button"
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
              mode === "json" ? "bg-primary/15 text-primary" : "text-muted-foreground"
            }`}
            aria-pressed={mode === "json"}
            data-testid="taploop-rules-mode-json"
            onClick={() => setMode("json")}
          >
            Advanced · JSON
          </button>
        </div>
      </div>

      {mode === "json" ? (
        <div id={panelId} className="grid gap-2 lg:grid-cols-2">
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">Earning rules (JSON)</span>
            <textarea
              className="min-h-[88px] w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-[11px]"
              value={earnRulesJson}
              onChange={(e) => onEarnRulesChange(e.target.value)}
              data-testid="taploop-earn-rules"
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">Tiers (JSON)</span>
            <textarea
              className="min-h-[88px] w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-[11px]"
              value={tiersJson}
              onChange={(e) => onTiersChange(e.target.value)}
              data-testid="taploop-tiers"
            />
          </label>
        </div>
      ) : (
        <div id={panelId} className="space-y-4">
          <section className="space-y-2" data-testid="taploop-guided-earn">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs font-semibold">Earning rules</Label>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                data-testid="taploop-add-earn-rule"
                onClick={() =>
                  commitRules([
                    ...rules,
                    {
                      id: `rule_${Date.now()}`,
                      label: "New rule",
                      points: 10,
                      event: "tap",
                    },
                  ])
                }
              >
                Add rule
              </Button>
            </div>
            {rules.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No earning rules yet — add how members get points.
              </p>
            ) : (
              <ul className="space-y-2">
                {rules.map((rule, index) => (
                  <li
                    key={rule.id || index}
                    className="grid gap-2 rounded-lg border border-border/50 bg-background/40 p-3 sm:grid-cols-[1fr_7rem_9rem_auto]"
                    data-testid={`taploop-earn-rule-row-${index}`}
                  >
                    <Input
                      value={rule.label}
                      aria-label={`Rule ${index + 1} label`}
                      onChange={(e) => {
                        const next = [...rules];
                        next[index] = { ...rule, label: e.target.value };
                        commitRules(next);
                      }}
                    />
                    <Input
                      type="number"
                      min={0}
                      value={rule.points}
                      aria-label={`Rule ${index + 1} points`}
                      onChange={(e) => {
                        const next = [...rules];
                        next[index] = {
                          ...rule,
                          points: Number(e.target.value) || 0,
                        };
                        commitRules(next);
                      }}
                    />
                    <select
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                      value={
                        EVENT_OPTIONS.some((o) => o.value === rule.event)
                          ? rule.event
                          : "custom"
                      }
                      aria-label={`Rule ${index + 1} event`}
                      onChange={(e) => {
                        const next = [...rules];
                        const event = e.target.value === "custom" ? "custom" : e.target.value;
                        next[index] = { ...rule, event };
                        commitRules(next);
                      }}
                    >
                      {EVENT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove rule ${index + 1}`}
                      onClick={() => commitRules(rules.filter((_, i) => i !== index))}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2" data-testid="taploop-guided-tiers">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs font-semibold">Tiers</Label>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                data-testid="taploop-add-tier"
                onClick={() =>
                  commitTiers([
                    ...tiers,
                    {
                      name: "New tier",
                      rank: tiers.length,
                      thresholdPoints: tiers.length * 100,
                      perks: [],
                    },
                  ])
                }
              >
                Add tier
              </Button>
            </div>
            {tiers.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No tiers yet — optional levels members unlock with points.
              </p>
            ) : (
              <ul className="space-y-2">
                {tiers.map((tier, index) => (
                  <li
                    key={`${tier.name}-${index}`}
                    className="grid gap-2 rounded-lg border border-border/50 bg-background/40 p-3 sm:grid-cols-[1fr_6rem_7rem_1fr_auto]"
                    data-testid={`taploop-tier-row-${index}`}
                  >
                    <Input
                      value={tier.name}
                      aria-label={`Tier ${index + 1} name`}
                      onChange={(e) => {
                        const next = [...tiers];
                        next[index] = { ...tier, name: e.target.value };
                        commitTiers(next);
                      }}
                    />
                    <Input
                      type="number"
                      min={0}
                      value={tier.rank}
                      aria-label={`Tier ${index + 1} rank`}
                      onChange={(e) => {
                        const next = [...tiers];
                        next[index] = { ...tier, rank: Number(e.target.value) || 0 };
                        commitTiers(next);
                      }}
                    />
                    <Input
                      type="number"
                      min={0}
                      value={tier.thresholdPoints}
                      aria-label={`Tier ${index + 1} points threshold`}
                      onChange={(e) => {
                        const next = [...tiers];
                        next[index] = {
                          ...tier,
                          thresholdPoints: Number(e.target.value) || 0,
                        };
                        commitTiers(next);
                      }}
                    />
                    <Input
                      value={(tier.perks ?? []).join(", ")}
                      aria-label={`Tier ${index + 1} perks`}
                      placeholder="Perks (comma-separated)"
                      onChange={(e) => {
                        const next = [...tiers];
                        next[index] = {
                          ...tier,
                          perks: e.target.value
                            .split(",")
                            .map((p) => p.trim())
                            .filter(Boolean),
                        };
                        commitTiers(next);
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove tier ${index + 1}`}
                      onClick={() => commitTiers(tiers.filter((_, i) => i !== index))}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <textarea
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            readOnly
            value={earnRulesJson}
            data-testid="taploop-earn-rules"
          />
          <textarea
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            readOnly
            value={tiersJson}
            data-testid="taploop-tiers"
          />
        </div>
      )}
    </div>
  );
}
