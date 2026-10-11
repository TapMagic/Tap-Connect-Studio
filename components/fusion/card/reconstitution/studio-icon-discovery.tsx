"use client";

import { useEffect, useMemo, useState } from "react";
import { ICON_LIBRARY } from "@/lib/fusion/creative-studio/card-creative-system";
import { createIconAsset, nativeIconAsset, type IconAsset } from "@/lib/fusion/creative-studio/icon-asset";
import { StudioVisualDiscovery, type StudioVisualChoice } from "./studio-visual-discovery";
import { StudioTapitAffordance } from "./studio-tapit-affordance";
import { cn } from "@/lib/utils";

type IconHit = { collection: string; name: string; canonicalId: string; source: string; svg?: string };
type Source = "recent" | "recommended" | "stock";

function assetFromHit(hit: IconHit) {
  return hit.svg ? createIconAsset({ provider: "iconify", collection: hit.collection, iconName: hit.name, svg: hit.svg, source: hit.source }) : null;
}

export function StudioIconDiscovery({ currentIcon, intentQuery, onSelect, approvedAssets, allowBlank = false, onSelectBlank, label, description, sourceLabelForAsset }: {
  currentIcon?: string;
  intentQuery?: string;
  onSelect: (asset: IconAsset) => void;
  approvedAssets?: readonly IconAsset[];
  allowBlank?: boolean;
  onSelectBlank?: () => void;
  label?: string;
  description?: string;
  sourceLabelForAsset?: (asset: IconAsset) => string;
}) {
  const [source, setSource] = useState<Source>("recommended");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<IconHit[]>([]);
  const [recentAssets, setRecentAssets] = useState<IconAsset[]>([]);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    if (approvedAssets) return;
    let cancelled = false;
    fetch("/api/studio/activity?consumer=card-composer&context=icon-discovery&resourceKind=icon&limit=12")
      .then(async (response) => response.ok ? response.json() as Promise<{ recents?: Array<{ resource: { provider: string; resourceId: string } }> }> : { recents: [] })
      .then(async ({ recents = [] }) => {
        const assets = await Promise.all(recents.map(async ({ resource }) => {
          if (resource.provider === "native") return nativeIconAsset(resource.resourceId.split(":").at(-1) || "");
          if (resource.provider !== "iconify") return null;
          const response = await fetch(`/api/creative/icons?id=${encodeURIComponent(resource.resourceId)}`);
          if (!response.ok) return null;
          const body = await response.json() as { icon?: IconAsset | null };
          return body.icon ?? null;
        }));
        if (!cancelled) setRecentAssets(assets.filter((asset): asset is IconAsset => Boolean(asset)));
      }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [approvedAssets]);

  useEffect(() => {
    if (approvedAssets || source !== "stock" || query.trim().length < 2) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSearchState("loading");
      fetch(`/api/creative/icons?q=${encodeURIComponent(query.trim())}`)
        .then(async (response) => response.json() as Promise<{ icons?: IconHit[]; fallback?: boolean }>)
        .then((body) => { if (!cancelled) { setHits(body.icons ?? []); setSearchState(body.fallback ? "error" : "ready"); } })
        .catch(() => { if (!cancelled) setSearchState("error"); });
    }, 180);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [approvedAssets, query, source]);

  const recommended = useMemo(() => approvedAssets ?? ICON_LIBRARY.flatMap((item) => { const asset = nativeIconAsset(item.id); return asset ? [asset] : []; }), [approvedAssets]);
  const stock = useMemo(() => source === "stock" && query.trim().length >= 2 ? hits.flatMap((hit) => { const asset = assetFromHit(hit); return asset ? [asset] : []; }) : [], [hits, query, source]);
  const assets = approvedAssets ? recommended : source === "recent" ? recentAssets : source === "stock" ? stock : recommended;
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = source === "stock" && !approvedAssets ? assets : assets.filter((asset) => !normalizedQuery || [asset.iconName, asset.canonicalId, asset.accessibleLabel].some((value) => value?.toLowerCase().includes(normalizedQuery)));
  const blankMatches = Boolean(allowBlank && (!normalizedQuery || "blank no icon empty".includes(normalizedQuery)));
  const choices: StudioVisualChoice[] = [
    ...(blankMatches ? [{ id: "__blank__", label: "Blank", sourceLabel: "Love & Theft master", selected: currentIcon === "tapconnect:blank", preview: <span className="text-lg text-white/45" aria-hidden>—</span> }] : []),
    ...filtered.map((asset) => ({
    id: asset.canonicalId,
    label: asset.accessibleLabel || asset.iconName.replaceAll("-", " "),
    sourceLabel: sourceLabelForAsset?.(asset) ?? (asset.provider === "native" ? "TapConnect" : asset.collection),
    selected: currentIcon === asset.iconName || currentIcon === asset.canonicalId,
    preview: <span className="[&_svg]:h-7 [&_svg]:w-7" aria-hidden dangerouslySetInnerHTML={{ __html: asset.body }} />,
  })),
  ];
  const select = (id: string) => {
    if (id === "__blank__") {
      onSelectBlank?.();
      return;
    }
    const asset = filtered.find((candidate) => candidate.canonicalId === id);
    if (!asset) return;
    onSelect(asset);
    setRecentAssets((current) => [asset, ...current.filter((item) => item.canonicalId !== asset.canonicalId)].slice(0, 12));
    void fetch("/api/studio/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource: { provider: asset.provider, resourceId: asset.canonicalId, version: 1 }, resourceKind: "icon", consumer: "card-composer", context: "icon-discovery", operation: "select_for_use" }) });
  };
  const empty = approvedAssets ? "No matching approved semantic inserts." : source === "recent" ? "Icons you use will appear here." : source === "stock" && query.trim().length < 2 ? "Type at least two characters to search the approved Stock libraries." : searchState === "error" ? "Stock search is temporarily unavailable. Recommended icons remain ready." : "No matching visual icons.";
  return <div className="space-y-3" data-testid="studio-icon-discovery">
    <div className="flex items-center justify-between gap-2"><div><p className="text-[10px] font-semibold text-white/78">{label || "Visual Icon discovery"}</p><p className="text-[9px] text-white/35">{description || "Shared across Button and future Icon consumers"}</p></div>{approvedAssets ? null : <StudioTapitAffordance context="icon" operations={[{ id: "intent", label: "Find by action intent", description: `Search approved Stock icons for ${intentQuery || "this Button’s purpose"}.`, onSelect: () => { setSource("stock"); setQuery(intentQuery || "action arrow"); } }]} />}</div>
    {approvedAssets ? null : <div className="flex gap-1" role="tablist" aria-label="Icon sources">{([ ["recent", "Recently Used"], ["recommended", "Recommended"], ["stock", "Stock"] ] as const).map(([id, tabLabel]) => <button key={id} type="button" role="tab" aria-selected={source === id} onClick={() => { setSource(id); if (id !== "stock") setQuery(""); }} className={cn("min-h-8 rounded-full px-2.5 text-[9px] text-white/45 hover:bg-white/7", source === id && "bg-white/9 text-white")}>{tabLabel}</button>)}</div>}
    <StudioVisualDiscovery label="icons" query={query} onQueryChange={(value) => { setQuery(value); if (!approvedAssets && source !== "stock" && value.trim().length >= 2) setSource("stock"); }} choices={choices} onSelect={select} emptyMessage={empty} />
  </div>;
}
