"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Gift, RefreshCw, ShieldAlert } from "lucide-react";
import { TapLoopRulesEditor } from "@/components/fusion/audience/taploop-rules-editor";
import { ErrorMessage } from "@/components/ui/error-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type EarnRule = { id: string; label: string; points: number; event: string };
type Tier = { id?: string; name: string; rank: number; thresholdPoints: number; perks: string[] };
type Reward = { id?: string; name: string; pointsCost: number; active: boolean };

type Program = {
  id: string;
  name: string;
  active: boolean;
  earnRules: EarnRule[];
  tiers: Tier[];
  rewards: Reward[];
  createdAt?: string;
};

type Member = {
  enrollmentId: string;
  programId: string;
  programName: string;
  contactId: string;
  contactName: string | null;
  contactEmail: string | null;
  status: string;
  balance: number;
  tierName: string | null;
  entryCount: number;
};

type MemberDetail = Member & {
  relationshipId: string | null;
  consentedAt: string;
  ledger: {
    id: string;
    type: string;
    points: number;
    reason: string;
    evidenceId?: string | null;
    idempotencyKey?: string;
    reversesEntryId?: string | null;
    createdBy?: string;
    createdAt: string;
  }[];
  rewardsAvailable: Reward[];
};

type InsightKpi = {
  key: string;
  label: string;
  value: number;
  evidenceClass: string;
  source: string;
};

type AuditRow = {
  id: string;
  at: string;
  action: string;
  actor: string;
  detail: string;
  entryId: string | null;
  enrollmentId: string | null;
};

function newKey(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function TapLoopWorkspace({ enabled }: { enabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [programId, setProgramId] = useState("");
  const [programName, setProgramName] = useState("Visit rewards");
  const [earnRulesJson, setEarnRulesJson] = useState(
    '[{"id":"visit","label":"Visit / tap","points":10,"event":"tap"},{"id":"purchase","label":"Purchase","points":50,"event":"purchase"}]'
  );
  const [tiersJson, setTiersJson] = useState(
    '[{"name":"Member","rank":0,"thresholdPoints":0,"perks":["Welcome"]},{"name":"Silver","rank":1,"thresholdPoints":100,"perks":["5% off"]},{"name":"Gold","rank":2,"thresholdPoints":500,"perks":["10% off","Priority"]}]'
  );
  const [rewardName, setRewardName] = useState("Free coffee");
  const [rewardCost, setRewardCost] = useState("50");
  const [contactId, setContactId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [points, setPoints] = useState("10");
  const [reason, setReason] = useState("operator_award");
  const [evidenceId, setEvidenceId] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() => newKey("award"));
  const [adjustDirection, setAdjustDirection] = useState<"credit" | "debit">("credit");
  const [kpis, setKpis] = useState<InsightKpi[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [lastFailedAction, setLastFailedAction] = useState<null | (() => void)>(null);

  const selected = programs.find((p) => p.id === programId) ?? null;

  function reportOk(text: string) {
    setError(null);
    setLastFailedAction(null);
    setMessage(text);
  }

  function reportFail(text: string, retry?: () => void) {
    setMessage(null);
    setError(text);
    setLastFailedAction(() => (retry ? () => retry() : null));
  }

  function refreshPrograms() {
    startTransition(async () => {
      const res = await fetch("/api/loyalty/programs");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        reportFail(data.error ?? "Failed to load programs", refreshPrograms);
        return;
      }
      const list = (data.programs ?? []) as Program[];
      setPrograms(list);
      setProgramId((current) => current || list[0]?.id || "");
      reportOk(`Loaded ${list.length} program(s)`);
    });
  }

  function refreshMembers(forProgramId = programId) {
    if (!forProgramId) return;
    startTransition(async () => {
      const res = await fetch(
        `/api/loyalty/members?programId=${encodeURIComponent(forProgramId)}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        reportFail(data.error ?? "Failed to load members", () => refreshMembers(forProgramId));
        return;
      }
      setMembers(data.members ?? []);
    });
  }

  function refreshInsights(forProgramId = programId) {
    startTransition(async () => {
      const [kpiRes, auditRes] = await Promise.all([
        fetch("/api/loyalty/insights?view=kpis&rangeDays=14"),
        fetch(
          `/api/loyalty/insights?view=audit${forProgramId ? `&programId=${encodeURIComponent(forProgramId)}` : ""}`
        ),
      ]);
      const kpiData = await kpiRes.json().catch(() => ({}));
      const auditData = await auditRes.json().catch(() => ({}));
      if (kpiRes.ok) setKpis(kpiData.snapshot?.kpis ?? []);
      if (auditRes.ok) setAudit(auditData.audit ?? []);
    });
  }

  function openMember(enrollmentId: string) {
    startTransition(async () => {
      const res = await fetch(
        `/api/loyalty/members?enrollmentId=${encodeURIComponent(enrollmentId)}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        reportFail(data.error ?? "Failed to load member", () => openMember(enrollmentId));
        return;
      }
      setMember(data.member);
      setContactId(data.member?.contactId ?? "");
      reportOk(
        `Member ${data.member?.contactName || data.member?.contactEmail || enrollmentId.slice(0, 8)} · balance ${data.member?.balance}`
      );
    });
  }

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/loyalty/programs");
      const data = await res.json().catch(() => ({}));
      if (cancelled || !res.ok) return;
      const list = (data.programs ?? []) as Program[];
      setPrograms(list);
      if (list[0]?.id) {
        setProgramId((current) => current || list[0].id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !programId) return;
    let cancelled = false;
    (async () => {
      const [memRes, kpiRes, auditRes] = await Promise.all([
        fetch(`/api/loyalty/members?programId=${encodeURIComponent(programId)}`),
        fetch("/api/loyalty/insights?view=kpis&rangeDays=14"),
        fetch(`/api/loyalty/insights?view=audit&programId=${encodeURIComponent(programId)}`),
      ]);
      if (cancelled) return;
      const memData = await memRes.json().catch(() => ({}));
      const kpiData = await kpiRes.json().catch(() => ({}));
      const auditData = await auditRes.json().catch(() => ({}));
      if (memRes.ok) setMembers(memData.members ?? []);
      if (kpiRes.ok) setKpis(kpiData.snapshot?.kpis ?? []);
      if (auditRes.ok) setAudit(auditData.audit ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, programId]);

  if (!enabled) {
    return (
      <div
        className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"
        data-testid="taploop-workspace-disabled"
      >
        <div className="flex items-center gap-2 text-amber-200">
          <ShieldAlert className="h-4 w-4" />
          <p className="font-semibold">TapLoop disabled</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Enable <code className="text-[oklch(0.82_0.11_275)]">loyalty.taploop</code> in Platform Admin, then
          reload this page.
        </p>
        <Link
          href="/admin/platform"
          className="inline-flex h-7 items-center rounded-lg border border-primary/20 bg-background/70 px-2.5 text-[0.8rem] font-medium hover:border-primary/45 hover:bg-primary/10 hover:text-primary"
        >
          Open Platform Admin
        </Link>
      </div>
    );
  }

  function createProgram() {
    let earnRules: EarnRule[] = [];
    let tiers: Tier[] = [];
    try {
      earnRules = JSON.parse(earnRulesJson) as EarnRule[];
      tiers = JSON.parse(tiersJson) as Tier[];
    } catch {
      reportFail("Earn rules / tiers JSON is invalid");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/loyalty/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: programName, earnRules, tiers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        reportFail(data.error ?? "Create program failed", createProgram);
        return;
      }
      setProgramId(data.program.id);
      reportOk(`Created program “${data.program.name}”`);
      refreshPrograms();
      refreshInsights(data.program.id);
    });
  }

  function saveRules() {
    if (!programId) return;
    let earnRules: EarnRule[] = [];
    let tiers: Tier[] = [];
    try {
      earnRules = JSON.parse(earnRulesJson) as EarnRule[];
      tiers = JSON.parse(tiersJson) as Tier[];
    } catch {
      reportFail("Earn rules / tiers JSON is invalid");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/loyalty/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "defineRules",
          programId,
          earnRules,
          tiers,
          rewards: rewardName
            ? [{ name: rewardName, pointsCost: Number(rewardCost) || 1, active: true }]
            : [],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        reportFail(data.error ?? "Save rules failed", saveRules);
        return;
      }
      reportOk("Saved earning rules, tiers, and reward");
      refreshPrograms();
    });
  }

  function toggleProgramActive() {
    if (!selected) return;
    const next = !selected.active;
    startTransition(async () => {
      const res = await fetch("/api/loyalty/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setActive", programId: selected.id, active: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        reportFail(data.error ?? "Program status update failed", toggleProgramActive);
        return;
      }
      reportOk(`Program ${next ? "activated" : "paused"}`);
      refreshPrograms();
    });
  }

  function enrollContact() {
    if (!programId || !contactId) {
      reportFail("Select a program and enter a contact ID");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/loyalty/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId, contactId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        reportFail(
          data.error ?? "Enroll failed — record EMAIL/MARKETING consent on the contact first",
          enrollContact
        );
        return;
      }
      reportOk(`Enrolled · ${data.enrollment.id}`);
      refreshMembers(programId);
      openMember(data.enrollment.id);
      refreshInsights(programId);
    });
  }

  function awardPoints(forceKey?: string) {
    if (!member?.enrollmentId) {
      reportFail("Open a member first");
      return;
    }
    const key = forceKey ?? idempotencyKey;
    startTransition(async () => {
      const res = await fetch("/api/loyalty/award", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId: member.enrollmentId,
          points: Number(points) || 0,
          reason,
          idempotencyKey: key,
          evidenceId: evidenceId || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        reportFail(data.error ?? "Award failed", () => awardPoints(key));
        return;
      }
      reportOk(
        data.duplicate
          ? `Duplicate prevented — same idempotency key · balance ${data.balance}`
          : `Awarded ${points} pts · balance ${data.balance}`
      );
      if (!data.duplicate) setIdempotencyKey(newKey("award"));
      openMember(member.enrollmentId);
      refreshMembers(programId);
      refreshInsights(programId);
    });
  }

  function redeemPoints() {
    if (!member?.enrollmentId) {
      reportFail("Open a member first");
      return;
    }
    const key = newKey("redeem");
    startTransition(async () => {
      const rewardId = member.rewardsAvailable.find((r) => r.active)?.id;
      const res = await fetch("/api/loyalty/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId: member.enrollmentId,
          points: Number(points) || 0,
          reason: reason || "operator_redeem",
          idempotencyKey: key,
          rewardId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        reportFail(data.error ?? "Redeem failed", redeemPoints);
        return;
      }
      reportOk(`Redeemed ${points} pts · balance ${data.balance}`);
      openMember(member.enrollmentId);
      refreshMembers(programId);
      refreshInsights(programId);
    });
  }

  function reverseEntry(entryId: string) {
    if (!member?.enrollmentId) return;
    const key = newKey("reverse");
    startTransition(async () => {
      const res = await fetch("/api/loyalty/reverse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId,
          reason: `Reverse ${entryId}`,
          idempotencyKey: key,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        reportFail(data.error ?? "Reverse failed", () => reverseEntry(entryId));
        return;
      }
      reportOk(
        data.duplicate
          ? `Reverse already applied · balance ${data.balance}`
          : `Reversed entry · balance ${data.balance}`
      );
      openMember(member.enrollmentId);
      refreshInsights(programId);
    });
  }

  function adjustPoints() {
    if (!member?.enrollmentId) {
      reportFail("Open a member first");
      return;
    }
    const key = newKey("adjust");
    startTransition(async () => {
      const res = await fetch("/api/loyalty/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId: member.enrollmentId,
          points: Number(points) || 0,
          direction: adjustDirection,
          reason: reason || `manual_${adjustDirection}`,
          idempotencyKey: key,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        reportFail(data.error ?? "Adjust failed", adjustPoints);
        return;
      }
      reportOk(
        `${adjustDirection} adjust ${points} pts · balance ${data.balance}${data.duplicate ? " (duplicate)" : ""}`
      );
      openMember(member.enrollmentId);
      refreshInsights(programId);
    });
  }

  function setMemberStatus(status: "ACTIVE" | "PAUSED" | "CANCELLED") {
    if (!member?.enrollmentId) return;
    startTransition(async () => {
      const res = await fetch("/api/loyalty/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId: member.enrollmentId, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        reportFail(data.error ?? "Status update failed", () => setMemberStatus(status));
        return;
      }
      reportOk(`Membership → ${status}`);
      openMember(member.enrollmentId);
      refreshMembers(programId);
    });
  }

  function loadSelectedIntoEditors() {
    if (!selected) return;
    setEarnRulesJson(JSON.stringify(selected.earnRules ?? [], null, 0));
    setTiersJson(
      JSON.stringify(
        (selected.tiers ?? []).map((t) => ({
          name: t.name,
          rank: t.rank,
          thresholdPoints: t.thresholdPoints,
          perks: t.perks ?? [],
        })),
        null,
        0
      )
    );
    if (selected.rewards?.[0]) {
      setRewardName(selected.rewards[0].name);
      setRewardCost(String(selected.rewards[0].pointsCost));
    }
    reportOk(`Loaded editors from “${selected.name}”`);
  }

  return (
    <div
      className="space-y-5 rounded-xl border border-border/60 bg-card/40 p-4"
      data-testid="taploop-workspace"
      id="taploop-ops"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-[oklch(0.74_0.13_275)]" />
            <h2 className="text-lg font-semibold" data-testid="taploop-heading">
              TapLoop program manager
            </h2>
            <span
              className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
              style={{
                borderColor: "var(--studio-status-ok)",
                color: "var(--studio-status-ok)",
              }}
            >
              loyalty.taploop
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Create programs, earning rules, tiers, rewards; enroll members; award / redeem /
            reverse / adjust with idempotent duplicate prevention; inspect ledger, audit, and
            Insights hooks.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
              refreshPrograms();
              refreshMembers();
              refreshInsights();
            }}
            data-testid="taploop-refresh"
          >
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            Refresh
          </Button>
          <Link
            href="/admin/platform"
            data-testid="taploop-admin-link"
            className="inline-flex h-7 items-center rounded-lg px-2.5 text-[0.8rem] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Admin kill-switch
          </Link>
        </div>
      </div>

      {kpis.length > 0 ? (
        <div
          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
          data-testid="taploop-insights-kpis"
        >
          {kpis.slice(0, 8).map((k) => (
            <div
              key={k.key}
              className="rounded-lg border border-border/50 bg-background/40 px-3 py-2"
              data-testid={`taploop-kpi-${k.key}`}
            >
              <p className="text-[11px] text-muted-foreground">{k.label}</p>
              <p className="text-xl font-semibold text-[oklch(0.82_0.11_275)]">{k.value}</p>
              <p className="text-[10px] text-muted-foreground">
                {k.evidenceClass} · {k.source}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <section className="space-y-3" data-testid="taploop-program-create">
        <p className="text-sm font-semibold">Create program</p>
        <div className="flex flex-wrap gap-2">
          <Input
            value={programName}
            onChange={(e) => setProgramName(e.target.value)}
            placeholder="Program name"
            className="max-w-xs"
            data-testid="taploop-program-name"
          />
          <Button
            type="button"
            disabled={pending || !programName.trim()}
            onClick={createProgram}
            data-testid="taploop-create-program"
          >
            Create program
          </Button>
        </div>
        <TapLoopRulesEditor
          earnRulesJson={earnRulesJson}
          tiersJson={tiersJson}
          onEarnRulesChange={setEarnRulesJson}
          onTiersChange={setTiersJson}
        />
        <div className="flex flex-wrap gap-2">
          <Input
            value={rewardName}
            onChange={(e) => setRewardName(e.target.value)}
            placeholder="Reward name"
            className="max-w-[180px]"
            data-testid="taploop-reward-name"
          />
          <Input
            value={rewardCost}
            onChange={(e) => setRewardCost(e.target.value)}
            placeholder="Points cost"
            className="max-w-[120px]"
            data-testid="taploop-reward-cost"
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending || !programId}
            onClick={saveRules}
            data-testid="taploop-save-rules"
          >
            Save rules / tiers / reward
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={!selected}
            onClick={loadSelectedIntoEditors}
            data-testid="taploop-load-editors"
          >
            Load selected into editors
          </Button>
        </div>
      </section>

      <section className="space-y-2" data-testid="taploop-program-list">
        <p className="text-sm font-semibold">Programs</p>
        {programs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No programs yet — create one above.</p>
        ) : (
          <ul className="space-y-1">
            {programs.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 text-sm">
                <button
                  type="button"
                  className={`text-left ${programId === p.id ? "font-semibold text-[oklch(0.86_0.09_275)]" : ""}`}
                  aria-pressed={programId === p.id}
                  onClick={() => setProgramId(p.id)}
                  data-testid={`taploop-program-${p.id}`}
                >
                  {p.name}
                </button>
                <span
                  className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                  style={
                    p.active
                      ? {
                          borderColor: "var(--studio-status-ok)",
                          color: "var(--studio-status-ok)",
                        }
                      : {
                          borderColor: "var(--studio-status-neutral)",
                          color: "var(--studio-status-neutral)",
                        }
                  }
                >
                  {p.active ? "active" : "paused"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {p.earnRules?.length ?? 0} rules · {p.tiers?.length ?? 0} tiers ·{" "}
                  {p.rewards?.length ?? 0} rewards
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending || !selected}
            onClick={toggleProgramActive}
            data-testid="taploop-toggle-active"
          >
            {selected?.active ? "Pause program" : "Activate program"}
          </Button>
        </div>
      </section>

      <section className="space-y-3 border-t border-border/40 pt-4" data-testid="taploop-enrollment">
        <p className="text-sm font-semibold">Enrollment & member ops</p>
        <div className="flex flex-wrap gap-2">
          <Input
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
            placeholder="Contact ID"
            className="max-w-xs"
            data-testid="taploop-contact-id"
          />
          <Button
            type="button"
            size="sm"
            disabled={pending || !programId || !contactId}
            onClick={enrollContact}
            data-testid="taploop-enroll"
          >
            Enroll (requires consent)
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            placeholder="Points"
            data-testid="taploop-points"
          />
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason"
            data-testid="taploop-reason"
          />
          <Input
            value={evidenceId}
            onChange={(e) => setEvidenceId(e.target.value)}
            placeholder="Evidence ID (optional)"
            data-testid="taploop-evidence"
          />
          <Input
            value={idempotencyKey}
            onChange={(e) => setIdempotencyKey(e.target.value)}
            placeholder="Idempotency key"
            data-testid="taploop-idempotency"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={pending || !member}
            onClick={() => awardPoints()}
            data-testid="taploop-award"
          >
            Award
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending || !member}
            onClick={() => awardPoints(idempotencyKey)}
            data-testid="taploop-award-duplicate"
          >
            Re-award same key (dup check)
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending || !member}
            onClick={redeemPoints}
            data-testid="taploop-redeem"
          >
            Redeem
          </Button>
          <select
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            value={adjustDirection}
            onChange={(e) => setAdjustDirection(e.target.value as "credit" | "debit")}
            data-testid="taploop-adjust-direction"
            aria-label="Adjust ledger direction"
          >
            <option value="credit">Adjust credit</option>
            <option value="debit">Adjust debit</option>
          </select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending || !member}
            onClick={adjustPoints}
            data-testid="taploop-adjust"
          >
            Adjust
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending || !member}
            onClick={() => setMemberStatus("PAUSED")}
            data-testid="taploop-pause-member"
          >
            Pause member
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending || !member}
            onClick={() => setMemberStatus("ACTIVE")}
            data-testid="taploop-activate-member"
          >
            Activate member
          </Button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-2" data-testid="taploop-members">
          <p className="text-sm font-semibold">Members</p>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No enrollments for this program.</p>
          ) : (
            <ul className="max-h-56 space-y-1 overflow-auto text-sm">
              {members.map((m) => (
                <li key={m.enrollmentId}>
                  <button
                    type="button"
                    className={`w-full rounded-md border-l-2 border-transparent px-2 py-1.5 text-left hover:bg-white/[0.04] ${
                      member?.enrollmentId === m.enrollmentId
                        ? "border-l-[oklch(0.64_0.12_275)] bg-[oklch(0.64_0.12_275_/_0.1)] text-[oklch(0.86_0.09_275)]"
                        : ""
                    }`}
                    aria-pressed={member?.enrollmentId === m.enrollmentId}
                    onClick={() => openMember(m.enrollmentId)}
                    data-testid={`taploop-member-${m.enrollmentId}`}
                  >
                    {m.contactName || m.contactEmail || m.contactId.slice(0, 8)} · {m.balance} pts ·{" "}
                    {m.tierName ?? "—"} · {m.status}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2" data-testid="taploop-member-detail">
          <p className="text-sm font-semibold">Member detail</p>
          {!member ? (
            <p className="text-sm text-muted-foreground">Select a member to inspect ledger.</p>
          ) : (
            <div className="space-y-2 text-sm">
              <p data-testid="taploop-member-balance">
                <span className="text-muted-foreground">Balance:</span>{" "}
                <span className="font-semibold text-[oklch(0.82_0.11_275)]">{member.balance}</span>
                {member.tierName ? ` · ${member.tierName}` : ""} · {member.status}
              </p>
              <p className="text-xs text-muted-foreground">
                Enrollment {member.enrollmentId} · consented{" "}
                {member.consentedAt?.slice?.(0, 10) ?? "—"}
              </p>
              <ul
                className="max-h-56 space-y-1 overflow-auto font-mono text-[11px] text-muted-foreground"
                data-testid="taploop-ledger"
              >
                {member.ledger.map((e) => (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 py-1"
                  >
                    <span>
                      {e.type} {e.points} · {e.reason}
                      {e.evidenceId ? ` · ev:${e.evidenceId}` : ""}
                    </span>
                    {e.type === "AWARD" || e.type === "REDEEM" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[10px]"
                        disabled={pending || Boolean(e.reversesEntryId)}
                        onClick={() => reverseEntry(e.id)}
                        data-testid={`taploop-reverse-${e.id}`}
                      >
                        Reverse
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <section className="space-y-2 border-t border-border/40 pt-4" data-testid="taploop-audit">
        <p className="text-sm font-semibold">Audit trail</p>
        {audit.length === 0 ? (
          <p className="text-sm text-muted-foreground">No ledger audit rows yet.</p>
        ) : (
          <ul className="max-h-40 space-y-1 overflow-auto font-mono text-[11px] text-muted-foreground">
            {audit.map((row) => (
              <li key={row.id} data-testid={`taploop-audit-${row.id}`}>
                {row.at.slice(0, 19)} · {row.action} · {row.actor} · {row.detail}
              </li>
            ))}
          </ul>
        )}
      </section>

      {message ? (
        <p className="text-sm text-[oklch(0.82_0.11_275)]" data-testid="taploop-message" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <div className="space-y-2" data-testid="taploop-error-wrap">
          <ErrorMessage error={error} testId="taploop-error" />
          {lastFailedAction ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => lastFailedAction()}
              data-testid="taploop-retry"
            >
              Retry
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
