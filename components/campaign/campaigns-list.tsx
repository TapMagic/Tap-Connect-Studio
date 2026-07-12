"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Pause,
  PenLine,
  Play,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type CampaignListItem = {
  id: string;
  title: string;
  status: string;
  campaignType: string;
  assignmentCount: number;
  leadCount: number;
  updatedLabel: string;
  deviceCodes: string[];
  deviceNicknames: string[];
};

const TABS = [
  { id: "ALL", label: "All" },
  { id: "DRAFT", label: "Draft" },
  { id: "READY", label: "Ready" },
  { id: "SCHEDULED", label: "Scheduled" },
  { id: "LIVE", label: "Live" },
  { id: "PAUSED", label: "Paused" },
  { id: "ARCHIVED", label: "Archived" },
  { id: "CLOSED", label: "Closed" },
] as const;

async function campaignAction(body: Record<string, unknown>) {
  const res = await fetch("/api/campaigns/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Action failed");
  return data;
}

export function CampaignsList({
  campaigns: initial,
  campaignLimit,
}: {
  campaigns: CampaignListItem[];
  campaignLimit: number;
}) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState(initial);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("ALL");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    setCampaigns(initial);
  }, [initial]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: campaigns.length };
    for (const c of campaigns) {
      map[c.status] = (map[c.status] ?? 0) + 1;
    }
    return map;
  }, [campaigns]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return campaigns.filter((c) => {
      if (tab !== "ALL" && c.status !== tab) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.campaignType.toLowerCase().includes(q) ||
        c.deviceNicknames.some((n) => n.toLowerCase().includes(q)) ||
        c.deviceCodes.some((code) => code.toLowerCase().includes(q))
      );
    });
  }, [campaigns, tab, query]);

  const activeCount = campaigns.filter((c) => !["ARCHIVED", "CLOSED"].includes(c.status)).length;

  async function run(id: string, label: string, fn: () => Promise<void>) {
    setBusy(id + label);
    setMessage(null);
    setOpenMenu(null);
    try {
      await fn();
      router.refresh();
      return true;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function archive(id: string) {
    const prev = campaigns;
    setCampaigns((list) =>
      list.map((c) =>
        c.id === id
          ? {
              ...c,
              status: "ARCHIVED",
              deviceCodes: [],
              deviceNicknames: [],
              assignmentCount: 0,
            }
          : c
      )
    );
    const ok = await run(id, "archive", async () => {
      await campaignAction({ action: "archive", campaignId: id });
      setMessage("Campaign archived — devices freed");
      setTab("ARCHIVED");
    });
    if (!ok) setCampaigns(prev);
  }

  async function remove(id: string) {
    if (confirmId !== id) {
      setConfirmId(id);
      setMessage("Click Delete again to permanently remove this campaign");
      return;
    }
    setConfirmId(null);
    const prev = campaigns;
    setCampaigns((list) => list.filter((c) => c.id !== id));
    const ok = await run(id, "delete", async () => {
      await campaignAction({ action: "delete", campaignId: id });
      setMessage("Campaign deleted");
    });
    if (!ok) setCampaigns(prev);
  }

  async function setStatus(id: string, status: string) {
    const prev = campaigns;
    setCampaigns((list) => list.map((c) => (c.id === id ? { ...c, status } : c)));
    const ok = await run(id, status, async () => {
      await campaignAction({ action: "status", campaignId: id, status });
      setMessage(`Marked ${status.toLowerCase()}`);
    });
    if (!ok) setCampaigns(prev);
  }

  function clone(id: string) {
    void run(id, "clone", async () => {
      const data = await campaignAction({ action: "clone", campaignId: id });
      setMessage("Clone created");
      router.push(`/dashboard/campaigns/${data.campaign.id}`);
    });
  }

  async function restore(id: string) {
    const prev = campaigns;
    setCampaigns((list) => list.map((c) => (c.id === id ? { ...c, status: "DRAFT" } : c)));
    const ok = await run(id, "restore", async () => {
      await campaignAction({ action: "restore", campaignId: id });
      setMessage("Restored as draft");
      setTab("DRAFT");
    });
    if (!ok) setCampaigns(prev);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {activeCount} active of {campaignLimit} plan limit · {campaigns.length} total
        </p>
        <Input
          placeholder="Search title, type, or device…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
            <span className="ml-1 opacity-70">{counts[t.id] ?? 0}</span>
          </button>
        ))}
      </div>

      {message && <p className="text-sm text-primary">{message}</p>}

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {campaigns.length === 0
                ? "No campaigns yet. Start in the Workbench."
                : "No campaigns in this tab."}
            </p>
            <Link
              href="/dashboard/workbench"
              className="mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Open Workbench
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((c) => {
            const previewHref =
              c.deviceCodes[0] != null ? `/t/${c.deviceCodes[0]}` : null;
            return (
              <Card key={c.id} className="border-border/60">
                <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                  <div className="min-w-0">
                    <CardTitle className="text-lg">
                      <Link href={`/dashboard/campaigns/${c.id}`} className="hover:text-primary">
                        {c.title}
                      </Link>
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <span className="capitalize">
                        {c.campaignType.replace(/_/g, " ").toLowerCase()}
                      </span>
                      {" · "}
                      {c.assignmentCount} devices · {c.leadCount} leads · Updated {c.updatedLabel}
                    </p>
                    {c.deviceNicknames.length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        On: {c.deviceNicknames.join(", ")}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline">{c.status.toLowerCase()}</Badge>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2">
                  <Link href={`/dashboard/campaigns/${c.id}`}>
                    <Button variant="default" size="sm">
                      <PenLine className="mr-1 h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </Link>
                  {previewHref ? (
                    <a href={previewHref} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <ExternalLink className="mr-1 h-3.5 w-3.5" />
                        Preview
                      </Button>
                    </a>
                  ) : (
                    <Button variant="outline" size="sm" disabled title="Assign a device to preview">
                      Preview
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!!busy}
                    onClick={() => clone(c.id)}
                  >
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    Clone
                  </Button>
                  {c.status !== "ARCHIVED" && c.status !== "CLOSED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!!busy}
                      onClick={() => void archive(c.id)}
                    >
                      <Archive className="mr-1 h-3.5 w-3.5" />
                      Archive
                    </Button>
                  )}
                  {(c.status === "ARCHIVED" || c.status === "CLOSED") && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!!busy}
                      onClick={() => void restore(c.id)}
                    >
                      Restore
                    </Button>
                  )}
                  {c.status === "LIVE" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!!busy}
                      onClick={() => void setStatus(c.id, "PAUSED")}
                    >
                      <Pause className="mr-1 h-3.5 w-3.5" />
                      Pause
                    </Button>
                  )}
                  {c.status === "PAUSED" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!!busy}
                      onClick={() => void setStatus(c.id, "LIVE")}
                    >
                      <Play className="mr-1 h-3.5 w-3.5" />
                      Resume
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!!busy}
                    className={
                      confirmId === c.id
                        ? "bg-red-500/20 text-red-300"
                        : "text-red-400 hover:text-red-300"
                    }
                    onClick={() => void remove(c.id)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete
                  </Button>
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setOpenMenu(openMenu === c.id ? null : c.id)}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    {openMenu === c.id && (
                      <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-border bg-card p-1 shadow-lg">
                        <button
                          type="button"
                          className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                          onClick={() => void setStatus(c.id, "READY")}
                        >
                          Mark ready
                        </button>
                        <button
                          type="button"
                          className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                          onClick={() => void setStatus(c.id, "CLOSED")}
                        >
                          Mark complete / closed
                        </button>
                        <Link
                          href={`/dashboard/campaigns/${c.id}`}
                          className="block rounded-md px-3 py-2 text-sm hover:bg-accent"
                          onClick={() => setOpenMenu(null)}
                        >
                          Assign / publish
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
