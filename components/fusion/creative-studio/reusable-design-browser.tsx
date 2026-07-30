"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Heart,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ResourceKind =
  | "COMPOSITION"
  | "TEXT_STYLE"
  | "BUTTON_STYLE"
  | "FRAME_TREATMENT"
  | "GRADIENT"
  | "BACKGROUND"
  | "PALETTE"
  | "MASK_FAVORITES"
  | "OFFER_LAYOUT"
  | "COUPON_LAYOUT"
  | "EMAIL_SECTION"
  | "CAMPAIGN_SECTION"
  | "TEMPLATE";

type ResourceDto = {
  id: string;
  kind: ResourceKind;
  name: string;
  status: "DRAFT" | "APPROVED" | "DEPRECATED";
  currentRevisionId: string | null;
  currentRevision: {
    id: string;
    version: number;
    payload: {
      schemaVersion: 1;
      resourceKind: ResourceKind;
      value: unknown;
      metadata?: { description?: string; tags?: string[] };
    };
  } | null;
  favorites?: { id: string }[];
  recents?: { lastUsedAt: string; useCount: number }[];
  _count: { usages: number; revisions: number };
};

export function ReusableDesignBrowser<T>({
  kind,
  value,
  onInsert,
  title = "Reusable designs",
  compact = false,
}: {
  kind: ResourceKind;
  value?: T;
  onInsert: (value: T, label: string, resource: ResourceDto) => void;
  title?: string;
  compact?: boolean;
}) {
  const [resources, setResources] = useState<ResourceDto[]>([]);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteArmed, setDeleteArmed] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/creative-resources?kind=${kind}&query=${encodeURIComponent(query)}`,
        { cache: "no-store" }
      );
      const body = (await response.json()) as {
        resources?: ResourceDto[];
        error?: string;
      };
      if (!response.ok) throw new Error(body.error || "Reusable designs unavailable");
      setResources(body.resources || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Reusable designs unavailable");
    } finally {
      setLoading(false);
    }
  }, [kind, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 150);
    return () => window.clearTimeout(timer);
  }, [load]);

  const selected = useMemo(
    () => resources.find((resource) => resource.id === selectedId) || null,
    [resources, selectedId]
  );

  async function mutate(
    key: string,
    url: string,
    init: RequestInit,
    after?: (body: { resource?: ResourceDto }) => void
  ) {
    setWorking(key);
    setError(null);
    try {
      const response = await fetch(url, {
        ...init,
        headers: { "Content-Type": "application/json", ...init.headers },
      });
      const body = (await response.json()) as {
        resource?: ResourceDto;
        error?: string;
      };
      if (!response.ok) throw new Error(body.error || "Reusable design update failed");
      after?.(body);
      await load();
    } catch (mutationError) {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Reusable design update failed"
      );
    } finally {
      setWorking(null);
    }
  }

  async function saveCurrent() {
    if (!value || !name.trim()) return;
    await mutate("save", "/api/creative-resources", {
      method: "POST",
      body: JSON.stringify({
        kind,
        name: name.trim(),
        payload: {
          schemaVersion: 1,
          resourceKind: kind,
          value,
          metadata: { tags: [] },
        },
      }),
    });
    setName("");
  }

  function insert(resource: ResourceDto) {
    if (!resource.currentRevision) return;
    onInsert(
      resource.currentRevision.payload.value as T,
      `Inserted reusable ${resource.name}`,
      resource
    );
    void fetch(`/api/creative-resources/${resource.id}/used`, { method: "POST" });
  }

  return (
    <section
      className="space-y-3 rounded-xl border border-white/10 bg-white/[0.025] p-3"
      data-testid={`reusable-design-browser-${kind.toLowerCase()}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold">{title}</p>
        <span className="text-[10px] text-white/45">
          {resources.length} saved
        </span>
      </div>

      {value !== undefined ? (
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={`Name this ${kind.toLowerCase().replaceAll("_", " ")}`}
            aria-label="Reusable design name"
          />
          <Button
            type="button"
            size="sm"
            disabled={!name.trim() || working === "save"}
            onClick={() => void saveCurrent()}
          >
            {working === "save" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span className="sr-only">Save as reusable</span>
          </Button>
        </div>
      ) : null}

      <Input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search saved designs"
        aria-label="Search reusable designs"
      />

      {error ? (
        <div role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 p-2 text-xs">
          {error}
          <Button type="button" size="sm" variant="ghost" onClick={() => void load()}>
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 py-3 text-xs text-white/50" role="status">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading reusable designs…
        </div>
      ) : resources.length === 0 ? (
        <p className="py-2 text-xs text-white/45">
          No saved designs yet. Name the current treatment to reuse it.
        </p>
      ) : (
        <div className={`grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-1"}`}>
          {resources.map((resource) => {
            const favorite = Boolean(resource.favorites?.length);
            const recent = resource.recents?.[0];
            const active = selectedId === resource.id;
            return (
              <article
                key={resource.id}
                className={`rounded-lg border p-2 ${
                  active ? "border-[#9cff57]/60 bg-[#9cff57]/5" : "border-white/10"
                }`}
              >
                <button
                  type="button"
                  className="min-h-11 w-full text-left"
                  onClick={() => {
                    setSelectedId(resource.id);
                    insert(resource);
                  }}
                  aria-pressed={active}
                >
                  <span className="block truncate text-xs font-medium">{resource.name}</span>
                  <span className="block text-[10px] text-white/45">
                    v{resource.currentRevision?.version || 0} · {resource.status.toLowerCase()}
                    {recent ? ` · Recent (${recent.useCount})` : ""}
                  </span>
                </button>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`${favorite ? "Remove" : "Add"} ${resource.name} favorite`}
                    onClick={() =>
                      void mutate(
                        `favorite-${resource.id}`,
                        `/api/creative-resources/${resource.id}/favorite`,
                        { method: favorite ? "DELETE" : "PUT" }
                      )
                    }
                  >
                    <Heart className={`h-3.5 w-3.5 ${favorite ? "fill-current" : ""}`} />
                  </Button>
                  {value !== undefined && active ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void mutate(
                          `revise-${resource.id}`,
                          `/api/creative-resources/${resource.id}/revisions`,
                          {
                            method: "POST",
                            body: JSON.stringify({
                              payload: {
                                schemaVersion: 1,
                                resourceKind: kind,
                                value,
                                metadata: { tags: [] },
                              },
                            }),
                          }
                        )
                      }
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      New revision
                    </Button>
                  ) : null}
                  {active && resource.status !== "APPROVED" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void mutate(
                          `approve-${resource.id}`,
                          `/api/creative-resources/${resource.id}/approve`,
                          { method: "POST" }
                        )
                      }
                    >
                      <Check className="mr-1 h-3.5 w-3.5" />
                      Approve
                    </Button>
                  ) : null}
                  {active && name.trim() ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void mutate(
                          `duplicate-${resource.id}`,
                          `/api/creative-resources/${resource.id}/duplicate`,
                          {
                            method: "POST",
                            body: JSON.stringify({ name: name.trim() }),
                          }
                        )
                      }
                    >
                      <Copy className="mr-1 h-3.5 w-3.5" />
                      Duplicate
                    </Button>
                  ) : null}
                  {active ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (deleteArmed !== resource.id) {
                          setDeleteArmed(resource.id);
                          return;
                        }
                        setDeleteArmed(null);
                        void mutate(
                          `delete-${resource.id}`,
                          `/api/creative-resources/${resource.id}`,
                          { method: "DELETE" }
                        );
                      }}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      {deleteArmed === resource.id ? "Confirm delete" : "Delete"}
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selected ? (
        <p className="text-[10px] text-white/45">
          {selected._count.usages} usage reference
          {selected._count.usages === 1 ? "" : "s"} · {selected._count.revisions} revision
          {selected._count.revisions === 1 ? "" : "s"}
        </p>
      ) : null}
    </section>
  );
}
