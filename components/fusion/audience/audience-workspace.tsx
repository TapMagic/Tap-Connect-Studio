"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Gift, Mail, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type ContactRow = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  updatedAt: string;
  relationshipToken: string | null;
  consentCount: number;
  leadCount: number;
};

type ContactDetail = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  relationships: { id: string; publicToken: string; status: string; tapSaveEnabled: boolean }[];
  consents: { id: string; channel: string; status: string; recordedAt: string }[];
  leads: { id: string; email: string | null; name: string | null; createdAt: string }[];
  enrollments: { id: string; programId: string; programName: string; status: string }[];
  timeline: {
    id: string;
    kind: string;
    label: string;
    occurredAt: string;
    metadata?: Record<string, unknown>;
  }[];
};

type ProgramRow = { id: string; name: string; active: boolean };

export function AudienceWorkspace({
  tapLoopEnabled,
}: {
  initialContactCount: number;
  tapLoopEnabled: boolean;
}) {
  const [q, setQ] = useState("");
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ContactDetail | null>(null);
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [programName, setProgramName] = useState("TapLoop Rewards");
  const [enrollProgramId, setEnrollProgramId] = useState("");
  const [enrollmentId, setEnrollmentId] = useState("");
  const [points, setPoints] = useState("10");
  const [reason, setReason] = useState("Visit award");
  const [idempotencyKey, setIdempotencyKey] = useState(() => `key_${Date.now()}`);
  const [ledger, setLedger] = useState<
    { id: string; type: string; points: number; reason: string; createdAt: string }[]
  >([]);
  const [balance, setBalance] = useState<number | null>(null);

  function search() {
    startTransition(async () => {
      setMessage(null);
      const res = await fetch(`/api/audience/contacts?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Search failed");
        return;
      }
      setContacts(data.contacts ?? []);
    });
  }

  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!tapLoopEnabled) return;
    void fetch("/api/loyalty/programs")
      .then((r) => r.json())
      .then((d) => {
        if (d.programs) {
          setPrograms(d.programs);
          if (d.programs[0]) setEnrollProgramId(d.programs[0].id);
        }
      })
      .catch(() => undefined);
  }, [tapLoopEnabled]);

  function openContact(id: string) {
    setSelectedId(id);
    startTransition(async () => {
      const res = await fetch(`/api/audience/contacts?id=${id}`);
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Load failed");
        return;
      }
      setDetail(data.contact);
      if (data.contact.enrollments?.[0]) {
        setEnrollmentId(data.contact.enrollments[0].id);
      }
    });
  }

  function recordConsent(channel: "EMAIL" | "MARKETING", status: "GRANTED" | "DENIED") {
    if (!selectedId) return;
    startTransition(async () => {
      const res = await fetch("/api/audience/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: selectedId, channel, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Consent failed");
        return;
      }
      setMessage(`Consent ${channel} → ${status}`);
      openContact(selectedId);
    });
  }

  function createProgram() {
    startTransition(async () => {
      const res = await fetch("/api/loyalty/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: programName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Create program failed");
        return;
      }
      setPrograms((p) => [data.program, ...p]);
      setEnrollProgramId(data.program.id);
      setMessage(`Created program ${data.program.name}`);
    });
  }

  function enrollContact() {
    if (!selectedId || !enrollProgramId) return;
    startTransition(async () => {
      const res = await fetch("/api/loyalty/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: enrollProgramId,
          contactId: selectedId,
          relationshipId: detail?.relationships[0]?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Enroll failed");
        return;
      }
      setEnrollmentId(data.enrollment.id);
      setMessage(`Enrolled — id ${data.enrollment.id.slice(0, 8)}`);
      openContact(selectedId);
    });
  }

  function awardOrRedeem(kind: "award" | "redeem") {
    if (!enrollmentId) {
      setMessage("Enroll first");
      return;
    }
    startTransition(async () => {
      const key = idempotencyKey || `key_${Date.now()}`;
      const res = await fetch(`/api/loyalty/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId,
          points: Number(points) || 0,
          reason,
          idempotencyKey: key,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? `${kind} failed`);
        return;
      }
      setBalance(data.balance);
      setMessage(
        `${kind}${data.duplicate ? " (duplicate idempotent)" : ""} → balance ${data.balance}`
      );
      setIdempotencyKey(`key_${Date.now()}`);
      void loadLedger();
    });
  }

  function loadLedger() {
    if (!enrollmentId) return;
    startTransition(async () => {
      const res = await fetch(`/api/loyalty/ledger?enrollmentId=${enrollmentId}`);
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Ledger failed");
        return;
      }
      setLedger(data.entries ?? []);
      setBalance(data.balance);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex gap-2">
          <Input
            placeholder="Search name, email, phone"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") search();
            }}
          />
          <Button type="button" onClick={search} disabled={pending} className="gap-1">
            <Search className="h-4 w-4" />
            Search
          </Button>
        </div>
        <ul className="divide-y divide-border/40 rounded-xl border border-border/60 bg-card/30">
          {contacts.length === 0 ? (
            <li className="px-4 py-6 text-sm text-muted-foreground">
              No contacts match. Capture leads to dual-write contacts.
            </li>
          ) : (
            contacts.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => openContact(c.id)}
                  className={`flex w-full items-start gap-2 px-4 py-3 text-left text-sm hover:bg-muted/40 ${
                    selectedId === c.id ? "bg-primary/10" : ""
                  }`}
                >
                  <User className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium">{c.name || c.email || "Unnamed"}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.email} · {c.leadCount} leads · {c.consentCount} consents
                    </p>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="space-y-4 lg:col-span-3">
        {!detail ? (
          <div className="rounded-xl border border-dashed border-border/60 p-8 text-sm text-muted-foreground">
            Select a contact to view consent, relationships, leads, and TapLoop actions.
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-border/60 bg-card/40 p-4">
              <h2 className="text-lg font-semibold">{detail.name || detail.email || detail.id}</h2>
              <p className="text-sm text-muted-foreground">
                {detail.email} {detail.phone ? `· ${detail.phone}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => recordConsent("EMAIL", "GRANTED")}>
                  Record EMAIL consent
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => recordConsent("MARKETING", "GRANTED")}
                >
                  Record MARKETING consent
                </Button>
                {detail.relationships[0] ? (
                  <Link
                    href={`/mytap/${detail.relationships[0].publicToken}`}
                    target="_blank"
                    className="inline-flex h-8 items-center rounded-lg bg-secondary px-3 text-xs font-medium text-secondary-foreground"
                  >
                    Open MyTap
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 p-4">
                <p className="mb-2 text-sm font-semibold">Consent</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {detail.consents.length === 0 ? (
                    <li>None yet</li>
                  ) : (
                    detail.consents.map((c) => (
                      <li key={c.id}>
                        {c.channel} · {c.status} · {c.recordedAt.slice(0, 10)}
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div className="rounded-xl border border-border/60 p-4">
                <p className="mb-2 text-sm font-semibold">Leads</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {detail.leads.length === 0 ? (
                    <li>None linked</li>
                  ) : (
                    detail.leads.map((l) => (
                      <li key={l.id}>
                        {l.name || l.email} · {l.createdAt.slice(0, 10)}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-primary/20 bg-card/40 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <p className="font-semibold">Contact timeline</p>
              </div>
              {detail.timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Capture a lead or send email via mock adapter to populate timeline events.
                </p>
              ) : (
                <ul className="space-y-2">
                  {detail.timeline.map((event) => (
                    <li
                      key={event.id}
                      className="flex items-start gap-3 rounded-lg border border-border/40 bg-background/40 px-3 py-2"
                    >
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.8)]" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{event.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.occurredAt.slice(0, 19).replace("T", " ")}
                          {typeof event.metadata?.subject === "string"
                            ? ` · ${event.metadata.subject}`
                            : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {detail.relationships[0] ? (
                <Link
                  href={`/dashboard/audience/inbox`}
                  className="mt-3 inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  Open TapInbox threads
                </Link>
              ) : null}
            </div>

            <div className="rounded-xl border border-border/60 bg-card/30 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-primary" />
                  <p className="font-semibold">TapLoop loyalty</p>
                </div>
                <Badge variant={tapLoopEnabled ? "default" : "outline"}>
                  {tapLoopEnabled ? "loyalty.taploop on" : "feature off"}
                </Badge>
              </div>
              {!tapLoopEnabled ? (
                <p className="text-sm text-muted-foreground">
                  Enable <code className="font-mono">loyalty.taploop</code> in Platform Admin to create
                  programs, enroll, award, and redeem.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Input
                      className="max-w-[200px]"
                      value={programName}
                      onChange={(e) => setProgramName(e.target.value)}
                      placeholder="Program name"
                    />
                    <Button type="button" size="sm" onClick={createProgram} disabled={pending}>
                      Create program
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                      value={enrollProgramId}
                      onChange={(e) => setEnrollProgramId(e.target.value)}
                    >
                      <option value="">Program…</option>
                      {programs.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <Button type="button" size="sm" variant="secondary" onClick={enrollContact} disabled={pending}>
                      Enroll contact
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      value={enrollmentId}
                      onChange={(e) => setEnrollmentId(e.target.value)}
                      placeholder="Enrollment id"
                    />
                    <Input value={points} onChange={(e) => setPoints(e.target.value)} placeholder="Points" />
                    <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" />
                    <Input
                      value={idempotencyKey}
                      onChange={(e) => setIdempotencyKey(e.target.value)}
                      placeholder="Idempotency key"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" onClick={() => awardOrRedeem("award")} disabled={pending}>
                      Award
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => awardOrRedeem("redeem")}
                      disabled={pending}
                    >
                      Redeem
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={loadLedger} disabled={pending}>
                      Inspect ledger
                    </Button>
                    {balance !== null ? (
                      <span className="text-sm text-primary">Balance: {balance}</span>
                    ) : null}
                  </div>
                  {ledger.length > 0 ? (
                    <ul className="max-h-48 space-y-1 overflow-auto font-mono text-[11px] text-muted-foreground">
                      {ledger.map((e) => (
                        <li key={e.id}>
                          {e.type} {e.points} · {e.reason} · {e.createdAt.slice(0, 19)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {detail.enrollments.length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Enrollments:{" "}
                      {detail.enrollments.map((e) => `${e.programName}(${e.status})`).join(", ")}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </>
        )}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </div>
    </div>
  );
}
