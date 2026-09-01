"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { SharedMediaAssetBrowser } from "@/components/media/shared-media-asset-browser";
import type { MediaAssetCandidate } from "@/lib/media/asset-browser";
import { studioCatalogBrowserEvent } from "@/lib/fusion/creative-studio/platform/catalog-browser";

type BrowserRequest = {
  onSelect: (asset: MediaAssetCandidate) => void;
  mediaUploadReady: boolean;
  stockReady: boolean;
  selectionKind: "photo" | "logo" | "any";
  title?: string;
};

type SharedMediaBrowserContextValue = {
  openBrowser: (request: BrowserRequest) => void;
};

const SharedMediaBrowserContext =
  createContext<SharedMediaBrowserContextValue | null>(null);

export function SharedMediaBrowserProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<BrowserRequest | null>(null);
  const closeBrowser = useCallback(() => {
    setRequest(null);
    window.dispatchEvent(studioCatalogBrowserEvent("close", "canonical-assets"));
  }, []);
  const openBrowser = useCallback((next: BrowserRequest) => {
    window.dispatchEvent(studioCatalogBrowserEvent("open", "canonical-assets"));
    setRequest(next);
  }, []);
  const value = useMemo(() => ({ openBrowser }), [openBrowser]);

  return (
    <SharedMediaBrowserContext.Provider value={value}>
      {children}
      {request ? (
        <SharedMediaAssetBrowser
          open
          onClose={closeBrowser}
          onSelect={request.onSelect}
          mediaUploadReady={request.mediaUploadReady}
          stockReady={request.stockReady}
          selectionKind={request.selectionKind}
          title={request.title}
        />
      ) : null}
    </SharedMediaBrowserContext.Provider>
  );
}

export function useSharedMediaBrowser() {
  return useContext(SharedMediaBrowserContext);
}
