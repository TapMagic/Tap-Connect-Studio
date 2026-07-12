"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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

export function CampaignActions({
  campaignId,
  status,
}: {
  campaignId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function clone() {
    setLoading("clone");
    setMessage(null);
    try {
      const data = await campaignAction({ action: "clone", campaignId });
      router.push(`/dashboard/campaigns/${data.campaign.id}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Clone failed");
    } finally {
      setLoading(null);
    }
  }

  async function setStatus(next: string) {
    setLoading(next);
    setMessage(null);
    try {
      await campaignAction({ action: "status", campaignId, status: next });
      setMessage(`Marked ${next.toLowerCase()}`);
      router.refresh();
    } catch {
      setMessage("Status update failed");
    } finally {
      setLoading(null);
    }
  }

  async function remove() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setMessage("Click Delete again to confirm — devices will be freed");
      return;
    }
    setConfirmDelete(false);
    setLoading("delete");
    setMessage(null);
    try {
      await campaignAction({ action: "delete", campaignId });
      router.push("/dashboard/campaigns");
      router.refresh();
    } catch {
      setMessage("Delete failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={clone} disabled={!!loading}>
        {loading === "clone" ? "Cloning..." : "Clone"}
      </Button>
      {status !== "ARCHIVED" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStatus("ARCHIVED")}
          disabled={!!loading}
        >
          Archive
        </Button>
      )}
      {status === "ARCHIVED" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStatus("DRAFT")}
          disabled={!!loading}
        >
          Unarchive / Ready
        </Button>
      )}
      {status !== "CLOSED" && (
        <Button variant="ghost" size="sm" onClick={() => setStatus("CLOSED")} disabled={!!loading}>
          Close
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={remove}
        disabled={!!loading}
        className={
          confirmDelete ? "bg-red-500/20 text-red-300" : "text-red-400 hover:text-red-300"
        }
      >
        {loading === "delete" ? "Deleting..." : "Delete"}
      </Button>
      {message && <span className="text-xs text-primary">{message}</span>}
    </div>
  );
}
