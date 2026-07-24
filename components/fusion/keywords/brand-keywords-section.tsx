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
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const reload = useCallback(async () => {
    const res = await fetch("/api/ai/keywords");
    const json = await res.json();
    if (res.ok && json.pack) setPack(json.pack);
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
      kind: list === "brandedHashtags" ? "hashtag" : "keyword",
    };
    const next: KeywordBrandPack = {
      ...pack,
      [list]: [...pack[list], term],
      updatedAt: new Date().toISOString(),
    };
    setPack(next);
    setDraft("");
    await persist(next);
  }

  return (
    <Card data-testid="brand-keywords-section">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Keywords &amp; Hashtags Brand Pack</CardTitle>
        <p className="text-xs text-muted-foreground">
          Approved brand terms, hashtags, required/banned lists, location/product/audience vocabulary.
          Live trend enrichment: VERIFIED — CREDENTIALS REQUIRED.
        </p>
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

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="kw-draft">Add term</Label>
            <Input
              id="kw-draft"
              data-testid="brand-keywords-draft"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Term or #Hashtag"
            />
          </div>
          <div className="flex flex-wrap items-end gap-1.5">
            <Button
              type="button"
              size="sm"
              data-testid="brand-kw-add-approved"
              disabled={!hydrated || saving}
              onClick={() => void addTerm("approvedTerms")}
            >
              Approved
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!hydrated || saving}
              onClick={() => void addTerm("brandedHashtags")}
            >
              Hashtag
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!hydrated || saving}
              onClick={() => void addTerm("bannedTerms")}
            >
              Banned
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!hydrated || saving}
              onClick={() => void addTerm("locationVocabulary")}
            >
              Location
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!hydrated || saving}
              onClick={() => void addTerm("productVocabulary")}
            >
              Product
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!hydrated || saving}
              onClick={() => void addTerm("audienceVocabulary")}
            >
              Audience
            </Button>
          </div>
        </div>

        <div className="grid gap-3 text-xs sm:grid-cols-2">
          <PackList title="Approved" items={pack.approvedTerms.map((t) => t.value)} testId="brand-kw-approved-list" />
          <PackList title="Branded hashtags" items={pack.brandedHashtags.map((t) => t.value)} />
          <PackList title="Banned" items={pack.bannedTerms.map((t) => t.value)} />
          <PackList title="Competitor exclusions" items={pack.competitorExclusions.map((t) => t.value)} />
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
            disabled={saving}
            onClick={() => void persist(pack)}
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
