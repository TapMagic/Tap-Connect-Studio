"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  allowedWalletActions,
  labelWalletEvidence,
  walletInstallLinkAllowed,
  walletPassEvidenceClass,
  walletReplaceConfirmCopy,
  walletReplaceOutcomeMessage,
  walletStatusHint,
} from "@/lib/fusion/wallet/evidence";
import { formatEvidenceCaption } from "@/lib/fusion/insights/evidence-display";
import type { WalletLifecycleAction, WalletPassStatus } from "@/lib/fusion/wallet/lifecycle";

type PassRow = {
  id: string;
  platform: string;
  status: string;
  serialNumber: string;
  mock: boolean;
  installUrl: string | null;
  version: number;
  replacedById: string | null;
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
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [pendingReplaceId, setPendingReplaceId] = useState<string | null>(null);
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

  const passById = useMemo(
    () => new Map(passes.map((p) => [p.id, p])),
    [passes]
  );

  useEffect(() => {
    if (!highlightId) return;
    const row = rowRefs.current.get(highlightId);
    row?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const timer = window.setTimeout(() => setHighlightId(null), 4000);
    return () => window.clearTimeout(timer);
  }, [highlightId, passes]);

  async function run(action: string, passId?: string) {
    if (action === "replace" && passId) {
      const pass = passById.get(passId);
      if (!pass) return;
      if (pendingReplaceId !== passId) {
        setPendingReplaceId(passId);
        setMessage(null);
        return;
      }
      setPendingReplaceId(null);
    }

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

      if (action === "replace" && data.oldPass && data.newPass) {
        setMessage(
          walletReplaceOutcomeMessage({
            oldSerial: data.oldPass.serialNumber,
            newSerial: data.newPass.serialNumber,
          })
        );
        setHighlightId(data.newPass.id);
      } else if (action === "issue" && data.mock) {
        setMessage("Issued via mock adapter (credentials missing)");
      } else {
        setMessage(`${action} succeeded`);
      }

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

  const pendingReplacePass = pendingReplaceId ? passById.get(pendingReplaceId) : null;

  return (
    <div className="space-y-4">
      {pendingReplacePass ? (
        <div
          role="alertdialog"
          aria-labelledby="wallet-replace-title"
          aria-describedby="wallet-replace-desc"
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
        >
          <p id="wallet-replace-title" className="text-sm font-semibold text-amber-100">
            Confirm replace — {pendingReplacePass.serialNumber}
          </p>
          <p id="wallet-replace-desc" className="mt-2 text-sm text-muted-foreground">
            {walletReplaceConfirmCopy()}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => run("replace", pendingReplacePass.id)}
            >
              Confirm replace
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => setPendingReplaceId(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
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
                const successor = p.replacedById ? passById.get(p.replacedById) : null;

                return (
                  <tr
                    key={p.id}
                    ref={(el) => {
                      if (el) rowRefs.current.set(p.id, el);
                      else rowRefs.current.delete(p.id);
                    }}
                    className={`border-t border-border/40 ${
                      highlightId === p.id ? "bg-primary/10 ring-1 ring-primary/40" : ""
                    }`}
                  >
                    <td className="px-3 py-2 font-mono text-xs">{p.serialNumber.slice(0, 18)}…</td>
                    <td className="px-3 py-2 capitalize">{p.platform}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline">{p.status}</Badge>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        v{p.version} · {walletStatusHint(status)}
                      </p>
                      {status === "REPLACED" && successor ? (
                        <p className="mt-0.5 text-[10px] text-primary">
                          Successor draft: {successor.serialNumber.slice(0, 14)}…
                        </p>
                      ) : null}
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
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {formatEvidenceCaption({
                          evidenceClass: evidence,
                          source: "WalletPass",
                          mockPath: p.mock,
                        })}
                      </p>
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
                              variant={a === "replace" ? "outline" : "ghost"}
                              className="h-7 px-2 text-xs"
                              disabled={!featureEnabled || pending || !allowed.includes(a)}
                              onClick={() => run(a, p.id)}
                              title={
                                a === "replace"
                                  ? "Retire this pass and create a draft successor"
                                  : undefined
                              }
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
