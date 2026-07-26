"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type CardSupportContext = {
  businessId: string;
  campaignId?: string;
  deviceSlotId?: string;
  sectionId?: string;
  businessName?: string;
};

/**
 * In-Card Ask a Question form — public visitor entry into TapInbox.
 */
export function CardSupportForm({
  context,
  onClose,
  onSubmitted,
  className,
}: {
  context: CardSupportContext;
  onClose: () => void;
  onSubmitted?: (result: { myTapPath?: string }) => void;
  className?: string;
}) {
  const titleId = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [requestType, setRequestType] = useState<
    "question" | "feedback" | "complaint" | "billing"
  >("question");
  const [consentGiven, setConsentGiven] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ myTapPath?: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/public/card/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: context.businessId,
          campaignId: context.campaignId,
          deviceSlotId: context.deviceSlotId,
          sectionId: context.sectionId,
          name: name.trim() || undefined,
          email: email.trim(),
          question: question.trim(),
          requestType,
          consentGiven,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        myTapPath?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not send your question.");
        return;
      }
      setDone({ myTapPath: data.myTapPath });
      onSubmitted?.({ myTapPath: data.myTapPath });
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div
        className={cn("rounded-xl border border-primary/30 bg-black/70 p-4 text-sm text-white", className)}
        data-testid="card-support-success"
        role="status"
      >
        <p className="font-semibold text-primary">Question sent</p>
        <p className="mt-2 text-white/80">
          Thanks — we’ll follow up by email. Your Card remains the place to reopen this
          relationship.
        </p>
        {done.myTapPath ? (
          <a
            href={done.myTapPath}
            className="mt-3 inline-block text-sm text-primary underline underline-offset-2"
          >
            Open MyTap
          </a>
        ) : null}
        <Button type="button" variant="secondary" className="mt-4 w-full" onClick={onClose}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className={cn(
        "rounded-xl border border-white/15 bg-black/80 p-4 text-sm text-white shadow-xl backdrop-blur",
        className
      )}
      data-testid="card-support-form"
      aria-labelledby={titleId}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            Support
          </p>
          <h3 id={titleId} className="text-base font-semibold">
            Ask a question
          </h3>
          <p className="mt-1 text-xs text-white/65">
            {context.businessName
              ? `Message ${context.businessName}. We’ll reply by email.`
              : "We’ll reply by email. Live messaging may be unavailable — email mock works locally."}
          </p>
        </div>
        <button
          type="button"
          className="text-white/50 hover:text-white"
          onClick={onClose}
          aria-label="Close support form"
        >
          ✕
        </button>
      </div>

      <label className="mt-3 block text-xs text-white/70">
        Request type
        <select
          className="mt-1 w-full rounded-md border border-white/15 bg-black/60 px-2 py-2 text-sm"
          value={requestType}
          onChange={(e) =>
            setRequestType(e.target.value as typeof requestType)
          }
          data-testid="card-support-type"
        >
          <option value="question">Question</option>
          <option value="feedback">Feedback</option>
          <option value="complaint">Complaint (opens a case)</option>
          <option value="billing">Billing (opens a case)</option>
        </select>
      </label>

      <label className="mt-3 block text-xs text-white/70">
        Name (optional)
        <Input
          className="mt-1 bg-black/50"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          data-testid="card-support-name"
        />
      </label>

      <label className="mt-3 block text-xs text-white/70">
        Email
        <Input
          className="mt-1 bg-black/50"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          data-testid="card-support-email"
        />
      </label>

      <label className="mt-3 block text-xs text-white/70">
        Your question
        <Textarea
          className="mt-1 min-h-[96px] bg-black/50"
          required
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          data-testid="card-support-question"
        />
      </label>

      <label className="mt-3 flex items-start gap-2 text-xs text-white/75">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={consentGiven}
          onChange={(e) => setConsentGiven(e.target.checked)}
          data-testid="card-support-consent"
        />
        <span>
          I agree to be contacted by email about this request (service / support purpose).
        </span>
      </label>

      {error ? (
        <p className="mt-3 text-xs text-red-300" data-testid="card-support-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex gap-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={busy || !consentGiven}
          data-testid="card-support-submit"
        >
          {busy ? "Sending…" : "Send question"}
        </Button>
      </div>
    </form>
  );
}
