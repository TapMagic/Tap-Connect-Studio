"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Eye,
  ImagePlus,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TapConnectCard } from "@/components/tap/tap-connect-card";
import { SharedMediaAssetBrowser } from "@/components/media/shared-media-asset-browser";
import {
  buildFirstCardDraft,
  type ApprovedCardFact,
} from "@/lib/fusion/card/first-card-draft";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";
import type { MediaAssetCandidate } from "@/lib/media/asset-browser";
import { FieldSourceChip } from "@/components/fusion/authoring/intelligent-prefill-bar";

type BusinessState = {
  name: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  businessCategory: string | null;
  primaryCustomerOutcome: string | null;
  previewedAt: string | null;
};

type FactState = {
  id: string;
  factKey: string;
  value: unknown;
  confidence: number;
  approvalStatus: "SUGGESTED" | "APPROVED" | "REJECTED" | "STALE";
  contradictionStatus: "NONE" | "SUSPECTED" | "CONFIRMED";
  lastVerifiedAt: string;
  source: {
    kind: string;
    displayLabel: string;
    normalizedUri: string | null;
  };
};

type DecisionState = {
  id: string;
  propertyKey: string;
  candidate: unknown;
  status: "SUGGESTED" | "KEPT" | "APPROVED" | "REJECTED" | "IGNORED" | "REPLACED";
  scope: "BRAND" | "CARD_ONLY";
  locked: boolean;
  provider: string | null;
  confidence: number | null;
  rationale: string | null;
  rightsStatus: "CONFIRMED" | "NEEDS_CONFIRMATION" | "NOT_APPLICABLE";
  mediaAsset: {
    id: string;
    url: string;
    approvalStatus: "UNREVIEWED" | "APPROVED" | "REJECTED";
    provider: string | null;
    licenseCode: string | null;
    rightsNote: string | null;
    attributionText: string | null;
  } | null;
};

const CATEGORY_OPTIONS = [
  ["PROFESSIONAL_SERVICES", "Professional services"],
  ["HEALTH_WELLNESS", "Health & wellness"],
  ["FOOD_HOSPITALITY", "Food & hospitality"],
  ["RETAIL_ECOMMERCE", "Retail & e-commerce"],
  ["HOME_LOCAL_SERVICES", "Home & local services"],
  ["REAL_ESTATE", "Real estate"],
  ["NONPROFIT_COMMUNITY", "Nonprofit & community"],
  ["CREATOR_PERSONAL_BRAND", "Creator or personal Brand"],
  ["OTHER", "Other"],
] as const;

const OUTCOME_OPTIONS = [
  ["CONTACT", "Help customers contact us"],
  ["REVIEWS", "Get more reviews"],
  ["OFFER", "Promote a confirmed offer"],
  ["APPOINTMENTS", "Book appointments"],
  ["DIRECTIONS", "Help people find us"],
  ["ESSENTIALS", "Share our essentials"],
  ["LOYALTY", "Connect an existing loyalty program"],
  ["FAQ", "Answer common questions"],
] as const;

const STEP_LABELS = [
  "Tell us about your business",
  "Confirm what we found",
  "We found your Brand",
  "Here is your first Card",
] as const;

const NEUTRAL_CARD = buildFirstCardDraft({
  businessName: "Your business",
  outcome: "ESSENTIALS",
  facts: [],
}).draft;

function displayValue(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function decisionValue(candidate: unknown): string {
  if (typeof candidate === "string") return candidate;
  if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
    const value = (candidate as Record<string, unknown>).value;
    if (typeof value === "string") return value;
  }
  return "Prepared option";
}

export function CardFirstOnboardingWorkspace({
  initialBusiness,
  initialFacts,
  initialDecisions,
  initialDraft,
  initialRevision,
  initialStage,
  role,
  mediaUploadReady,
  stockReady,
}: {
  initialBusiness: BusinessState | null;
  initialFacts: FactState[];
  initialDecisions: DecisionState[];
  initialDraft: TapConnectCardConfig | null;
  initialRevision: number;
  initialStage: number;
  role: "OWNER" | "MANAGER" | "MARKETING" | "VIEWER" | "STAFF_SCANNER";
  mediaUploadReady: boolean;
  stockReady: boolean;
}) {
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [stage, setStage] = useState(initialStage);
  const [business, setBusiness] = useState(initialBusiness);
  const [facts, setFacts] = useState(initialFacts);
  const [decisions, setDecisions] = useState(initialDecisions);
  const [draft, setDraft] = useState<TapConnectCardConfig>(
    initialDraft || NEUTRAL_CARD
  );
  const [revision, setRevision] = useState(initialRevision);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaProperty, setMediaProperty] = useState<"logo" | "imageryDirection">("logo");
  const [compareId, setCompareId] = useState<string | null>(null);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const canEdit = role === "OWNER" || role === "MANAGER" || role === "MARKETING";
  const canApprove = role === "OWNER" || role === "MANAGER";

  const provisional = useMemo(() => {
    if (!business?.name || !business.primaryCustomerOutcome) {
      return {
        draft,
        manifest: {
          usedFactIds: [],
          usedBrandDecisionIds: [],
          omissions: [],
          questions: [],
          generatorOwnedSectionIds: draft.sections.map((section) => section.id),
        },
      };
    }
    const approvedFacts: ApprovedCardFact[] = facts
      .filter(
        (fact) =>
          fact.approvalStatus === "APPROVED" &&
          fact.contradictionStatus === "NONE"
      )
      .map((fact) => ({
        id: fact.id,
        factKey: fact.factKey,
        value: fact.value,
      }));
    return buildFirstCardDraft({
      businessName: business.name,
      outcome: business.primaryCustomerOutcome as Parameters<
        typeof buildFirstCardDraft
      >[0]["outcome"],
      facts: approvedFacts,
    });
  }, [business, draft, facts]);

  function go(next: number) {
    setStage(next);
    const url = new URL(window.location.href);
    url.searchParams.set(
      "stage",
      (["business", "knowledge", "brand", "card"] as const)[next] ?? "business"
    );
    window.history.replaceState(window.history.state, "", url);
    window.setTimeout(() => headingRef.current?.focus(), 0);
  }

  async function requestJson(path: string, init?: RequestInit) {
    const response = await fetch(path, init);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  async function saveBusiness(form: HTMLFormElement) {
    setBusy("business");
    setError(null);
    setMessage(null);
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") || ""),
      website: String(data.get("website") || ""),
      phone: String(data.get("phone") || ""),
      email: String(data.get("email") || ""),
      businessCategory: String(data.get("businessCategory") || ""),
      primaryCustomerOutcome: String(data.get("primaryCustomerOutcome") || ""),
    };
    try {
      const result = await requestJson("/api/business", {
        method: business ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const next = result.business;
      setBusiness({
        name: next.name,
        website: next.website,
        phone: next.phone,
        email: next.email,
        businessCategory: next.businessCategory,
        primaryCustomerOutcome: next.primaryCustomerOutcome,
        previewedAt: next.cardFirstOnboardingPreviewedAt || null,
      });
      if (result.draft) {
        setDraft(result.draft);
        setRevision(1);
      }
      setMessage("Your business basics are saved. Your provisional Card is ready.");
      go(1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Business details could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  async function refreshKnowledge() {
    const data = await requestJson("/api/business/knowledge");
    setFacts(data.facts);
  }

  async function reviewWebsite() {
    if (!business?.website) {
      setError("Add a website first, or continue with manual entry.");
      return;
    }
    setBusy("website");
    setError(null);
    setMessage("Reviewing the public homepage only…");
    try {
      await requestJson("/api/business/knowledge/website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website: business.website }),
      });
      await refreshKnowledge();
      await refreshDecisions();
      setMessage(
        "Homepage findings and Brand suggestions are ready. They remain Suggested until you approve them."
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Homepage review failed.");
      setMessage("You can continue with manual entry.");
    } finally {
      setBusy(null);
    }
  }

  async function decideFact(factId: string, decision: "APPROVED" | "REJECTED") {
    setBusy(factId);
    setError(null);
    try {
      await requestJson("/api/business/knowledge", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factId, decision }),
      });
      await refreshKnowledge();
      await regenerate();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Fact could not be updated.");
    } finally {
      setBusy(null);
    }
  }

  async function saveManualFacts(form: HTMLFormElement) {
    const formData = new FormData(form);
    const entries = ["phone", "email", "description", "reviewUrl", "bookingUrl", "address"]
      .map((factKey) => ({ factKey, value: String(formData.get(factKey) || "").trim() }))
      .filter((fact) => fact.value);
    if (!entries.length) {
      setError("Enter at least one fact to save.");
      return;
    }
    setBusy("manual-facts");
    setError(null);
    try {
      await requestJson("/api/business/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facts: entries, sourceLabel: "Owner confirmed" }),
      });
      await refreshKnowledge();
      await regenerate();
      form.reset();
      setMessage("Confirmed facts saved to Business Knowledge.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Facts could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  async function refreshDecisions() {
    const data = await requestJson("/api/brand/decisions");
    setDecisions(data.decisions);
  }

  async function prepareStarterKit() {
    setBusy("starter");
    setError(null);
    const proposals = [
      {
        propertyKey: "primaryColor",
        candidate: "#b7ff2a",
        rationale: "High-visibility TapConnect starter accent.",
        rightsStatus: "NOT_APPLICABLE",
      },
      {
        propertyKey: "backgroundColor",
        candidate: "#0b0f12",
        rationale: "Dark neutral surface with accessible contrast.",
        rightsStatus: "NOT_APPLICABLE",
      },
      {
        propertyKey: "textColor",
        candidate: "#ffffff",
        rationale: "Readable text on the proposed dark surface.",
        rightsStatus: "NOT_APPLICABLE",
      },
      {
        propertyKey: "fontStyle",
        candidate: "MODERN",
        rationale: "Clean, broadly legible starter typography.",
        rightsStatus: "NOT_APPLICABLE",
      },
      {
        propertyKey: "imageryDirection",
        candidate: "Use authentic, rights-cleared business imagery with clear focal subjects.",
        rationale: "A safe direction, not an invented business claim.",
        rightsStatus: "NOT_APPLICABLE",
      },
      {
        propertyKey: "styleCue",
        candidate: "Clear, direct and high contrast",
        rationale: "Supports quick scanning on a customer Card.",
        rightsStatus: "NOT_APPLICABLE",
      },
      {
        propertyKey: "voiceCue",
        candidate: "Plain, helpful and factual",
        rationale: "Avoids unverified claims.",
        rightsStatus: "NOT_APPLICABLE",
      },
      {
        propertyKey: "accessibility",
        candidate: "Proposed starter colors meet a high-contrast direction; verify final combinations.",
        rationale: "Accessibility remains visible during Brand review.",
        rightsStatus: "NOT_APPLICABLE",
      },
    ];
    try {
      const existing = new Set(decisions.map((decision) => decision.propertyKey));
      for (const proposal of proposals.filter((item) => !existing.has(item.propertyKey))) {
        await requestJson("/api/brand/decisions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...proposal, scope: "BRAND", confidence: 0.8 }),
        });
      }
      await refreshDecisions();
      setMessage("Brand Starter Kit prepared. Suggestions are not approved yet.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Starter Kit could not be prepared.");
    } finally {
      setBusy(null);
    }
  }

  async function decideBrand(
    decisionId: string,
    action: "KEEP" | "APPROVE" | "REJECT" | "LOCK" | "UNLOCK"
  ) {
    setBusy(decisionId);
    setError(null);
    try {
      await requestJson("/api/brand/decisions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisionId, action }),
      });
      await refreshDecisions();
      if (action === "APPROVE") await regenerate();
      setMessage(
        action === "KEEP"
          ? "Kept for comparison. This is not approval."
          : `Brand choice ${action.toLowerCase()}d.`
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Brand choice could not be updated.");
    } finally {
      setBusy(null);
    }
  }

  async function proposeDecisionScope(
    decision: DecisionState,
    scope: "BRAND" | "CARD_ONLY"
  ) {
    setBusy(decision.id);
    try {
      await requestJson("/api/brand/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyKey: decision.propertyKey,
          candidate: decision.candidate,
          scope,
          mediaAssetId: decision.mediaAsset?.id,
          provider: decision.provider,
          confidence: decision.confidence,
          rationale: decision.rationale,
          rightsStatus: decision.rightsStatus,
        }),
      });
      await refreshDecisions();
      setMessage(
        scope === "BRAND"
          ? "Proposed for use across Brand. Approve it to apply."
          : "Proposed as a Card-only choice. Approve it to apply only here."
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Scope could not be changed.");
    } finally {
      setBusy(null);
    }
  }

  async function approveMedia(assetId: string) {
    setBusy(assetId);
    try {
      await requestJson(`/api/media/${assetId}/approve`, { method: "POST" });
      await refreshDecisions();
      setMessage("Asset approved for Brand review. Approve the Brand choice separately.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Media could not be approved.");
    } finally {
      setBusy(null);
    }
  }

  async function selectMedia(asset: MediaAssetCandidate) {
    try {
      await requestJson("/api/brand/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyKey: mediaProperty,
          candidate: asset.url,
          scope: "BRAND",
          mediaAssetId: asset.mediaAssetId,
          provider: asset.source,
          confidence: 0.8,
          rationale: `${asset.sourceLabel} candidate selected for review.`,
          rightsStatus: asset.rights ? "CONFIRMED" : "NEEDS_CONFIRMATION",
        }),
      });
      await refreshDecisions();
      setMessage("Asset added as Suggested. Discovery is not Brand approval.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Asset could not be proposed.");
    }
  }

  async function regenerate() {
    try {
      const data = await requestJson("/api/card/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      });
      setDraft(data.draft);
      setDirty(true);
      setMessage("Card improved from approved facts and Brand choices. Save when ready.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Card could not be regenerated.");
    }
  }

  async function saveDraft() {
    setBusy("draft");
    setError(null);
    try {
      const data = await requestJson("/api/card/draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft, expectedRevision: revision }),
      });
      setRevision(data.revision);
      setDirty(false);
      setMessage("Saved draft · Draft changes not published");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Draft could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  async function completeOnboarding() {
    setBusy("complete");
    setError(null);
    try {
      const data = await requestJson("/api/card/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      router.push(data.redirectTo || "/dashboard/card");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Preview the saved draft before completing onboarding."
      );
    } finally {
      setBusy(null);
    }
  }

  const previewConfig =
    stage === 0 && business ? provisional.draft : draft;
  const profile = {
    organization: business?.name || "Your business",
    displayName: business?.name || "Your business",
    phone: business?.phone || undefined,
    email: business?.email || undefined,
    website: business?.website || undefined,
  };
  const question = provisional.manifest.questions[0];

  return (
    <main className="min-h-screen bg-[#060809] text-white">
      <div className="mx-auto max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-lime-300">
              TapConnect Studio
            </p>
            <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
              Your first living Card
            </h1>
          </div>
          <div className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/70">
            Draft changes not published
          </div>
        </header>

        <ol
          className="mb-5 grid gap-2 sm:grid-cols-4"
          aria-label="Onboarding progress"
        >
          {STEP_LABELS.map((label, index) => (
            <li
              key={label}
              className={`rounded-xl border px-3 py-3 text-xs ${
                index === stage
                  ? "border-lime-300/60 bg-lime-300/10 text-lime-100"
                  : index < stage
                    ? "border-white/15 bg-white/5 text-white/75"
                    : "border-white/10 text-white/45"
              }`}
              aria-current={index === stage ? "step" : undefined}
            >
              <span className="mr-2 font-semibold">{index + 1}</span>
              {label}
              {index < stage ? <span className="sr-only"> completed</span> : null}
            </li>
          ))}
        </ol>

        <Button
          type="button"
          variant="outline"
          className="mb-4 min-h-11 w-full justify-between lg:hidden"
          aria-expanded={mobilePreviewOpen}
          onClick={() => setMobilePreviewOpen((open) => !open)}
        >
          Living Card preview
          <ChevronDown className={mobilePreviewOpen ? "rotate-180" : ""} />
        </Button>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section
            className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-6"
            aria-labelledby="onboarding-step-heading"
          >
            <h2
              id="onboarding-step-heading"
              ref={headingRef}
              tabIndex={-1}
              className="text-xl font-semibold outline-none sm:text-2xl"
            >
              {STEP_LABELS[stage]}
            </h2>
            <p className="mt-2 text-sm text-white/60">
              {stage === 0
                ? "Start with the few details that shape a useful Card."
                : stage === 1
                  ? "Nothing found on a website becomes a fact until you approve it."
                  : stage === 2
                    ? "Review Brand choices, their source and their rights before approval."
                    : "Save, edit and preview the draft. Preview does not publish."}
            </p>

            {error ? (
              <div className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100" role="alert">
                {error}
              </div>
            ) : null}
            <div className="sr-only" aria-live="polite">
              {message}
            </div>
            {message ? (
              <p className="mt-4 rounded-xl border border-lime-300/20 bg-lime-300/5 p-3 text-sm text-lime-100" role="status">
                {message}
              </p>
            ) : null}
            {!canEdit ? (
              <p className="mt-4 rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white/70">
                Read-only access. Ask an Owner or Manager to approve changes.
              </p>
            ) : null}

            {stage === 0 ? (
              <form
                className="mt-6 grid gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveBusiness(event.currentTarget);
                }}
              >
                <div className="grid gap-2">
                  <Label htmlFor="business-name">Business name</Label>
                  <Input
                    id="business-name"
                    name="name"
                    required
                    minLength={2}
                    defaultValue={business?.name || ""}
                    autoComplete="organization"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="business-website">Website or domain</Label>
                    <Input
                      id="business-website"
                      name="website"
                      type="url"
                      defaultValue={business?.website || ""}
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="business-phone">Phone (optional)</Label>
                    <Input
                      id="business-phone"
                      name="phone"
                      type="tel"
                      defaultValue={business?.phone || ""}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="business-email">Email (optional)</Label>
                  <Input
                    id="business-email"
                    name="email"
                    type="email"
                    defaultValue={business?.email || ""}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="business-category">Business category</Label>
                    <select
                      id="business-category"
                      name="businessCategory"
                      required
                      defaultValue={business?.businessCategory || ""}
                      className="min-h-11 rounded-lg border border-white/15 bg-black/30 px-3 text-sm"
                    >
                      <option value="" disabled>Choose a category</option>
                      {CATEGORY_OPTIONS.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="customer-outcome">First customer outcome</Label>
                    <select
                      id="customer-outcome"
                      name="primaryCustomerOutcome"
                      required
                      defaultValue={business?.primaryCustomerOutcome || ""}
                      className="min-h-11 rounded-lg border border-white/15 bg-black/30 px-3 text-sm"
                    >
                      <option value="" disabled>Choose an outcome</option>
                      {OUTCOME_OPTIONS.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <Button type="submit" className="min-h-11 sm:w-fit" disabled={!canEdit || busy === "business"}>
                  {busy === "business" ? "Saving…" : business ? "Save and continue" : "Create my first Card"}
                </Button>
              </form>
            ) : null}

            {stage === 1 ? (
              <div className="mt-6 space-y-6">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className="min-h-11"
                    onClick={() => void reviewWebsite()}
                    disabled={!canEdit || busy === "website" || !business?.website}
                  >
                    <RefreshCw />
                    {busy === "website" ? "Reviewing homepage…" : "Review homepage"}
                  </Button>
                  {!business?.website ? (
                    <span className="self-center text-xs text-white/50">
                      No website supplied — manual entry remains available.
                    </span>
                  ) : null}
                </div>

                <div>
                  <h3 className="text-sm font-semibold">Business Knowledge</h3>
                  <div className="mt-3 space-y-3">
                    {facts.length ? facts.map((fact) => (
                      <article key={fact.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-white/45">{fact.factKey}</p>
                            <p className="mt-1 break-words text-sm">{displayValue(fact.value)}</p>
                          </div>
                          <span className="rounded-full border border-white/15 px-2 py-1 text-[11px]">
                            {fact.approvalStatus === "SUGGESTED" ? "Suggested" : fact.approvalStatus}
                          </span>
                        </div>
                        <div className="mt-2">
                          <FieldSourceChip
                            source={
                              fact.source.kind === "WEBSITE"
                                ? "website"
                                : fact.source.kind === "OWNER"
                                  ? "custom"
                                  : "business"
                            }
                          />
                        </div>
                        <dl className="mt-3 grid gap-1 text-xs text-white/55 sm:grid-cols-2">
                          <div><dt className="inline font-medium text-white/75">Source: </dt><dd className="inline">{fact.source.displayLabel}</dd></div>
                          <div><dt className="inline font-medium text-white/75">Confidence: </dt><dd className="inline">{Math.round(fact.confidence * 100)}%</dd></div>
                          <div><dt className="inline font-medium text-white/75">Contradiction: </dt><dd className="inline">{fact.contradictionStatus === "NONE" ? "None found" : fact.contradictionStatus}</dd></div>
                          <div><dt className="inline font-medium text-white/75">Last verified: </dt><dd className="inline">{new Date(fact.lastVerifiedAt).toLocaleDateString()}</dd></div>
                        </dl>
                        {fact.approvalStatus === "SUGGESTED" ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button type="button" size="sm" className="min-h-11" onClick={() => void decideFact(fact.id, "APPROVED")} disabled={!canApprove || busy === fact.id}>
                              Approve fact
                            </Button>
                            <Button type="button" size="sm" variant="outline" className="min-h-11" onClick={() => void decideFact(fact.id, "REJECTED")} disabled={!canApprove || busy === fact.id}>
                              Reject
                            </Button>
                          </div>
                        ) : null}
                      </article>
                    )) : (
                      <div className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-white/55">
                        Missing information is visible here. Review a homepage or add confirmed facts below.
                      </div>
                    )}
                  </div>
                </div>

                {question ? (
                  <div className="rounded-xl border border-amber-300/25 bg-amber-300/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">
                      One useful follow-up
                    </p>
                    <p className="mt-2 text-sm">{question}</p>
                  </div>
                ) : null}

                <form
                  className="grid gap-3 rounded-xl border border-white/10 p-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveManualFacts(event.currentTarget);
                  }}
                >
                  <h3 className="font-semibold">Add or correct confirmed facts</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      ["phone", "Phone", "tel"],
                      ["email", "Email", "email"],
                      ["reviewUrl", "Review link", "url"],
                      ["bookingUrl", "Booking link", "url"],
                      ["address", "Full address (only when needed)", "text"],
                      ["description", "Short factual description", "text"],
                    ]
                      .filter(
                        ([name]) =>
                          name !== "address" ||
                          business?.primaryCustomerOutcome === "DIRECTIONS"
                      )
                      .map(([name, label, type]) => (
                      <div className="grid gap-2" key={name}>
                        <Label htmlFor={`fact-${name}`}>{label}</Label>
                        <Input id={`fact-${name}`} name={name} type={type} />
                      </div>
                    ))}
                  </div>
                  <Button type="submit" variant="outline" className="min-h-11 sm:w-fit" disabled={!canEdit || busy === "manual-facts"}>
                    Save confirmed facts
                  </Button>
                </form>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => go(0)}>Back</Button>
                  <Button type="button" className="min-h-11" onClick={() => go(2)}>Continue to Brand</Button>
                </div>
              </div>
            ) : null}

            {stage === 2 ? (
              <div className="mt-6 space-y-5">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" className="min-h-11" onClick={() => void prepareStarterKit()} disabled={!canEdit || busy === "starter"}>
                    <Sparkles />
                    {busy === "starter" ? "Preparing…" : "Prepare Brand Starter Kit"}
                  </Button>
                  <Button type="button" variant="outline" className="min-h-11" disabled={!canEdit} onClick={() => { setMediaProperty("logo"); setMediaOpen(true); }}>
                    <ImagePlus /> Replace logo
                  </Button>
                  <Button type="button" variant="outline" className="min-h-11" disabled={!canEdit} onClick={() => { setMediaProperty("imageryDirection"); setMediaOpen(true); }}>
                    Browse Pexels imagery
                  </Button>
                </div>
                <p className="text-xs text-white/50">
                  Logo.dev and Pexels open in the completed Shared Media & Asset Browser. Imported assets remain unapproved until you approve them.
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  {decisions.length ? decisions.map((decision) => (
                    <article key={decision.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-white/45">{decision.propertyKey}</p>
                          <p className="mt-1 break-words text-sm">{decisionValue(decision.candidate)}</p>
                        </div>
                        {decision.locked ? <Lock className="text-lime-300" aria-label="Locked" /> : null}
                      </div>
                      <dl className="mt-3 space-y-1 text-xs text-white/55">
                        <div><dt className="inline text-white/75">Status: </dt><dd className="inline">{decision.status}</dd></div>
                        <div><dt className="inline text-white/75">Source: </dt><dd className="inline">{decision.provider || "TapConnect deterministic starter"}</dd></div>
                        <div><dt className="inline text-white/75">Rights: </dt><dd className="inline">{decision.rightsStatus === "NEEDS_CONFIRMATION" ? "Needs rights confirmation" : decision.rightsStatus}</dd></div>
                        <div><dt className="inline text-white/75">Scope: </dt><dd className="inline">{decision.scope === "BRAND" ? "Use across Brand" : "Use only here"}</dd></div>
                      </dl>
                      {decision.rationale ? <p className="mt-2 text-xs text-white/50">{decision.rationale}</p> : null}
                      {decision.mediaAsset && decision.mediaAsset.approvalStatus !== "APPROVED" ? (
                          <Button type="button" size="sm" variant="outline" className="mt-3 min-h-11" onClick={() => void approveMedia(decision.mediaAsset!.id)} disabled={!canApprove || busy === decision.mediaAsset.id}>
                          <ShieldCheck /> Approve asset rights
                        </Button>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" className="min-h-11" disabled={!canEdit} onClick={() => void decideBrand(decision.id, "KEEP")}>Keep</Button>
                        <Button type="button" size="sm" variant="outline" className="min-h-11" onClick={() => setCompareId(compareId === decision.id ? null : decision.id)}>Compare</Button>
                        <Button type="button" size="sm" variant="outline" className="min-h-11" disabled={!canEdit} onClick={() => { setMediaProperty(decision.propertyKey === "logo" ? "logo" : "imageryDirection"); setMediaOpen(true); }}>Replace</Button>
                        <Button type="button" size="sm" variant="outline" className="min-h-11" disabled={!canEdit} onClick={() => setMessage("Edit creates a new proposal; use Replace or the existing Creative Studio controls.")}>Edit</Button>
                        {decision.status !== "APPROVED" ? (
                          <Button type="button" size="sm" className="min-h-11" onClick={() => void decideBrand(decision.id, "APPROVE")} disabled={!canApprove || busy === decision.id}>Approve</Button>
                        ) : (
                          <Button type="button" size="sm" className="min-h-11" onClick={() => void decideBrand(decision.id, decision.locked ? "UNLOCK" : "LOCK")} disabled={!canApprove || busy === decision.id}>
                            {decision.locked ? "Unlock" : "Lock"}
                          </Button>
                        )}
                        <Button type="button" size="sm" variant="destructive" className="min-h-11" onClick={() => void decideBrand(decision.id, "REJECT")} disabled={!canApprove || busy === decision.id}>Reject</Button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button type="button" size="xs" variant="ghost" disabled={!canEdit} onClick={() => void proposeDecisionScope(decision, "CARD_ONLY")}>
                          Use only here
                        </Button>
                        <Button type="button" size="xs" variant="ghost" disabled={!canEdit} onClick={() => void proposeDecisionScope(decision, "BRAND")}>
                          Use across Brand
                        </Button>
                      </div>
                      {compareId === decision.id ? (
                        <div className="mt-3 rounded-lg border border-lime-300/20 bg-lime-300/5 p-3 text-xs">
                          Compare in the living Card preview. Keep does not approve; Approve makes the choice eligible for generation.
                        </div>
                      ) : null}
                    </article>
                  )) : (
                    <div className="sm:col-span-2 rounded-xl border border-dashed border-white/15 p-5 text-sm text-white/55">
                      Prepare the Starter Kit to see colors, fonts, imagery, style, voice and accessibility findings.
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => go(1)}>Back</Button>
                  <Button type="button" className="min-h-11" onClick={() => { void regenerate(); go(3); }}>Continue to first Card</Button>
                </div>
              </div>
            ) : null}

            {stage === 3 ? (
              <div className="mt-6 space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 p-4">
                    <p className="text-xs text-white/45">Editing state</p>
                    <p className="mt-1 font-medium">{dirty ? "Unsaved changes" : "Saved draft"}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 p-4">
                    <p className="text-xs text-white/45">Public state</p>
                    <p className="mt-1 font-medium">Draft changes not published</p>
                  </div>
                  <div className="rounded-xl border border-white/10 p-4">
                    <p className="text-xs text-white/45">Tap Point</p>
                    <p className="mt-1 font-medium">Not assigned</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" className="min-h-11" onClick={() => void saveDraft()} disabled={!canEdit || busy === "draft"}>
                    <Check /> {busy === "draft" ? "Saving…" : "Save draft"}
                  </Button>
                  <Button type="button" variant="outline" className="min-h-11" disabled={!canEdit} onClick={() => void regenerate()}>
                    <RefreshCw /> Improve from approved choices
                  </Button>
                  <Link href="/dashboard/card/edit?returnTo=%2Fonboarding" className="inline-flex min-h-11 items-center rounded-lg border border-white/20 px-3 text-sm">
                    Edit in Creative Studio
                  </Link>
                  <Link
                    href="/dashboard/card/preview"
                    className="inline-flex min-h-11 items-center rounded-lg border border-lime-300/30 bg-lime-300/10 px-3 text-sm text-lime-100"
                    data-testid="onboarding-preview-same-tab"
                  >
                    <Eye className="mr-2 h-4 w-4" /> Preview as customer
                  </Link>
                </div>
                <p className="text-sm text-white/55">
                  Customer Preview is view-only and required before onboarding can be completed. It does not publish the Card.
                </p>
                <div className="flex flex-wrap gap-2 border-t border-white/10 pt-5">
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => go(2)}>Back</Button>
                  <Button type="button" className="min-h-11" onClick={() => void completeOnboarding()} disabled={!canEdit || busy === "complete" || dirty}>
                    {busy === "complete" ? "Checking preview…" : "Finish onboarding"}
                  </Button>
                </div>
              </div>
            ) : null}
          </section>

          <aside
            className={`${mobilePreviewOpen ? "block" : "hidden"} lg:block`}
            aria-label="Living Card preview"
          >
            <div className="lg:sticky lg:top-5 rounded-2xl border border-white/10 bg-[#101416] p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-lime-300">Living preview</p>
                  <p className="text-xs text-white/50">{dirty ? "Unsaved changes" : "Saved draft"}</p>
                </div>
                <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-white/55">Not published</span>
              </div>
              <div className="mx-auto max-w-[390px] overflow-hidden rounded-[28px] border border-white/15 bg-black p-2 shadow-2xl">
                <TapConnectCard
                  config={previewConfig}
                  profile={profile}
                  businessName={business?.name || "Your business"}
                  logoUrl={null}
                  forceExpanded
                  interactionMode="preview"
                  previewSafe
                />
              </div>
            </div>
          </aside>
        </div>
      </div>

      <SharedMediaAssetBrowser
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        onSelect={(asset) => void selectMedia(asset)}
        mediaUploadReady={mediaUploadReady}
        stockReady={stockReady}
        initialTab={mediaProperty === "logo" ? "logo_dev" : "pexels"}
        selectionKind={mediaProperty === "logo" ? "logo" : "photo"}
        title={mediaProperty === "logo" ? "Choose a logo candidate" : "Choose imagery direction"}
      />
    </main>
  );
}
