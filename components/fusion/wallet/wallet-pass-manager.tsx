"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  allowedWalletActions,
  labelWalletEvidence,
  walletInstallLinkAllowed,
  walletPassEvidenceClass,
  walletStatusHint,
} from "@/lib/fusion/wallet/evidence";
import type { WalletLifecycleAction, WalletPassStatus } from "@/lib/fusion/wallet/lifecycle";

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
      if (data.oldPass) {
        setPasses((prev) =>
          prev.map((p) => (p.id === data.oldPass.id ? data.oldPass : p))
        );
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
                <th className="px-3 py-2">Evidence</th>
                <th className="px-3 py-2">Install</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {passes.map((p) => {
                const status = p.status as WalletPassStatus;
                const evidence = walletPassEvidenceClass(status, p.mock);
                const allowed = allowedWalletActions(status);
                const installOk = walletInstallLinkAllowed(status, featureEnabled);

                return (
                  <tr key={p.id} className="border-t border-border/40">
                    <td className="px-3 py-2 font-mono text-xs">{p.serialNumber.slice(0, 18)}…</td>
                    <td className="px-3 py-2 capitalize">{p.platform}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline">{p.status}</Badge>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        v{p.version} · {walletStatusHint(status)}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="outline"
                        className={
                          evidence === "modeled"
                            ? "border-primary/40 text-primary"
                            : evidence === "incomplete"
                              ? "text-muted-foreground"
                              : ""
                        }
                      >
                        {labelWalletEvidence(evidence)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      {installOk && p.installUrl ? (
                        <a
                          href={p.installUrl}
                          className="text-xs text-primary hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {p.mock ? "Mock install" : "Live install"}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">Gated</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {(["preview", "issue", "update", "revoke", "replace"] as WalletLifecycleAction[]).map(
                          (a) => (
                            <Button
                              key={a}
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              disabled={!featureEnabled || pending || !allowed.includes(a)}
                              onClick={() => run(a, p.id)}
                            >
                              {a}
                            </Button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
