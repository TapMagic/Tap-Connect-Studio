"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
        setMessage(data.error ?? "Reply blocked");
        return;
      }
      setReply("");
      setMessage(data.mock ? "Reply queued via mock provider" : "Reply sent");
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

  async function closeCase(caseId: string) {
    startTransition(async () => {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close_case", caseId }),
      });
      const data = await res.json();
      if (data.ok) {
        setCases((prev) => prev.map((c) => (c.id === caseId ? data.case : c)));
      }
    });
  }

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

      {message ? <p className="text-sm text-primary">{message}</p> : null}

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
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Load thread to view messages (click again if empty).
                  </p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-lg px-3 py-2 text-sm ${
                        m.direction === "OUTBOUND"
                          ? "bg-primary/15 ml-6"
                          : m.direction === "SYSTEM"
                            ? "bg-muted/50 text-muted-foreground"
                            : "bg-muted/30 mr-6"
                      }`}
                    >
                      <p className="text-[10px] uppercase text-muted-foreground">
                        {m.direction} · {m.provider}
                        {m.guardianCode ? ` · ${m.guardianCode}` : ""}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
                    </div>
                  ))
                )}
              </div>

              <Textarea
                placeholder="Reply… (Channel Guardian enforced)"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                disabled={!featureEnabled || pending}
                rows={3}
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={!featureEnabled || pending} onClick={sendReply}>
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
              </div>

              {cases.length > 0 ? (
                <div className="space-y-2 border-t border-border/40 pt-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">TapCase</p>
                  {cases.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <span>
                        {c.subject}{" "}
                        <Badge variant="outline" className="ml-1 text-[10px]">
                          {c.status}
                        </Badge>
                      </span>
                      {c.status !== "CLOSED" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => closeCase(c.id)}
                        >
                          Close
                        </Button>
                      ) : null}
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
