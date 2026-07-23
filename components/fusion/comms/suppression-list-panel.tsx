"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { MessageChannel } from "@/lib/fusion/comms/channel-guardian";
import type { SuppressionRow } from "@/lib/fusion/comms/suppression-utils";

const CHANNELS: MessageChannel[] = ["email", "sms", "whatsapp", "messenger"];

export function SuppressionListPanel({
  initialRows,
  featureEnabled,
}: {
  initialRows: SuppressionRow[];
  featureEnabled: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [channel, setChannel] = useState<MessageChannel>("email");
  const [address, setAddress] = useState("");
  const [reason, setReason] = useState("manual unsubscribe");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function addEntry() {
    setMessage(null);
    startTransition(async () => {
      const res = await fetch("/api/comms/suppression", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", channel, address, reason }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage(data.error ?? "Failed to add suppression");
        return;
      }
      setRows((prev) => [data.row, ...prev.filter((r) => r.id !== data.row.id)]);
      setAddress("");
      setMessage("Address suppressed — Channel Guardian will block sends");
      router.refresh();
    });
  }

  async function removeEntry(row: SuppressionRow) {
    startTransition(async () => {
      const res = await fetch("/api/comms/suppression", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove",
          channel: row.channel,
          address: row.address,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setRows((prev) => prev.filter((r) => r.id !== row.id));
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Suppressed addresses are blocked by Channel Guardian before mock or live sends. Lookup fails
        open when DB is unavailable.
      </p>

      {!featureEnabled ? (
        <p className="text-sm text-muted-foreground">
          Enable <code className="font-mono">comms.email</code> or{" "}
          <code className="font-mono">comms.messaging</code> to manage suppressions.
        </p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-[120px_1fr_1fr_auto]">
        <select
          className="h-9 rounded-md border border-border/60 bg-background px-2 text-sm"
          value={channel}
          disabled={!featureEnabled || pending}
          onChange={(e) => setChannel(e.target.value as MessageChannel)}
        >
          {CHANNELS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <Input
          placeholder="address@example.com"
          value={address}
          disabled={!featureEnabled || pending}
          onChange={(e) => setAddress(e.target.value)}
        />
        <Input
          placeholder="Reason"
          value={reason}
          disabled={!featureEnabled || pending}
          onChange={(e) => setReason(e.target.value)}
        />
        <Button
          size="sm"
          disabled={!featureEnabled || pending || !address.trim()}
          onClick={addEntry}
        >
          Suppress
        </Button>
      </div>

      {message ? <p className="text-sm text-primary">{message}</p> : null}

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/60 px-3 py-6 text-center text-sm text-muted-foreground">
          No suppressions yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Channel</th>
                <th className="px-3 py-2">Address</th>
                <th className="px-3 py-2">Reason</th>
                <th className="px-3 py-2">Added</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border/40">
                  <td className="px-3 py-2 capitalize">{r.channel}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.address}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.reason ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      disabled={!featureEnabled || pending}
                      onClick={() => removeEntry(r)}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
