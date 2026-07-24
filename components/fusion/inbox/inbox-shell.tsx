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
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Thread = {
  id: string;
  subject: string | null;
  participant: string | null;
  status: string;
  channel: string;
  lastMessageAt: string;
  messageCount?: number;
};

type Message = {
  id: string;
  direction: string;
  body: string;
  provider: string;
  guardianCode: string | null;
  createdAt: string;
};

type CaseRow = {
  id: string;
  subject: string;
  status: string;
  assigneeId: string | null;
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
  const [newEmail, setNewEmail] = useState("");
  const [newSubject, setNewSubject] = useState("Support");
  const [newBody, setNewBody] = useState("Hello — how can we help?");
  const [message, setMessage] = useState<string | null>(null);
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

  async function loadThread(id: string) {
    setSelectedId(id);
    const res = await fetch(`/api/inbox?threadId=${id}`);
    const data = await res.json();
    if (data.ok) {
      setMessages(data.messages ?? []);
      setCases(data.cases ?? []);
    }
  }

  async function createThread() {
    setMessage(null);
    startTransition(async () => {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_from_email",
          email: newEmail,
          subject: newSubject,
          body: newBody,
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
      router.refresh();
    });
  }

  async function sendReply() {
    if (!selectedId || !reply.trim()) return;
    setMessage(null);
    startTransition(async () => {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          threadId: selectedId,
          body: reply,
          purpose: "support",
          consentGiven: true,
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
        return;
      }
      setReply("");
      const guardianLabel = labelGuardianCode(data.message?.guardianCode ?? "ok");
      setMessage(
        data.mock
          ? `Reply queued via mock provider · ${guardianLabel}`
          : `Reply sent · ${guardianLabel}`
      );
      await loadThread(selectedId);
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
    <div className="space-y-4">
      {!featureEnabled ? (
        <p className="text-sm text-muted-foreground">
          Enable <code className="font-mono">comms.inbox</code> to use TapInbox.
        </p>
      ) : null}

      <div className="grid gap-3 rounded-xl border border-border/60 bg-card/30 p-4 sm:grid-cols-4">
        <Input
          placeholder="participant@email.com"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          disabled={!featureEnabled || pending}
        />
        <Input
          placeholder="Subject"
          value={newSubject}
          onChange={(e) => setNewSubject(e.target.value)}
          disabled={!featureEnabled || pending}
        />
        <Input
          placeholder="Opening message"
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
          disabled={!featureEnabled || pending}
        />
        <Button
          disabled={!featureEnabled || pending || !newEmail}
          onClick={createThread}
        >
          New thread
        </Button>
      </div>

      {message ? (
        <p
          className={`text-sm ${
            message.toLowerCase().includes("blocked") ||
            message.toLowerCase().includes("disabled") ||
            message.toLowerCase().includes("closed")
              ? "text-amber-500"
              : "text-primary"
          }`}
        >
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="max-h-[480px] overflow-y-auto rounded-xl border border-border/60">
          {threads.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No threads yet.</p>
          ) : (
            threads.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => loadThread(t.id)}
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
                </p>
              </button>
            ))
          )}
        </div>

        <div className="space-y-3 rounded-xl border border-border/60 p-4">
          {!selectedId ? (
            <p className="text-sm text-muted-foreground">Select a thread</p>
          ) : (
            <>
              {selectedThread ? (
                <p className="text-[11px] text-muted-foreground">
                  Thread {selectedThread.status} · {selectedThread.channel} · Guardian runs on
                  every outbound reply
                </p>
              ) : null}

              <div className="max-h-64 space-y-2 overflow-y-auto">
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
                      </div>
                    );
                  })
                )}
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
              />
              <p className="text-[10px] text-muted-foreground">{composer.hint}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={!composer.allowed || pending || !reply.trim()}
                  onClick={sendReply}
                >
                  Send reply
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!featureEnabled || pending}
                  onClick={openCase}
                >
                  Open case
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!featureEnabled || pending || threadClosed}
                  onClick={closeThreadAction}
                >
                  Close thread
                </Button>
                {threadClosed ? (
                  <Button
                    size="sm"
                    variant="default"
                    disabled={!featureEnabled || pending}
                    onClick={reopenThreadAction}
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
                <div className="space-y-2 border-t border-border/40 pt-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">TapCase</p>
                  {cases.map((c) => (
                    <div key={c.id} className="space-y-1 rounded-lg border border-border/40 p-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span>
                          {c.subject}{" "}
                          <Badge variant="outline" className="ml-1 text-[10px]">
                            {c.status}
                          </Badge>
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {allowedCaseActions(c.status as Parameters<typeof allowedCaseActions>[0]).map(
                          (a) => (
                            <Button
                              key={a}
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-[10px] capitalize"
                              onClick={() => transitionCaseAction(c.id, a)}
                            >
                              {a.replace("_", " ")}
                            </Button>
                          )
                        )}
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
    </div>
  );
}
