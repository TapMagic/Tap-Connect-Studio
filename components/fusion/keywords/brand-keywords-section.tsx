"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeywordsSuggestPanel } from "@/components/fusion/keywords/keywords-suggest-panel";
import {
  EMPTY_BRAND_PACK,
  parseKeywordBrandPack,
  type BrandTerm,
  type KeywordBrandPack,
} from "@/lib/fusion/keywords/client";

type BrandKeywordsSectionProps = {
  initialPack?: unknown;
};

/** Brand Kit section — manage Brand Pack vocabulary + suggest/accept/persist. */
export function BrandKeywordsSection({ initialPack }: BrandKeywordsSectionProps) {
  const [pack, setPack] = useState<KeywordBrandPack>(() =>
    parseKeywordBrandPack(initialPack ?? EMPTY_BRAND_PACK)
  );
  const [draft, setDraft] = useState("");
  const [editValue, setEditValue] = useState("");
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [locale, setLocale] = useState("en");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [featureOff, setFeatureOff] = useState(false);
  const [readiness, setReadiness] = useState("FUNCTIONAL — FINAL VERIFICATION REQUIRED");

  const reload = useCallback(async () => {
    const res = await fetch("/api/ai/keywords");
    const json = await res.json();
    if (res.status === 503 || json.code === "feature_off") {
      setFeatureOff(true);
      setReadiness("DISABLED — Admin kill switch (ai.keywords)");
      setHydrated(true);
      return;
    }
    setFeatureOff(false);
    if (res.ok && json.pack) {
      setPack(json.pack);
      setLocale(json.pack.locale || "en");
    }
    setReadiness("FUNCTIONAL — FINAL VERIFICATION REQUIRED");
    setHydrated(true);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function persist(next: KeywordBrandPack) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/ai/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_brand_pack", pack: next }),
      });
      const json = await res.json();
      if (res.status === 503 || json.code === "feature_off") {
        setFeatureOff(true);
        setMessage("Keywords feature is off");
        return false;
      }
      if (res.ok) {
        setPack(json.pack);
        setMessage("Brand Pack saved");
        return true;
      }
      setMessage(typeof json.error === "string" ? json.error : "Save failed");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function addTerm(
    list:
      | "approvedTerms"
      | "brandedHashtags"
      | "bannedTerms"
      | "locationVocabulary"
      | "productVocabulary"
      | "audienceVocabulary"
      | "requiredTerms"
      | "competitorExclusions"
      | "recurringCampaignTags"
  ) {
    const value = draft.trim();
    if (!value) return;
    const term: BrandTerm = {
      id: `manual_${Date.now().toString(36)}`,
      value:
        list === "brandedHashtags" && !value.startsWith("#")
          ? `#${value.replace(/\s+/g, "")}`
          : value,
      kind:
        list === "brandedHashtags"
          ? "hashtag"
          : list === "competitorExclusions"
            ? "competitor"
            : "keyword",
    };
    const next: KeywordBrandPack = {
      ...pack,
      locale,
      [list]: [...pack[list], term],
      updatedAt: new Date().toISOString(),
    };
    setPack(next);
    setDraft("");
    await persist(next);
  }

  async function saveLocale() {
    const next = { ...pack, locale, updatedAt: new Date().toISOString() };
    setPack(next);
    await persist(next);
    setMessage(`Locale set to ${locale}`);
  }

  const allEditableTerms: BrandTerm[] = [
    ...pack.approvedTerms,
    ...pack.brandedHashtags,
    ...pack.requiredTerms,
    ...pack.bannedTerms,
    ...pack.competitorExclusions,
    ...pack.locationVocabulary,
    ...pack.productVocabulary,
    ...pack.audienceVocabulary,
    ...pack.recurringCampaignTags,
  ];

  const selected = allEditableTerms.find((t) => t.id === selectedTermId) ?? null;

  async function runTermAction(action: "lock" | "archive" | "restore" | "edit", locked?: boolean) {
    if (!selectedTermId) return;
    setSaving(true);
    setMessage(null);
    try {
      const body =
        action === "edit"
          ? { action: "edit", termId: selectedTermId, value: editValue.trim() || undefined, locale }
          : action === "lock"
            ? { action: "lock", termId: selectedTermId, locked: locked ?? true }
            : { action, termId: selectedTermId };
      const res = await fetch("/api/ai/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.status === 503 || json.code === "feature_off") {
        setFeatureOff(true);
        setMessage("Keywords feature is off");
        return;
      }
      if (!res.ok) {
        setMessage(typeof json.error === "string" ? json.error : `${action} failed`);
        return;
      }
      if (json.pack) setPack(json.pack);
      else await reload();
      setMessage(
        action === "lock"
          ? locked
            ? "Term locked"
            : "Term unlocked"
          : action === "edit"
            ? "Term edited"
            : action === "archive"
              ? "Term archived"
              : "Term restored"
      );
      setEditValue("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card data-testid="brand-keywords-section">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Keywords &amp; Hashtags Brand Pack</CardTitle>
        <p className="text-xs text-muted-foreground">
          Approved brand terms, hashtags, required/banned lists, location/product/audience vocabulary.
          Live trend enrichment: VERIFIED — CREDENTIALS REQUIRED.
        </p>
        <p
          className="text-[11px] font-medium text-primary"
          data-testid="keywords-readiness-status"
        >
          Readiness: {readiness}
        </p>
        {featureOff ? (
          <p className="text-xs text-amber-600" data-testid="keywords-feature-off-banner">
            Admin kill switch: <code>ai.keywords</code> is disabled. UI + API + runtime suggestions are
            off. Re-enable in Platform Admin → Features.
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <KeywordsSuggestPanel
          surface="brand_kit"
          defaultChannel="instagram"
          defaultOpen
          locationLabels={pack.locationVocabulary.map((t) => t.value)}
          knownProducts={pack.productVocabulary.map((t) => t.value)}
          audienceHints={pack.audienceVocabulary.map((t) => t.value)}
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="kw-locale">Locale</Label>
            <Input
              id="kw-locale"
              data-testid="brand-keywords-locale"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              placeholder="en"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid="brand-keywords-locale-save"
              disabled={!hydrated || saving || featureOff}
              onClick={() => void saveLocale()}
            >
              Save locale
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="kw-draft">Add term</Label>
            <Input
              id="kw-draft"
              data-testid="brand-keywords-draft"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Term or #Hashtag"
              disabled={featureOff}
            />
          </div>
          <div className="flex flex-wrap items-end gap-1.5">
            <Button
              type="button"
              size="sm"
              data-testid="brand-kw-add-approved"
              disabled={!hydrated || saving || featureOff}
              onClick={() => void addTerm("approvedTerms")}
            >
              Approved
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!hydrated || saving || featureOff}
              onClick={() => void addTerm("brandedHashtags")}
            >
              Hashtag
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!hydrated || saving || featureOff}
              onClick={() => void addTerm("bannedTerms")}
            >
              Banned
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid="brand-kw-add-competitor"
              disabled={!hydrated || saving || featureOff}
              onClick={() => void addTerm("competitorExclusions")}
            >
              Competitor
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!hydrated || saving || featureOff}
              onClick={() => void addTerm("locationVocabulary")}
            >
              Location
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!hydrated || saving || featureOff}
              onClick={() => void addTerm("productVocabulary")}
            >
              Product
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!hydrated || saving || featureOff}
              onClick={() => void addTerm("audienceVocabulary")}
            >
              Audience
            </Button>
          </div>
        </div>

        <div
          className="space-y-2 rounded-md border border-border/60 p-3"
          data-testid="brand-keywords-term-ops"
        >
          <p className="text-xs font-medium text-muted-foreground">
            Edit · Lock · Archive / Restore (shared BrandVocabularyTerm store)
          </p>
          <div className="flex flex-wrap gap-2">
            <select
              className="h-9 min-w-[12rem] rounded-md border border-input bg-background px-2 text-xs"
              data-testid="brand-keywords-term-select"
              value={selectedTermId ?? ""}
              disabled={featureOff}
              onChange={(e) => {
                setSelectedTermId(e.target.value || null);
                const t = allEditableTerms.find((x) => x.id === e.target.value);
                setEditValue(t?.value ?? "");
              }}
            >
              <option value="">Select term…</option>
              {allEditableTerms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.value}
                  {t.locked ? " 🔒" : ""}
                </option>
              ))}
            </select>
            <Input
              data-testid="brand-keywords-edit-value"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="Edited value"
              className="max-w-xs"
              disabled={featureOff || !selectedTermId}
            />
            <Button
              type="button"
              size="sm"
              data-testid="brand-keywords-edit"
              disabled={!selectedTermId || saving || featureOff}
              onClick={() => void runTermAction("edit")}
            >
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid="brand-keywords-lock"
              disabled={!selectedTermId || saving || featureOff}
              onClick={() => void runTermAction("lock", true)}
            >
              Lock
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid="brand-keywords-unlock"
              disabled={!selectedTermId || saving || featureOff}
              onClick={() => void runTermAction("lock", false)}
            >
              Unlock
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid="brand-keywords-archive"
              disabled={!selectedTermId || saving || featureOff}
              onClick={() => void runTermAction("archive")}
            >
              Archive
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid="brand-keywords-restore"
              disabled={!selectedTermId || saving || featureOff}
              onClick={() => void runTermAction("restore")}
            >
              Restore
            </Button>
          </div>
          {selected ? (
            <p className="text-[11px] text-muted-foreground" data-testid="brand-keywords-selected-meta">
              Selected: {selected.value}
              {selected.locked ? " · locked" : ""} · id={selected.id}
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 text-xs sm:grid-cols-2">
          <PackList title="Approved" items={pack.approvedTerms.map((t) => t.value)} testId="brand-kw-approved-list" />
          <PackList title="Branded hashtags" items={pack.brandedHashtags.map((t) => t.value)} />
          <PackList title="Banned" items={pack.bannedTerms.map((t) => t.value)} />
          <PackList
            title="Competitor exclusions"
            items={pack.competitorExclusions.map((t) => t.value)}
            testId="brand-kw-competitor-list"
          />
          <PackList title="Locations" items={pack.locationVocabulary.map((t) => t.value)} />
          <PackList title="Products" items={pack.productVocabulary.map((t) => t.value)} />
          <PackList title="Audience" items={pack.audienceVocabulary.map((t) => t.value)} />
          <PackList title="Recurring campaign tags" items={pack.recurringCampaignTags.map((t) => t.value)} />
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            data-testid="brand-keywords-save"
            disabled={saving || featureOff}
            onClick={() => void persist({ ...pack, locale })}
          >
            {saving ? "Saving…" : "Save Brand Pack"}
          </Button>
          {message ? (
            <p className="text-xs text-primary" data-testid="brand-keywords-section-message">
              {message}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function PackList({
  title,
  items,
  testId,
}: {
  title: string;
  items: string[];
  testId?: string;
}) {
  return (
    <div data-testid={testId}>
      <p className="mb-1 font-medium text-muted-foreground">{title}</p>
      {items.length === 0 ? (
        <p className="text-muted-foreground/70">—</p>
      ) : (
        <p className="break-words">{items.join(", ")}</p>
      )}
    </div>
  );
}
