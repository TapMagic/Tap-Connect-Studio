/**
 * Live Card editor model bridge — Adaptive Task Drawer reads latest builder state
 * without portal setState loops.
 */

import type { BrandInheritanceState } from "@/lib/fusion/authoring/brand-inheritance";
import type {
  TapCardSection,
  TapConnectCardConfig,
} from "@/lib/brand/tap-card";

export type CardEditorLiveModel = {
  config: TapConnectCardConfig;
  selected: TapCardSection | null;
  sorted: TapCardSection[];
  brandState: BrandInheritanceState;
  mediaUploadReady: boolean;
  stockReady: boolean;
  freeformEnabled: boolean;
  showFreeform: boolean;
  isAdmin: boolean;
  demoPublished: boolean;
  versions: { id: string; version: number; label: string; publishedAt: string }[];
  logoUrl?: string | null;
  brandKitId?: string | null;
  message: string | null;
  onBrandStateChange: (next: BrandInheritanceState) => void;
  patchConfig: (patch: Partial<TapConnectCardConfig>) => void;
  patchConfigColor: (
    key:
      | "accentColor"
      | "surfaceColor"
      | "textColor"
      | "pillColor"
      | "pillTextColor"
      | "neonColor",
    value: string
  ) => void;
  patchSection: (id: string, patch: Partial<TapCardSection>) => void;
  setSelectedId: (id: string | null) => void;
  setShowFreeform: (v: boolean) => void;
  onRetireToggle: () => void;
  onPublishDemo: (publish: boolean) => void;
  onRollback: (snapshotId: string) => void;
  strInherited: (key: string) => string | undefined;
};

const live: { current: CardEditorLiveModel | null } = { current: null };
const listeners = new Set<() => void>();

export function publishCardEditorLive(model: CardEditorLiveModel | null): void {
  live.current = model;
  listeners.forEach((l) => l());
}

export function getCardEditorLive(): CardEditorLiveModel | null {
  return live.current;
}

export function subscribeCardEditorLive(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
