"use client";

import { useState } from "react";
import type { ContentBlock } from "@/lib/types/campaign";

interface CampaignLeadFormProps {
  block: ContentBlock;
  campaignId: string;
  deviceSlotId: string;
  businessId: string;
  type: "email_capture" | "feedback";
  onSuccess?: () => void;
  /** Marketing demos: skip API and unlock locally */
  previewMode?: boolean;
}

export function CampaignLeadForm({
  block,
  campaignId,
  deviceSlotId,
  businessId,
  type,
  onSuccess,
  previewMode = false,
}: CampaignLeadFormProps) {
  const data = block.data as Record<string, unknown>;
  const fields = (data.fields as string[]) ?? ["email"];
  const requireName = Boolean(data.requireName);
  const requirePhone = Boolean(data.requirePhone);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (previewMode) {
      await new Promise((r) => setTimeout(r, 350));
      setSubmitted(true);
      setLoading(false);
      onSuccess?.();
      return;
    }

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId,
        deviceSlotId,
        businessId,
        name: form.get("name") || undefined,
        email: form.get("email"),
        phone: form.get("phone") || undefined,
        message: form.get("message") || undefined,
        type,
        blockId: block.id,
        consentGiven: form.get("consent") === "on",
      }),
    });

    if (!res.ok) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
    onSuccess?.();
  }

  if (submitted) {
    return (
      <div className="tap-block px-4 pt-4">
        <div className="rounded-xl border border-[var(--tap-primary)]/30 bg-[var(--tap-primary)]/10 p-5 text-center">
          <p className="font-medium text-[var(--tap-primary)]">
            {(data.successMessage as string) ?? "Thank you!"}
          </p>
        </div>
      </div>
    );
  }

  const showName = fields.includes("name") || requireName;
  const showPhone = fields.includes("phone") || requirePhone;

  return (
    <div className="tap-block px-4 pt-4">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-lg font-semibold">{data.headline as string}</h3>
        {data.description ? (
          <p className="mt-1 text-sm opacity-80">{data.description as string}</p>
        ) : null}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {showName && (
            <input
              name="name"
              required={requireName}
              placeholder={requireName ? "Your name" : "Your name (optional)"}
              className="tap-input w-full"
            />
          )}
          <input
            name="email"
            type="email"
            required
            placeholder="Email address"
            className="tap-input w-full"
          />
          {showPhone && (
            <input
              name="phone"
              type="tel"
              required={requirePhone}
              placeholder={requirePhone ? "Phone number" : "Phone (optional)"}
              className="tap-input w-full"
            />
          )}
          {type === "feedback" && (
            <textarea
              name="message"
              placeholder="Your feedback..."
              className="tap-input min-h-20 w-full"
            />
          )}
          <label className="flex items-start gap-2 text-xs opacity-70">
            <input type="checkbox" name="consent" className="mt-0.5" />
            I agree to receive communications from this business.
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="tap-btn tap-btn-primary w-full">
            {loading ? "Sending..." : (data.buttonLabel as string)}
          </button>
        </form>
      </div>
    </div>
  );
}
