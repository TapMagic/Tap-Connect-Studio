"use client";

/**
 * Email & Replies integration card + guided setup wizard.
 * Locked naming — never TapMail as primary product name.
 */

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  EMAIL_REPLIES_PRODUCT_NAME,
  EMAIL_REPLIES_PROMISE,
  EMAIL_REPLIES_SMALL_BIZ,
  RESEND_PROVIDER_DISCLOSURE,
  TAPCONNECT_EMAIL_NAME,
  TAP_INBOX_NAME,
} from "@/lib/fusion/email-replies/types";
import type { ReplyHandlingMode, ReplyMessageCategory } from "@/lib/fusion/email-replies/types";
import { categoryHostLabel } from "@/lib/fusion/email-replies/destination";

type CardModel = {
  state: string;
  promise: string;
  summary: {
    emailDelivery: { label: string; detail: string };
    customerReplies: { label: string; detail: string };
    destination?: { label: string; detail: string };
    tapVisibility: string;
    followUpTracking: string;
    stateLabel: string;
    actions: string[];
  };
  policy: {
    mode: ReplyHandlingMode;
    activated: boolean;
    primaryDestinationId?: string | null;
    keepCopyInTap: boolean;
    useTapInboxFallback: boolean;
  };
  primary?: {
    id: string;
    name: string;
    normalizedAddress?: string | null;
    verificationStatus: string;
    lastTestedAt?: string | null;
  } | null;
  readiness: {
    configured: boolean;
    runtimeMode: string;
    disclosure: string;
  };
};

type ConnectedOption = {
  id: string;
  name: string;
  hostSummary: {
    receives: string[];
    returns: string[];
    connectionType: string;
  };
  intakeHint?: string;
};

const CATEGORIES: ReplyMessageCategory[] = [
  "all",
  "complaints",
  "questions",
  "bookings",
  "sales",
  "other",
];

export function EmailRepliesIntegrationCard() {
  const [model, setModel] = useState<CardModel | null>(null);
  const [openWizard, setOpenWizard] = useState(false);
  const [openOperator, setOpenOperator] = useState(false);
  const [operatorItems, setOperatorItems] = useState<
    Array<{ id: string; label: string; status: string; detail: string }>
  >([]);
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<ReplyHandlingMode>("TAP_ROUTE_EXTERNAL");
  const [destinationName, setDestinationName] = useState("Customer Support");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [directReplyTo, setDirectReplyTo] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [categories, setCategories] = useState<ReplyMessageCategory[]>(["all"]);
  const [keepCopyInTap, setKeepCopyInTap] = useState(false);
  const [notifyOnFailure, setNotifyOnFailure] = useState(true);
  const [useTapInboxFallback, setUseTapInboxFallback] = useState(true);
  const [integrationId, setIntegrationId] = useState("");
  const [connected, setConnected] = useState<ConnectedOption[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [verifyToken, setVerifyToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityItems, setActivityItems] = useState<
    Array<{
      id: string;
      receivedAt: string | null;
      campaignId: string | null;
      category: string | null;
      destinationName: string;
      routeState: string;
      classification: string;
      failureReason: string | null;
      boundary: string;
    }>
  >([]);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/email-replies");
    if (res.ok) setModel(await res.json());
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/email-replies");
      if (!res.ok || cancelled) return;
      const data = await res.json();
      if (!cancelled) setModel(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadConnected() {
    const res = await fetch("/api/email-replies?view=connected");
    if (res.ok) {
      const data = await res.json();
      setConnected(data.destinations ?? []);
    }
  }

  async function loadOperator() {
    const res = await fetch("/api/email-replies?view=operator");
    if (res.ok) {
      const data = await res.json();
      setOperatorItems(data.checklist?.items ?? []);
      setOpenOperator(true);
    }
  }

  async function post(action: string, payload: Record<string, unknown> = {}) {
    setBusy(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/email-replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        setStatusMsg(data.error ?? data.code ?? "Something went wrong");
        return data;
      }
      setStatusMsg(
        typeof data.message === "string"
          ? data.message
          : data.mock
            ? "Local mock — no external customer contact."
            : "Done"
      );
      await refresh();
      return data;
    } finally {
      setBusy(false);
    }
  }

  async function saveAndContinue() {
    const data = await post("wizard_save", {
      mode,
      destinationName,
      destinationAddress:
        mode === "DIRECT_EXTERNAL" ? directReplyTo : destinationAddress,
      directReplyTo,
      notificationEmail,
      categories,
      keepCopyInTap,
      notifyOnFailure,
      useTapInboxFallback,
      integrationId: integrationId || undefined,
    });
    if (data?.ok) setStep((s) => Math.min(5, s + 1));
  }

  if (!model) {
    return (
      <Card data-testid="email-replies-card" className="border-border/60">
        <CardHeader>
          <CardTitle>{EMAIL_REPLIES_PRODUCT_NAME}</CardTitle>
          <CardDescription>Loading…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const s = model.summary;

  return (
    <div id="email-replies" className="scroll-mt-24 space-y-4">
      <Card
        data-testid="email-replies-card"
        className="border-primary/30 bg-primary/5"
      >
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">{EMAIL_REPLIES_PRODUCT_NAME}</CardTitle>
            <Badge variant="outline" data-testid="email-replies-state">
              {s.stateLabel}
            </Badge>
          </div>
          <CardDescription>{EMAIL_REPLIES_PROMISE}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {s.emailDelivery.label}
              </p>
              <p data-testid="email-replies-delivery">{s.emailDelivery.detail}</p>
              <p className="text-xs text-muted-foreground">
                {TAPCONNECT_EMAIL_NAME} · {RESEND_PROVIDER_DISCLOSURE}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {s.customerReplies.label}
              </p>
              <p data-testid="email-replies-routing">{s.customerReplies.detail}</p>
            </div>
            {s.destination ? (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {s.destination.label}
                </p>
                <p data-testid="email-replies-destination">{s.destination.detail}</p>
              </div>
            ) : null}
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Tap visibility
              </p>
              <p>{s.tapVisibility}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Follow-up tracking
              </p>
              <p>{s.followUpTracking}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {s.actions.includes("set_up") || s.actions.includes("manage") ? (
              <Button
                type="button"
                size="sm"
                data-testid="email-replies-setup"
                className="min-h-11"
                onClick={() => {
                  setOpenWizard(true);
                  setStep(1);
                }}
              >
                {s.actions.includes("set_up") ? "Set up" : "Manage"}
              </Button>
            ) : null}
            {s.actions.includes("send_test") && model.primary ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                data-testid="email-replies-send-test"
                className="min-h-11"
                disabled={busy}
                onClick={() =>
                  void post("send_test", { destinationId: model.primary!.id })
                }
              >
                Send test
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              data-testid="email-replies-routing-activity"
              className="min-h-11"
              onClick={async () => {
                const res = await fetch("/api/email-replies?view=activity");
                if (res.ok) {
                  const data = await res.json();
                  setActivityItems(data.items ?? []);
                  setActivityOpen(true);
                } else {
                  setStatusMsg("Routing activity is temporarily unavailable.");
                }
              }}
            >
              View routing activity
            </Button>
            {model.primary ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                data-testid="email-replies-toggle-enabled"
                className="min-h-11"
                disabled={busy}
                onClick={() =>
                  void post("set_enabled", {
                    destinationId: model.primary!.id,
                    enabled: false,
                  })
                }
              >
                Disable destination
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              data-testid="email-replies-operator"
              className="min-h-11"
              onClick={() => void loadOperator()}
            >
              Operator readiness
            </Button>
          </div>
          {statusMsg ? (
            <p className="text-xs text-muted-foreground" role="status">
              {statusMsg}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {activityOpen ? (
        <Card data-testid="email-replies-activity-panel">
          <CardHeader>
            <CardTitle className="text-base">Routing activity</CardTitle>
            <CardDescription>
              Durable handoff evidence. External assignment and resolution are not claimed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {activityItems.length === 0 ? (
              <p className="text-muted-foreground">No routing attempts yet.</p>
            ) : (
              activityItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded border border-border/50 p-3"
                  data-testid="email-replies-activity-item"
                >
                  <p>
                    {item.receivedAt ?? "—"} · {item.destinationName} · {item.routeState}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Campaign: {item.campaignId ?? "—"} · Category: {item.category ?? "—"} ·{" "}
                    {item.classification}
                  </p>
                  {item.failureReason ? (
                    <p className="text-xs text-amber-300">{item.failureReason}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">{item.boundary}</p>
                </div>
              ))
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11"
              onClick={() => setActivityOpen(false)}
            >
              Close
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {openOperator ? (
        <Card data-testid="email-replies-operator-panel">
          <CardHeader>
            <CardTitle className="text-base">TapConnect operator setup</CardTitle>
            <CardDescription>
              Platform checklist — secret values are never shown.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {operatorItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-0.5 border-b border-border/40 py-2 text-sm sm:flex-row sm:justify-between"
              >
                <span>{item.label}</span>
                <span className="text-muted-foreground">
                  {item.status} — {item.detail}
                </span>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11"
              onClick={() => setOpenOperator(false)}
            >
              Close
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {openWizard ? (
        <Card data-testid="email-replies-wizard" className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">
              {EMAIL_REPLIES_PRODUCT_NAME} setup
            </CardTitle>
            <CardDescription>
              Step {step} of 5 — customer-friendly blanks only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 1 ? (
              <div className="space-y-3" data-testid="wizard-step-destination">
                <p className="font-medium">Where should customer replies go?</p>
                {(
                  [
                    ["TAP_ROUTE_EXTERNAL", "My existing email or system — recommended"],
                    ["TAP_INBOX", `Use ${TAP_INBOX_NAME}`],
                    ["DIRECT_EXTERNAL", "Send replies directly outside TapConnect"],
                    ["CONNECTED_DESTINATION", "Connected integration"],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value} className="flex min-h-11 items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="reply-mode"
                      checked={mode === value}
                      onChange={() => {
                        setMode(value);
                        if (value === "CONNECTED_DESTINATION") void loadConnected();
                      }}
                    />
                    {label}
                  </label>
                ))}
                {mode === "TAP_ROUTE_EXTERNAL" ? (
                  <div className="space-y-2">
                    <Label htmlFor="dest-name">Destination name</Label>
                    <Input
                      id="dest-name"
                      value={destinationName}
                      onChange={(e) => setDestinationName(e.target.value)}
                      placeholder="Customer Support"
                    />
                    <Label htmlFor="dest-addr">Email or system intake address</Label>
                    <Input
                      id="dest-addr"
                      value={destinationAddress}
                      onChange={(e) => setDestinationAddress(e.target.value)}
                      placeholder="support@business.com"
                    />
                  </div>
                ) : null}
                {mode === "TAP_INBOX" ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      TapConnect will organize replies and keep the conversation connected
                      to the customer and Campaign.
                    </p>
                    <p className="text-sm text-muted-foreground">{EMAIL_REPLIES_SMALL_BIZ}</p>
                    <Label htmlFor="notify-email">Notification email (optional)</Label>
                    <Input
                      id="notify-email"
                      value={notificationEmail}
                      onChange={(e) => setNotificationEmail(e.target.value)}
                    />
                  </div>
                ) : null}
                {mode === "DIRECT_EXTERNAL" ? (
                  <div className="space-y-2">
                    <Label htmlFor="direct-reply">Verified Reply-To address</Label>
                    <Input
                      id="direct-reply"
                      value={directReplyTo}
                      onChange={(e) => setDirectReplyTo(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Replies will go directly to this address. TapConnect will not receive
                      or track the conversation.
                    </p>
                  </div>
                ) : null}
                {mode === "CONNECTED_DESTINATION" ? (
                  <div className="space-y-2" data-testid="wizard-connected-picker">
                    {connected.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`w-full rounded border p-3 text-left text-sm ${
                          integrationId === c.id ? "border-primary" : "border-border/60"
                        }`}
                        onClick={() => {
                          setIntegrationId(c.id);
                          setDestinationName(c.name);
                        }}
                      >
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Receives: {c.hostSummary.receives.join("; ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Returns: {c.hostSummary.returns.join("; ")}
                        </p>
                        <p className="text-xs">Connection type: {c.hostSummary.connectionType}</p>
                      </button>
                    ))}
                    <Label htmlFor="connected-addr">Intake address or endpoint reference</Label>
                    <Input
                      id="connected-addr"
                      value={destinationAddress}
                      onChange={(e) => setDestinationAddress(e.target.value)}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-2" data-testid="wizard-step-categories">
                <p className="font-medium">What should this destination receive?</p>
                {CATEGORIES.map((cat) => (
                  <label key={cat} className="flex min-h-11 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={categories.includes(cat)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCategories(
                            cat === "all" ? ["all"] : [...categories.filter((c) => c !== "all"), cat]
                          );
                        } else {
                          const next = categories.filter((c) => c !== cat);
                          setCategories(next.length ? next : ["all"]);
                        }
                      }}
                    />
                    {categoryHostLabel(cat)}
                  </label>
                ))}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-2" data-testid="wizard-step-keep">
                <p className="font-medium">What should TapConnect keep?</p>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked readOnly />
                  Keep the initial reply and routing record
                </label>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={keepCopyInTap}
                    onChange={(e) => setKeepCopyInTap(e.target.checked)}
                  />
                  Keep a copy in {TAP_INBOX_NAME}
                </label>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={notifyOnFailure}
                    onChange={(e) => setNotifyOnFailure(e.target.checked)}
                  />
                  Notify me if routing fails
                </label>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={useTapInboxFallback}
                    onChange={(e) => setUseTapInboxFallback(e.target.checked)}
                  />
                  Use {TAP_INBOX_NAME} as the fallback
                </label>
                <p className="text-sm text-muted-foreground" data-testid="wizard-visibility">
                  {mode === "TAP_INBOX"
                    ? "TapConnect retains the conversation and can support reply assistance, Cases, and conversation Insights."
                    : mode === "DIRECT_EXTERNAL"
                      ? "Replies bypass TapConnect. Reply tracking, routing evidence, and reply assistance will be unavailable."
                      : "TapConnect records the initial reply and confirms the handoff. Follow-up, assignment, response, and resolution remain in your external system."}
                </p>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-3" data-testid="wizard-step-verify">
                <p className="font-medium">Verify and test</p>
                {model.primary ? (
                  <>
                    <p className="text-sm">
                      Status: {model.primary.verificationStatus}
                      {model.primary.lastTestedAt
                        ? ` · Last tested ${model.primary.lastTestedAt}`
                        : ""}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      className="min-h-11"
                      disabled={busy}
                      data-testid="wizard-send-verification"
                      onClick={async () => {
                        const data = await post("send_verification", {
                          destinationId: model.primary!.id,
                        });
                        if (data?.tokenForTests) setVerifyToken(data.tokenForTests);
                      }}
                    >
                      Send verification
                    </Button>
                    <Label htmlFor="verify-token">Verification code</Label>
                    <Input
                      id="verify-token"
                      value={verifyToken}
                      onChange={(e) => setVerifyToken(e.target.value)}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="min-h-11"
                      disabled={busy}
                      data-testid="wizard-confirm-verification"
                      onClick={() =>
                        void post("confirm_verification", {
                          destinationId: model.primary!.id,
                          token: verifyToken,
                        })
                      }
                    >
                      Confirm verification
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="min-h-11"
                      disabled={busy}
                      data-testid="wizard-route-test"
                      onClick={() =>
                        void post("send_test", { destinationId: model.primary!.id })
                      }
                    >
                      Send test routing message
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="min-h-11"
                      data-testid="wizard-skip-test"
                      onClick={() => void post("skip_test")}
                    >
                      Continue as configured but untested
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Save step 1 first so a destination exists.
                  </p>
                )}
              </div>
            ) : null}

            {step === 5 ? (
              <div className="space-y-2" data-testid="wizard-step-review">
                <p className="font-medium">Review and activate</p>
                <ul className="space-y-1 text-sm">
                  <li>Email delivery: {TAPCONNECT_EMAIL_NAME}</li>
                  <li>Replies: {mode}</li>
                  <li>
                    Primary destination: {destinationName}
                    {destinationAddress || directReplyTo
                      ? ` · ${destinationAddress || directReplyTo}`
                      : ""}
                  </li>
                  <li>Fallback: {useTapInboxFallback ? TAP_INBOX_NAME : "None"}</li>
                  <li>
                    TapConnect tracks: Initial reply, classification, destination, and
                    routing result
                  </li>
                  <li>
                    External system tracks: Assignment, response, and resolution
                  </li>
                </ul>
                <Button
                  type="button"
                  className="min-h-11"
                  disabled={busy}
                  data-testid="wizard-activate"
                  onClick={async () => {
                    const data = await post("activate");
                    if (data?.ok) setOpenWizard(false);
                  }}
                >
                  Activate reply routing
                </Button>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 border-t border-border/40 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-11"
                disabled={step <= 1}
                onClick={() => setStep((s) => s - 1)}
              >
                Back
              </Button>
              {step < 5 ? (
                <Button
                  type="button"
                  size="sm"
                  className="min-h-11"
                  data-testid="wizard-next"
                  disabled={busy}
                  onClick={() => {
                    if (step === 1 || step === 2 || step === 3) void saveAndContinue();
                    else setStep((s) => s + 1);
                  }}
                >
                  Continue
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-11"
                onClick={() => setOpenWizard(false)}
              >
                Close
              </Button>
            </div>
            {statusMsg ? (
              <p className="text-xs text-muted-foreground" role="status">
                {statusMsg}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
