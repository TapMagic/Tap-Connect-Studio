"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type PassRow = {
  id: string;
  platform: string;
  status: string;
  serialNumber: string;
  mock: boolean;
  installUrl: string | null;
  version: number;
};

export function WalletPassManager({
  initialPasses,
  featureEnabled,
  credentialBlockers,
}: {
  initialPasses: PassRow[];
  featureEnabled: boolean;
  credentialBlockers: { apple: string[]; google: string[] };
}) {
  const router = useRouter();
  const [passes, setPasses] = useState(initialPasses);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function run(action: string, passId?: string) {
    setMessage(null);
    startTransition(async () => {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "create"
            ? { action: "create", platform: "apple" }
            : { action, passId }
        ),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage(data.error ?? "Action failed");
        return;
      }
      setMessage(
        action === "issue" && data.mock
          ? "Issued via mock adapter (credentials missing)"
          : `${action} succeeded`
      );
      router.refresh();
      if (data.pass) {
        setPasses((prev) => {
          const idx = prev.findIndex((p) => p.id === data.pass.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = data.pass;
            return next;
          }
          return [data.pass, ...prev];
        });
      }
      if (data.newPass) {
        setPasses((prev) => [data.newPass, ...prev]);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Feature {featureEnabled ? "enabled" : "disabled"} · Mock path works without Apple/Google
            certs
          </p>
          {(credentialBlockers.apple.length > 0 || credentialBlockers.google.length > 0) && (
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              Blockers — Apple: {credentialBlockers.apple.join(", ") || "none"} · Google:{" "}
              {credentialBlockers.google.join(", ") || "none"}
            </p>
          )}
        </div>
        <Button
          size="sm"
          disabled={!featureEnabled || pending}
          onClick={() => run("create")}
        >
          Create draft pass
        </Button>
      </div>

      {message ? <p className="text-sm text-primary">{message}</p> : null}

      {passes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
          No wallet passes yet. Create a draft to start the mock lifecycle.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Serial</th>
                <th className="px-3 py-2">Platform</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Mode</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {passes.map((p) => (
                <tr key={p.id} className="border-t border-border/40">
                  <td className="px-3 py-2 font-mono text-xs">{p.serialNumber.slice(0, 18)}…</td>
                  <td className="px-3 py-2 capitalize">{p.platform}</td>
                  <td className="px-3 py-2">
                    <Badge variant="outline">{p.status}</Badge>
                  </td>
                  <td className="px-3 py-2">{p.mock ? "Mock" : "Live"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {["preview", "issue", "update", "revoke", "replace"].map((a) => (
                        <Button
                          key={a}
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          disabled={!featureEnabled || pending}
                          onClick={() => run(a, p.id)}
                        >
                          {a}
                        </Button>
                      ))}
                    </div>
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
