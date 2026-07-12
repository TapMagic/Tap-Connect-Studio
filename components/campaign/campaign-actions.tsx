"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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

  async function clone() {
    setLoading("clone");
    setMessage(null);
    const res = await fetch("/api/campaigns/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId }),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setMessage(data.error ?? "Clone failed");
      return;
    }
    router.push(`/dashboard/campaigns/${data.campaign.id}`);
  }

  async function setStatus(next: string) {
    setLoading(next);
    setMessage(null);
    const res = await fetch("/api/campaigns/actions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, status: next }),
    });
    setLoading(null);
    if (!res.ok) {
      setMessage("Status update failed");
      return;
    }
    setMessage(`Marked ${next.toLowerCase()}`);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={clone} disabled={!!loading}>
        {loading === "clone" ? "Cloning..." : "Clone"}
      </Button>
      {status !== "ARCHIVED" && (
        <Button variant="outline" size="sm" onClick={() => setStatus("ARCHIVED")} disabled={!!loading}>
          Archive
        </Button>
      )}
      {status === "ARCHIVED" && (
        <Button variant="outline" size="sm" onClick={() => setStatus("READY")} disabled={!!loading}>
          Unarchive / Ready
        </Button>
      )}
      {status !== "CLOSED" && (
        <Button variant="ghost" size="sm" onClick={() => setStatus("CLOSED")} disabled={!!loading}>
          Close
        </Button>
      )}
      {message && <span className="text-xs text-primary">{message}</span>}
    </div>
  );
}
