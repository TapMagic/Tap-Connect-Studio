"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type Snippet = {
  id: string;
  title: string;
  body: string;
  source: string;
  tags?: string[];
};

export function KnowledgeSnippetsPanel({
  initialSnippets,
}: {
  initialSnippets: Snippet[];
}) {
  const [snippets, setSnippets] = useState(initialSnippets);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      const res = await fetch("/api/ai/knowledge");
      const data = await res.json();
      if (res.ok && data.snippets) setSnippets(data.snippets);
    });
  }

  function addSnippet() {
    if (!title.trim() || !body.trim()) return;
    startTransition(async () => {
      setMessage(null);
      const res = await fetch("/api/ai/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, source: "manual" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ? "Save failed" : "Save failed");
        return;
      }
      setTitle("");
      setBody("");
      setMessage("Knowledge snippet saved");
      refresh();
    });
  }

  function seedBrand() {
    startTransition(async () => {
      setMessage(null);
      const res = await fetch("/api/ai/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "seed_brand",
          businessName: "Workspace brand",
          voice: "Clear, confident, neon-lime Tap Connect tone",
          tagline: "Tap. Connect. Convert.",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage("Seed failed");
        return;
      }
      setMessage(`Seeded ${data.snippets?.length ?? 0} brand snippets`);
      refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await fetch(`/api/ai/knowledge?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setSnippets((prev) => prev.filter((s) => s.id !== id));
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={seedBrand}>
          Seed brand kit
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={refresh}>
          Refresh
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Knowledge snippet title"
        />
        <Textarea
          placeholder="Approved knowledge body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-[72px] sm:col-span-2"
          aria-label="Knowledge snippet body"
        />
        <Button type="button" size="sm" disabled={pending} onClick={addSnippet}>
          Add snippet
        </Button>
      </div>
      <ul className="divide-y divide-border/40 rounded-lg border border-border/60">
        {snippets.length === 0 ? (
          <li className="px-3 py-4 text-sm text-muted-foreground">No Knowledge snippets yet.</li>
        ) : (
          snippets.map((s) => (
            <li key={s.id} className="flex flex-wrap items-start justify-between gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{s.title}</p>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {s.source}
                  </Badge>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{s.body}</p>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => remove(s.id)}>
                Remove
              </Button>
            </li>
          ))
        )}
      </ul>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
