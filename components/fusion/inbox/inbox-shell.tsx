"use client";

import { WorkPlatformActions } from "@/components/fusion/connectors/productivity-work-panel";
import { allowedCaseActions, type CaseAction } from "@/lib/fusion/inbox/case-lifecycle";
import {
  guardianReplyBlockedMessage,
  isGuardianBlockedMessage,
  labelGuardianCode,
  replyComposerState,
} from "@/lib/fusion/inbox/guardian-labels";
import { canReopenThread } from "@/lib/fusion/inbox/reply-eligibility";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { KeywordsSuggestPanel } from "@/components/fusion/keywords/keywords-suggest-panel";

type Thread = {
  id: string;
  subject: string | null;
  participant: string | null;
  status: string;
  channel: string;
  lastMessageAt: string;
  messageCount?: number;
  campaignId?: string | null;
  campaignTitle?: string | null;
};

type Attachment = {
  id: string;
  name: string;
  url: string;
  mimeType?: string;
  createdAt: string;
};

type Message = {
  id: string;
  direction: string;
  body: string;
  provider: string;
  guardianCode: string | null;
  createdAt: string;
  attachments?: Attachment[];
};

type CaseRow = {
  id: string;
  subject: string;
  status: string;
  assigneeId: string | null;
};

type Analytics = {
  threads: number;
  openThreads: number;
  replies: number;
  guardianBlocks: number;
  cases: number;
  attachments: number;
  workItems: number;
  timelineEvents: number;
};

type AuditEntry = {
  id: string;
  at: string;
  action: string;
  code?: string;
  detail?: string;
  threadId?: string;
  caseId?: string;
};

type PermittedFallback = {
  hint: string;
  purpose: "support";
};

export function InboxShell({
  initialThreads,
  featureEnabled,
}: {
  initialThreads: Thread[];
  featureEnabled: boolean;
}) {
  const router = useRouter();
  const [threads, setThreads] = useState(initialThreads);
  const [selectedId, setSelectedId] = useState<string | null>(initialThreads[0]?.id ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [reply, setReply] = useState("");
  const [purpose, setPurpose] = useState<"support" | "promo" | "service">("support");
  const [consentGiven, setConsentGiven] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newSubject, setNewSubject] = useState("Support");
  const [newBody, setNewBody] = useState("Hello — how can we help?");
  const [campaignId, setCampaignId] = useState(
    process.env.NEXT_PUBLIC_SEED_CAMPAIGN_ID ?? "cmrx5wjn80001519kzayn9296"
  );
  const [campaignTitle, setCampaignTitle] = useState("[SEED] Welcome Offer");
  const [message, setMessage] = useState<string | null>(null);
  const [fallback, setFallback] = useState<PermittedFallback | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [liveBadge, setLiveBadge] = useState("VERIFIED — CREDENTIALS REQUIRED");
  const [pending, startTransition] = useTransition();

  const selectedThread = threads.find((t) => t.id === selectedId);
  const composer = useMemo(
    () =>
      replyComposerState({
        threadStatus: (selectedThread?.status ?? "OPEN") as "OPEN" | "PENDING" | "CLOSED",
        featureEnabled,
        body: reply,
      }),
    [selectedThread?.status, featureEnabled, reply]
  );

  async function refreshOperator() {
    const res = await fetch("/api/inbox?view=operator");
    const data = await res.json();
    if (data.ok) {
      setAnalytics(data.analytics ?? null);
      setAudit(data.audit ?? []);
      if (data.liveClassification) setLiveBadge(String(data.liveClassification));
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void refreshOperator();
    });
  }, []);

  async function loadThread(id: string) {
    setSelectedId(id);
    setFallback(null);
    const res = await fetch(`/api/inbox?threadId=${id}`);
    const data = await res.json();
    if (data.ok) {
      setMessages(data.messages ?? []);
      setCases(data.cases ?? []);
      if (data.thread) {
        setThreads((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...data.thread } : t))
        );
      }
    }
  }

  async function createThread() {
    setMessage(null);
    setFallback(null);
    startTransition(async () => {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_from_email",
          email: newEmail,
          subject: newSubject,
          body: newBody,
          campaignId: campaignId || undefined,
          campaignTitle: campaignTitle || undefined,
          contactId: process.env.NEXT_PUBLIC_SEED_CONTACT_ID ?? "cmrx5wjn90002519khgib6nsd",
          relationshipId:
            process.env.NEXT_PUBLIC_SEED_RELATIONSHIP_ID ?? "cmrx5yojd0008bv9ksy0yachh",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage(data.error ?? "Failed to create thread");
        return;
      }
      setThreads((prev) => [data.thread, ...prev]);
      setNewEmail("");
      await loadThread(data.thread.id);
      await refreshOperator();
      router.refresh();
    });
  }

  async function sendReply(opts?: { purpose?: "support" | "promo" | "service"; consent?: boolean }) {
    if (!selectedId || !reply.trim()) return;
    setMessage(null);
    const sendPurpose = opts?.purpose ?? purpose;
    const sendConsent = opts?.consent ?? consentGiven;
    startTransition(async () => {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          threadId: selectedId,
          body: reply,
          purpose: sendPurpose,
          consentGiven: sendConsent,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage(
          guardianReplyBlockedMessage({
            code: data.code ?? "blocked",
            error: data.error,
          })
        );
        const fb =
          data.permittedFallback ??
          (data.code === "suppressed" || data.code === "no_consent"
            ? {
                hint:
                  data.code === "suppressed"
                    ? "Remove suppression, then retry as support reply."
                    : "Retry as support purpose (consent not required for email support).",
                purpose: "support" as const,
              }
            : null);
        setFallback(fb);
        await loadThread(selectedId);
        await refreshOperator();
        return;
      }
      setReply("");
      setFallback(null);
      const guardianLabel = labelGuardianCode(data.message?.guardianCode ?? "ok");
      setMessage(
        data.mock
          ? `Reply queued via mock provider · ${guardianLabel}`
          : `Reply sent · ${guardianLabel}`
      );
      await loadThread(selectedId);
      await refreshOperator();
      router.refresh();
    });
  }

  async function openCase() {
    if (!selectedId) return;
    startTransition(async () => {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "open_case",
          threadId: selectedId,
          subject: "Support case",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setCases((prev) => [data.case, ...prev]);
        setMessage("Case opened");
        await refreshOperator();
      }
    });
  }

  async function transitionCaseAction(caseId: string, caseAction: CaseAction) {
    startTransition(async () => {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "transition_case", caseId, caseAction }),
      });
      const data = await res.json();
      if (data.ok) {
        setCases((prev) => prev.map((c) => (c.id === caseId ? data.case : c)));
        setMessage(`Case ${caseAction} → ${data.case.status}`);
      } else {
        setMessage(data.error ?? "Case transition failed");
      }
    });
  }

  async function addMockAttachment() {
    const outbound = [...messages].reverse().find((m) => m.direction === "OUTBOUND");
    if (!outbound || !selectedId) {
      setMessage("Send a reply first — attachments attach to outbound messages");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_attachment",
          messageId: outbound.id,
          name: `note-${Date.now()}.txt`,
          url: `mock://inbox/${selectedId}/note.txt`,
          mimeType: "text/plain",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage(data.error ?? "Attachment failed");
        return;
      }
      setMessage(`Attachment added · ${data.attachment.name}`);
      await loadThread(selectedId);
      await refreshOperator();
    });
  }

  async function runCloseout() {
    setMessage(null);
    startTransition(async () => {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_operator_closeout" }),
      });
      const data = await res.json();
      if (data.analytics) setAnalytics(data.analytics);
      if (data.audit) setAudit(data.audit);
      if (data.liveClassification) setLiveBadge(String(data.liveClassification));
      const passed = data.steps?.filter((s: { ok: boolean }) => s.ok).length ?? 0;
      const total = data.steps?.length ?? 0;
      setMessage(
        data.ok
          ? `Operator closeout PASS · ${passed}/${total}`
          : `Operator closeout FAIL · ${passed}/${total}`
      );
      const list = await fetch("/api/inbox");
      const listData = await list.json();
      if (listData.ok) setThreads(listData.threads ?? []);
      if (data.threadId) await loadThread(data.threadId);
      router.refresh();
    });
  }

  async function closeThreadAction() {
    if (!selectedId) return;
    startTransition(async () => {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close_thread", threadId: selectedId }),
      });
      const data = await res.json();
      if (data.ok) {
        setThreads((prev) =>
          prev.map((t) => (t.id === selectedId ? { ...t, status: data.thread.status } : t))
        );
        setMessage("Thread closed — replies blocked until reopened");
        await refreshOperator();
      }
    });
  }

  async function reopenThreadAction() {
    if (!selectedId || !selectedThread) return;
    setMessage(null);
    startTransition(async () => {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reopen_thread", threadId: selectedId }),
      });
      const data = await res.json();
      if (data.ok) {
        setThreads((prev) =>
          prev.map((t) => (t.id === selectedId ? { ...t, status: data.thread.status } : t))
        );
        setMessage("Thread reopened — replies enabled");
        await refreshOperator();
        return;
      }

      if (
        canReopenThread(selectedThread.status as "OPEN" | "PENDING" | "CLOSED") &&
        (res.status === 404 || res.status >= 500)
      ) {
        setThreads((prev) =>
          prev.map((t) => (t.id === selectedId ? { ...t, status: "OPEN" } : t))
        );
        setMessage("Thread reopened locally — persistence unavailable");
      } else {
        setMessage(data.error ?? "Could not reopen thread");
      }
    });
  }

  const threadClosed = selectedThread?.status === "CLOSED";

  return (
    <div className="space-y-4" data-testid="inbox-shell">
      {!featureEnabled ? (
        <p className="text-sm text-muted-foreground">
          Enable <code className="font-mono">comms.inbox</code> to use TapInbox.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className="border-sky-500/40 text-sky-200"
          data-testid="inbox-live-badge"
        >
          Live transports: {liveBadge}
        </Badge>
        <Button
          size="sm"
          variant="secondary"
          disabled={!featureEnabled || pending}
          onClick={runCloseout}
          data-testid="inbox-run-closeout"
        >
          Run operator closeout
        </Button>
      </div>

      {analytics ? (
        <div
          className="grid gap-2 rounded-xl border border-border/60 bg-card/30 p-3 text-[11px] sm:grid-cols-4"
          data-testid="inbox-analytics"
        >
          <span>Threads {analytics.threads}</span>
          <span>Replies {analytics.replies}</span>
          <span>Guardian blocks {analytics.guardianBlocks}</span>
          <span>Cases {analytics.cases}</span>
          <span>Attachments {analytics.attachments}</span>
          <span>Work items {analytics.workItems}</span>
          <span>Timeline {analytics.timelineEvents}</span>
          <span>Open {analytics.openThreads}</span>
        </div>
      ) : null}

      <KeywordsSuggestPanel surface="inbox" defaultChannel="tapcanvas" />

      <div className="grid gap-3 rounded-xl border border-border/60 bg-card/30 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          placeholder="participant@email.com"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          disabled={!featureEnabled || pending}
          data-testid="inbox-new-email"
        />
        <Input
          placeholder="Subject"
          value={newSubject}
          onChange={(e) => setNewSubject(e.target.value)}
          disabled={!featureEnabled || pending}
          data-testid="inbox-new-subject"
        />
        <Input
          placeholder="Opening message"
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
          disabled={!featureEnabled || pending}
          data-testid="inbox-new-body"
        />
        <Input
          placeholder="Campaign source id"
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          disabled={!featureEnabled || pending}
          data-testid="inbox-campaign-id"
        />
        <Input
          placeholder="Campaign title"
          value={campaignTitle}
          onChange={(e) => setCampaignTitle(e.target.value)}
          disabled={!featureEnabled || pending}
          data-testid="inbox-campaign-title"
        />
        <Button
          disabled={!featureEnabled || pending || !newEmail}
          onClick={createThread}
          data-testid="inbox-create-thread"
        >
          New thread
        </Button>
      </div>

      {message ? (
        <p
          className={`text-sm ${
            message.toLowerCase().includes("blocked") ||
            message.toLowerCase().includes("disabled") ||
            message.toLowerCase().includes("fail") ||
            message.toLowerCase().includes("closed")
              ? "text-amber-500"
              : "text-primary"
          }`}
          data-testid="inbox-status-message"
          role="status"
        >
          {message}
        </p>
      ) : null}

      {fallback ? (
        <div
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
          data-testid="inbox-permitted-fallback"
        >
          <p className="font-medium text-amber-200">Permitted fallback</p>
          <p className="mt-1 text-xs text-muted-foreground">{fallback.hint}</p>
          <Button
            size="sm"
            className="mt-2"
            disabled={pending || !reply.trim()}
            onClick={() => {
              setPurpose("support");
              setConsentGiven(true);
              void sendReply({ purpose: "support", consent: true });
            }}
            data-testid="inbox-fallback-support"
          >
            Retry as support reply
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div
          className="max-h-[480px] overflow-y-auto rounded-xl border border-border/60"
          data-testid="inbox-thread-list"
          tabIndex={0}
          aria-label="Inbox threads"
        >
          {threads.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No threads yet.</p>
          ) : (
            threads.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => loadThread(t.id)}
                data-testid={`inbox-thread-${t.id}`}
                className={`block w-full border-b border-border/40 px-3 py-3 text-left text-sm hover:bg-muted/40 ${
                  selectedId === t.id ? "bg-primary/10" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{t.subject ?? "Untitled"}</span>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {t.status}
                  </Badge>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {t.participant ?? "—"} · {t.channel}
                  {t.campaignTitle ? ` · ${t.campaignTitle}` : ""}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="space-y-3 rounded-xl border border-border/60 p-4" data-testid="inbox-thread-detail">
          {!selectedId ? (
            <p className="text-sm text-muted-foreground">Select a thread</p>
          ) : (
            <>
              {selectedThread ? (
                <p className="text-[11px] text-muted-foreground" data-testid="inbox-thread-meta">
                  Thread {selectedThread.status} · {selectedThread.channel}
                  {selectedThread.campaignTitle
                    ? ` · Campaign: ${selectedThread.campaignTitle}`
                    : ""}{" "}
                  · Guardian runs on every outbound reply
                </p>
              ) : null}

              <div
                className="max-h-64 space-y-2 overflow-y-auto"
                data-testid="inbox-messages"
                tabIndex={0}
                aria-label="Thread messages"
              >
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Load thread to view messages (click again if empty).
                  </p>
                ) : (
                  messages.map((m) => {
                    const blocked = isGuardianBlockedMessage(m);
                    return (
                      <div
                        key={m.id}
                        data-testid={blocked ? "inbox-guardian-block" : `inbox-message-${m.id}`}
                        className={`rounded-lg px-3 py-2 text-sm ${
                          blocked
                            ? "border border-amber-500/40 bg-amber-500/10 mr-6"
                            : m.direction === "OUTBOUND"
                              ? "bg-primary/15 ml-6"
                              : m.direction === "SYSTEM"
                                ? "bg-muted/50 text-muted-foreground"
                                : "bg-muted/30 mr-6"
                        }`}
                      >
                        <p className="text-[10px] uppercase text-muted-foreground">
                          {m.direction} · {m.provider}
                          {m.guardianCode ? ` · ${labelGuardianCode(m.guardianCode)}` : ""}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
                        {m.attachments && m.attachments.length > 0 ? (
                          <ul className="mt-2 space-y-1 text-[10px] text-muted-foreground">
                            {m.attachments.map((a) => (
                              <li key={a.id} data-testid={`inbox-attachment-${a.id}`}>
                                📎 {a.name}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex flex-wrap gap-2 text-[11px]">
                <label className="flex items-center gap-1">
                  Purpose
                  <select
                    className="rounded border border-border/60 bg-background px-2 py-1"
                    value={purpose}
                    onChange={(e) =>
                      setPurpose(e.target.value as "support" | "promo" | "service")
                    }
                    data-testid="inbox-purpose"
                  >
                    <option value="support">support</option>
                    <option value="service">service</option>
                    <option value="promo">promo</option>
                  </select>
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                    data-testid="inbox-consent"
                  />
                  Consent given
                </label>
              </div>

              <Textarea
                placeholder={
                  composer.allowed
                    ? "Reply… (Channel Guardian enforced)"
                    : composer.hint
                }
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                disabled={!composer.allowed || pending}
                rows={3}
                data-testid="inbox-reply-composer"
              />
              <p className="text-[10px] text-muted-foreground" data-testid="inbox-composer-hint">
                {composer.hint}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={!composer.allowed || pending || !reply.trim()}
                  onClick={() => void sendReply()}
                  data-testid="inbox-send-reply"
                >
                  Send reply
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!featureEnabled || pending}
                  onClick={openCase}
                  data-testid="inbox-open-case"
                >
                  Open case
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!featureEnabled || pending || !selectedId}
                  onClick={addMockAttachment}
                  data-testid="inbox-add-attachment"
                >
                  Add attachment
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!featureEnabled || pending || threadClosed}
                  onClick={closeThreadAction}
                  data-testid="inbox-close-thread"
                >
                  Close thread
                </Button>
                {threadClosed ? (
                  <Button
                    size="sm"
                    variant="default"
                    disabled={!featureEnabled || pending}
                    onClick={reopenThreadAction}
                    data-testid="inbox-reopen-thread"
                  >
                    Reopen thread
                  </Button>
                ) : null}
                <WorkPlatformActions
                  defaultTitle={`Inbox follow-up: ${selectedThread?.subject ?? "thread"}`}
                  sourceType="inbox_followup"
                  sourceId={selectedId ?? undefined}
                />
              </div>

              {cases.length > 0 ? (
                <div
                  className="space-y-2 border-t border-border/40 pt-3"
                  data-testid="inbox-tapcase-list"
                >
                  <p className="text-xs font-semibold uppercase text-muted-foreground">TapCase</p>
                  {cases.map((c) => (
                    <div
                      key={c.id}
                      className="space-y-1 rounded-lg border border-border/40 p-2 text-sm"
                      data-testid={`inbox-case-${c.id}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>
                          {c.subject}{" "}
                          <Badge variant="outline" className="ml-1 text-[10px]">
                            {c.status}
                          </Badge>
                          {c.assigneeId ? (
                            <span className="ml-2 text-[10px] text-muted-foreground">
                              assignee {c.assigneeId.slice(0, 8)}…
                            </span>
                          ) : null}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {allowedCaseActions(
                          c.status as Parameters<typeof allowedCaseActions>[0]
                        ).map((a) => (
                          <Button
                            key={a}
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[10px] capitalize"
                            onClick={() => transitionCaseAction(c.id, a)}
                            data-testid={`inbox-case-action-${a}`}
                          >
                            {a.replace("_", " ")}
                          </Button>
                        ))}
                        <WorkPlatformActions
                          defaultTitle={`TapCase → ${c.subject}`}
                          sourceType="tapcase"
                          sourceId={c.id}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      {audit.length > 0 ? (
        <div
          className="rounded-xl border border-border/60 p-3"
          data-testid="inbox-audit-log"
        >
          <p className="text-xs font-semibold uppercase text-muted-foreground">Audit</p>
          <ul
            className="mt-2 max-h-40 space-y-1 overflow-y-auto text-[11px] text-muted-foreground"
            tabIndex={0}
            aria-label="Inbox operator audit log"
          >
            {audit.slice(0, 12).map((e) => (
              <li key={e.id}>
                {e.at.slice(11, 19)} · {e.action}
                {e.code ? ` · ${e.code}` : ""}
                {e.detail ? ` · ${e.detail}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
