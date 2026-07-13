"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Download, StickyNote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type LeadRow = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  campaignTitle: string | null;
  deviceLabel: string | null;
  consentGiven: boolean;
  couponClaimed: boolean;
  createdLabel: string;
  notes: string;
  contacted: boolean;
  archived: boolean;
};

const TABS = [
  { id: "ALL", label: "All" },
  { id: "NEW", label: "New" },
  { id: "CONTACTED", label: "Contacted" },
  { id: "COUPON", label: "Coupon claimed" },
  { id: "ARCHIVED", label: "Archived" },
] as const;

export function LeadsManager({ leads: initial }: { leads: LeadRow[] }) {
  const router = useRouter();
  const [leads, setLeads] = useState(initial);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("ALL");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (tab === "NEW" && (l.contacted || l.archived)) return false;
      if (tab === "CONTACTED" && !l.contacted) return false;
      if (tab === "COUPON" && !l.couponClaimed) return false;
      if (tab === "ARCHIVED" && !l.archived) return false;
      if (tab !== "ARCHIVED" && l.archived && tab !== "ALL") return false;
      if (tab === "ALL" && l.archived) return false;
      if (!q) return true;
      return (
        (l.name ?? "").toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        (l.phone ?? "").toLowerCase().includes(q) ||
        (l.campaignTitle ?? "").toLowerCase().includes(q)
      );
    });
  }, [leads, tab, query]);

  async function patch(leadId: string, body: Record<string, unknown>) {
    setBusy(leadId);
    setMessage(null);
    const res = await fetch("/api/crm/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, ...body }),
    });
    setBusy(null);
    if (!res.ok) {
      setMessage("Update failed");
      return false;
    }
    router.refresh();
    return true;
  }

  async function toggleContacted(lead: LeadRow) {
    const next = !lead.contacted;
    setLeads((list) =>
      list.map((l) => (l.id === lead.id ? { ...l, contacted: next } : l))
    );
    const ok = await patch(lead.id, { contacted: next });
    if (!ok) {
      setLeads((list) =>
        list.map((l) => (l.id === lead.id ? { ...l, contacted: lead.contacted } : l))
      );
    } else {
      setMessage(next ? "Marked contacted" : "Marked new");
    }
  }

  async function saveNotes(lead: LeadRow, notes: string) {
    setLeads((list) => list.map((l) => (l.id === lead.id ? { ...l, notes } : l)));
    const ok = await patch(lead.id, { notes });
    if (ok) setMessage("Notes saved");
  }

  async function archive(lead: LeadRow) {
    setLeads((list) =>
      list.map((l) => (l.id === lead.id ? { ...l, archived: true } : l))
    );
    await patch(lead.id, { archived: true });
    setMessage("Lead archived");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium",
                tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Search name, email, campaign…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-xs"
          />
          <a href="/api/crm/leads?format=csv">
            <Button variant="outline" size="sm">
              <Download className="mr-1 h-3.5 w-3.5" />
              CSV
            </Button>
          </a>
        </div>
      </div>

      {message && <p className="text-sm text-primary">{message}</p>}

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            No leads in this view.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {filtered.length} lead{filtered.length === 1 ? "" : "s"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filtered.map((lead) => (
              <div
                key={lead.id}
                className="rounded-lg border border-border/50 px-3 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{lead.name ?? lead.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {lead.email}
                      {lead.phone ? ` · ${lead.phone}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {lead.campaignTitle ?? "—"} · {lead.deviceLabel ?? "—"} ·{" "}
                      {lead.createdLabel}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {lead.contacted && <Badge variant="outline">contacted</Badge>}
                    {lead.couponClaimed && <Badge variant="outline">coupon</Badge>}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!!busy}
                      onClick={() => void toggleContacted(lead)}
                    >
                      <Check className="mr-1 h-3.5 w-3.5" />
                      {lead.contacted ? "Undo contacted" : "Mark contacted"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExpanded(expanded === lead.id ? null : lead.id)
                      }
                    >
                      <StickyNote className="mr-1 h-3.5 w-3.5" />
                      Notes
                    </Button>
                    {!lead.archived && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() => void archive(lead)}
                      >
                        Archive
                      </Button>
                    )}
                  </div>
                </div>
                {expanded === lead.id && (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      defaultValue={lead.notes}
                      placeholder="Add a note about this lead…"
                      rows={3}
                      id={`notes-${lead.id}`}
                    />
                    <Button
                      size="sm"
                      disabled={!!busy}
                      onClick={() => {
                        const el = document.getElementById(
                          `notes-${lead.id}`
                        ) as HTMLTextAreaElement | null;
                        void saveNotes(lead, el?.value ?? "");
                      }}
                    >
                      Save notes
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
