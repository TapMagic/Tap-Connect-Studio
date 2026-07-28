"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CASE_ACTION_COPY,
  CASE_QUEUE_VIEWS,
  CASE_STATUS_LABEL,
  allowedCaseActionsForUi,
  caseMatchesQueueView,
  type CaseAction,
  type CaseQueueView,
  type CaseStatus,
} from "@/lib/fusion/inbox/case-lifecycle";
import {
  parseCaseMetadata,
  type CaseInternalNote,
  type TapCaseMetadata,
} from "@/lib/fusion/inbox/case-metadata";
import { describeSyncHealth } from "@/lib/fusion/inbox/external-work-sync";
import { WorkPlatformActions } from "@/components/fusion/connectors/productivity-work-panel";
import { cn } from "@/lib/utils";

export type CaseListItem = {
  id: string;
  subject: string;
  status: string;
  priority: number;
  assigneeId: string | null;
  contactId: string | null;
  threadId: string | null;
  openedAt: string;
  closedAt: string | null;
  metadata: unknown;
  contactName?: string | null;
  contactEmail?: string | null;
};

export function CaseOperationsWorkspace({
  cases: initial,
  currentUserId,
}: {
  cases: CaseListItem[];
  currentUserId: string;
}) {
  const [cases, setCases] = useState(initial);
  const [view, setView] = useState<CaseQueueView>("new");
  const [selectedId, setSelectedId] = useState<string | null>(initial[0]?.id ?? null);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selected = cases.find((c) => c.id === selectedId) ?? null;
  const meta: TapCaseMetadata = selected ? parseCaseMetadata(selected.metadata) : {};

  const [nowMs] = useState(() => Date.now());

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      const m = parseCaseMetadata(c.metadata);
      if (m.testGenerated) return false;
      return caseMatchesQueueView(c.status as CaseStatus, view, {
        waitKind: m.waitKind,
        readyToClose: m.readyToClose,
        dueAt: m.dueAt,
        externalWork: m.externalWork,
        assigneeId: c.assigneeId,
        currentUserId,
      });
    });
  }, [cases, view, currentUserId]);

  async function transition(action: CaseAction) {
    if (!selected) return;
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "transition_case",
          caseId: selected.id,
          caseAction: action,
          assigneeId: currentUserId,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error ?? "Transition failed");
        return;
      }
      setCases((prev) =>
        prev.map((c) =>
          c.id === selected.id
            ? {
                ...c,
                status: json.case.status,
                assigneeId: json.case.assigneeId,
                closedAt: json.case.closedAt,
              }
            : c
        )
      );
      setMessage(`${CASE_ACTION_COPY[action].label} · ${CASE_ACTION_COPY[action].explanation}`);
    } finally {
      setPending(false);
    }
  }

  async function addNote() {
    if (!selected || !note.trim()) return;
    setPending(true);
    try {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_case_note",
          caseId: selected.id,
          body: note.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error ?? "Could not save note");
        return;
      }
      setNote("");
      setMessage("Internal note saved — never sent to the customer.");
      // Optimistic: refresh metadata notes locally
      const existing = parseCaseMetadata(selected.metadata);
      const notes: CaseInternalNote[] = [
        ...(existing.internalNotes ?? []),
        {
          id: json.note.id,
          body: json.note.body,
          createdAt: json.note.createdAt,
          internal: true,
        },
      ];
      setCases((prev) =>
        prev.map((c) =>
          c.id === selected.id
            ? { ...c, metadata: { ...existing, internalNotes: notes } }
            : c
        )
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4 p-4 sm:p-6" data-testid="case-operations-workspace">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            <Link href="/dashboard/audience" className="hover:text-[oklch(0.82_0.11_42)] hover:underline">
              Audience
            </Link>{" "}
            / Cases
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Cases</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Track customer issues from Card conversations. Internal notes stay private. External work
            links show mock vs live honestly.
          </p>
        </div>
        <Link
          href="/dashboard/audience/inbox"
          className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5"
        >
          Open Inbox
        </Link>
      </header>

      <div className="flex flex-wrap gap-1" data-testid="case-queue-views" role="tablist">
        {CASE_QUEUE_VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={view === v.id}
            title={v.help}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              view === v.id
                ? "border-[oklch(0.66_0.12_42_/_0.55)] bg-[oklch(0.66_0.12_42_/_0.15)] text-[oklch(0.88_0.09_42)]"
                : "border-white/10 text-white/65 hover:bg-white/5"
            )}
            onClick={() => setView(v.id)}
            data-testid={`case-queue-${v.id}`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <ul
          className="divide-y divide-white/8 overflow-hidden rounded-xl border border-white/10"
          data-testid="case-queue-list"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-white/50" data-testid="case-queue-empty">
              No cases in this view.{" "}
              {view === "new"
                ? "Open a case from Inbox when a customer needs follow-up."
                : "Try another queue filter."}
            </li>
          ) : (
            filtered.map((c) => {
              const m = parseCaseMetadata(c.metadata);
              const ageHrs = Math.max(
                0,
                Math.round((nowMs - new Date(c.openedAt).getTime()) / 36e5)
              );
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full flex-col gap-1 border-l-2 border-transparent px-4 py-3 text-left transition-colors hover:bg-white/[0.03]",
                      selectedId === c.id &&
                        "border-l-[oklch(0.66_0.12_42)] bg-[oklch(0.66_0.12_42_/_0.1)]"
                    )}
                    aria-pressed={selectedId === c.id}
                    onClick={() => setSelectedId(c.id)}
                    data-testid={`case-row-${c.id}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-white">
                        {c.contactName || c.contactEmail || "Customer"} · {c.subject}
                      </span>
                      <span className="shrink-0 text-[10px] uppercase text-white/45">
                        {CASE_STATUS_LABEL[c.status as CaseStatus] ?? c.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/45">
                      Priority {c.priority} · age {ageHrs}h
                      {m.dueAt ? ` · due ${new Date(m.dueAt).toLocaleDateString()}` : ""}
                      {m.externalWork
                        ? ` · ${describeSyncHealth(m.externalWork)}`
                        : ""}
                      {m.sourceCampaign ? ` · ${m.sourceCampaign}` : ""}
                    </p>
                  </button>
                </li>
              );
            })
          )}
        </ul>

        <aside
          className="rounded-xl border border-white/10 bg-[#080d18] p-4"
          data-testid="case-detail-panel"
        >
          {!selected ? (
            <p className="text-sm text-white/50">Select a case to review details and next actions.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[oklch(0.88_0.09_42)]">
                  Case detail
                </p>
                <h2 className="text-sm font-semibold text-white">{selected.subject}</h2>
                <p className="mt-1 text-xs text-white/55">
                  {selected.contactName || selected.contactEmail || "Unknown customer"}
                  {selected.threadId ? (
                    <>
                      {" · "}
                      <Link
                        href="/dashboard/audience/inbox"
                        className="text-[oklch(0.82_0.11_42)] underline underline-offset-2 hover:opacity-90"
                      >
                        Open conversation
                      </Link>
                    </>
                  ) : null}
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-2 text-[11px] text-white/70">
                <div>
                  <dt className="text-white/55">Status</dt>
                  <dd>
                    {CASE_STATUS_LABEL[selected.status as CaseStatus] ?? selected.status}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/55">Priority</dt>
                  <dd>{selected.priority}</dd>
                </div>
                <div>
                  <dt className="text-white/55">Owner</dt>
                  <dd>{selected.assigneeId ? selected.assigneeId.slice(0, 10) : "Unassigned"}</dd>
                </div>
                <div>
                  <dt className="text-white/55">Source</dt>
                  <dd>
                    {[meta.sourceCard, meta.sourceTapPoint, meta.sourceCampaign]
                      .filter(Boolean)
                      .join(" · ") || "Card / Inbox"}
                  </dd>
                </div>
              </dl>

              <div>
                <p className="text-xs font-medium text-white/80">Next actions</p>
                <p className="mt-0.5 text-[10px] text-white/45">
                  Hover a button to see what the transition does. Invalid moves stay hidden.
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {allowedCaseActionsForUi(selected.status as CaseStatus).map((a) => (
                    <Button
                      key={a}
                      size="sm"
                      variant="outline"
                      className="h-8 text-[11px]"
                      disabled={pending}
                      title={CASE_ACTION_COPY[a].explanation}
                      onClick={() => void transition(a)}
                      data-testid={`case-detail-action-${a}`}
                    >
                      {CASE_ACTION_COPY[a].label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-white/80">Internal notes</p>
                <p className="mt-0.5 text-[10px] text-amber-200/80">
                  Never sent to the customer — operators only.
                </p>
                <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-[11px] text-white/65">
                  {(meta.internalNotes ?? []).length === 0 ? (
                    <li className="text-white/55">No internal notes yet.</li>
                  ) : (
                    (meta.internalNotes ?? []).map((n) => (
                      <li
                        key={n.id}
                        className="rounded border border-white/8 bg-black/30 px-2 py-1"
                        data-testid="case-internal-note"
                      >
                        {n.body}
                        <span className="mt-0.5 block text-[10px] text-white/50">
                          {new Date(n.createdAt).toLocaleString()}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
                <Textarea
                  className="mt-2 min-h-[64px] bg-black/40 text-xs"
                  placeholder="Add an internal note…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  data-testid="case-note-input"
                />
                <Button
                  size="sm"
                  className="mt-2"
                  disabled={pending || !note.trim()}
                  onClick={() => void addNote()}
                  data-testid="case-note-save"
                >
                  Save internal note
                </Button>
              </div>

              <div>
                <p className="text-xs font-medium text-white/80">External work</p>
                <p className="mt-0.5 text-[10px] text-white/45">
                  {describeSyncHealth(meta.externalWork)}
                </p>
                <div className="mt-2">
                  <WorkPlatformActions
                    defaultTitle={`Case → ${selected.subject}`}
                    sourceType="tapcase"
                    sourceId={selected.id}
                    mode={meta.externalWork?.mode ?? "mock"}
                    providerLabel={meta.externalWork?.provider}
                  />
                </div>
              </div>

              {message ? (
                <p className="text-xs text-[oklch(0.82_0.11_42)]" data-testid="case-ops-message" role="status">
                  {message}
                </p>
              ) : null}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
