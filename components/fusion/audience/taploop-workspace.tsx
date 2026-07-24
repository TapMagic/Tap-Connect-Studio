"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Program = {
  id: string;
  name: string;
  active: boolean;
  earnRules: { id: string; label: string; points: number; event: string }[];
};

type LedgerRow = {
  id: string;
  type: string;
  points: number;
  reason: string;
  createdAt: string;
};

export function TapLoopWorkspace({ enabled }: { enabled: boolean }) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [name, setName] = useState("Visit rewards");
  const [contactId, setContactId] = useState("");
  const [programId, setProgramId] = useState("");
  const [points, setPoints] = useState(10);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const res = await fetch("/api/loyalty/programs");
    const data = await res.json();
    if (res.ok) {
      setPrograms(data.programs ?? []);
      if (!programId && data.programs?.[0]?.id) setProgramId(data.programs[0].id);
    }
  }

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/loyalty/programs");
      const data = await res.json();
      if (cancelled || !res.ok) return;
      setPrograms(data.programs ?? []);
      if (data.programs?.[0]?.id) {
        setProgramId((current) => current || data.programs[0].id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        Enable <code className="text-primary">loyalty.taploop</code> in Platform Admin to operate
        TapLoop.
      </p>
    );
  }

  async function createProgram() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/loyalty/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          earnRules: [{ id: "visit", label: "Visit", points: 10, event: "visit" }],
          tiers: [
            { name: "Member", rank: 0, thresholdPoints: 0, perks: [] },
            { name: "Gold", rank: 1, thresholdPoints: 100, perks: ["Priority"] },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Create failed");
        return;
      }
      setMessage(`Created program “${data.program?.name ?? name}”`);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function enroll() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/loyalty/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId, contactId, consentGiven: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Enroll failed");
        return;
      }
      setMessage("Contact enrolled (consent recorded)");
    } finally {
      setBusy(false);
    }
  }

  async function award() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/loyalty/award", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId,
          contactId,
          points,
          reason: "manual_award",
          idempotencyKey: `award_${contactId}_${Date.now()}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Award failed");
        return;
      }
      setMessage(`Awarded ${points} pts`);
      await loadLedger();
    } finally {
      setBusy(false);
    }
  }

  async function redeem() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/loyalty/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId,
          contactId,
          points,
          reason: "manual_redeem",
          idempotencyKey: `redeem_${contactId}_${Date.now()}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Redeem failed");
        return;
      }
      setMessage(`Redeemed ${points} pts`);
      await loadLedger();
    } finally {
      setBusy(false);
    }
  }

  async function loadLedger() {
    if (!programId || !contactId) return;
    const res = await fetch(
      `/api/loyalty/ledger?programId=${encodeURIComponent(programId)}&contactId=${encodeURIComponent(contactId)}`
    );
    const data = await res.json();
    if (res.ok) setLedger(data.entries ?? []);
  }

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card/40 p-4">
      <div>
        <h2 className="text-lg font-semibold">TapLoop</h2>
        <p className="text-xs text-muted-foreground">
          Create a program, enroll with consent, award/redeem, inspect ledger. Requires migrated
          fusion DB.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Program name"
          className="max-w-xs"
        />
        <Button disabled={busy || !name} onClick={createProgram}>
          Create program
        </Button>
      </div>

      {programs.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {programs.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className={`text-left ${programId === p.id ? "text-primary" : ""}`}
                onClick={() => setProgramId(p.id)}
              >
                {p.name} {p.active ? "" : "(inactive)"}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No programs yet.</p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          placeholder="Contact ID"
        />
        <Input
          type="number"
          value={points}
          onChange={(e) => setPoints(Number(e.target.value) || 0)}
          placeholder="Points"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy || !programId || !contactId} onClick={enroll} variant="outline">
          Enroll
        </Button>
        <Button disabled={busy || !programId || !contactId} onClick={award}>
          Award
        </Button>
        <Button disabled={busy || !programId || !contactId} onClick={redeem} variant="outline">
          Redeem
        </Button>
        <Button disabled={busy || !programId || !contactId} onClick={loadLedger} variant="ghost">
          Refresh ledger
        </Button>
      </div>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      {ledger.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground">
                <th className="py-1 pr-2">When</th>
                <th className="py-1 pr-2">Type</th>
                <th className="py-1 pr-2">Points</th>
                <th className="py-1">Reason</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((row) => (
                <tr key={row.id} className="border-b border-border/40">
                  <td className="py-1 pr-2">{new Date(row.createdAt).toLocaleString()}</td>
                  <td className="py-1 pr-2">{row.type}</td>
                  <td className="py-1 pr-2">{row.points}</td>
                  <td className="py-1">{row.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
