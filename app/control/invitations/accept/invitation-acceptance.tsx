"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound, ShieldCheck } from "lucide-react";

export function InvitationAcceptance({ token }: { token: string }) {
  const [status, setStatus] = useState<"ready" | "busy" | "accepted" | "error">(
    token ? "ready" : "error",
  );
  const [message, setMessage] = useState(
    token ? "" : "This invitation link is incomplete.",
  );

  async function accept() {
    setStatus("busy");
    const response = await fetch("/api/control/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const result = (await response.json()) as {
      ok?: boolean;
      message?: string;
      error?: string;
    };
    setMessage(result.message ?? result.error ?? "Invitation acceptance failed.");
    setStatus(response.ok && result.ok ? "accepted" : "error");
  }

  return (
    <main className="control-acceptance">
      <section>
        <span className="control-brand-mark"><KeyRound /></span>
        <p className="control-eyebrow">TapConnect internal access</p>
        <h1>Accept administrator invitation</h1>
        <p>
          Your authenticated identity will be bound permanently to the scoped role,
          memberships, and private sandbox selected by the inviter.
        </p>
        <div className="control-consequence">
          <ShieldCheck />
          <div>
            <strong>Identity-safe acceptance</strong>
            <p>The invitation is single-use, expiring, and cannot be transferred after acceptance.</p>
          </div>
        </div>
        {message ? (
          <div className={status === "accepted" ? "control-acceptance-result" : "control-form-error"} role="status">
            {status === "accepted" ? <CheckCircle2 /> : null}
            {message}
          </div>
        ) : null}
        {status === "accepted" ? (
          <a className="control-button control-button--primary" href="/control">
            Open Control Room
          </a>
        ) : (
          <button
            type="button"
            className="control-button control-button--primary"
            disabled={!token || status === "busy"}
            onClick={() => void accept()}
          >
            {status === "busy" ? "Binding identity…" : "Accept invitation"}
          </button>
        )}
      </section>
    </main>
  );
}
