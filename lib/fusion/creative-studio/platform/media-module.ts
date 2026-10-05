import type { TapExperienceLockedBehavior } from "@/lib/brand/tap-card";

export const STUDIO_VIDEO_MODULE_CONTRACT = "studioVideoModule@1.0.0" as const;

export type StudioVideoProvider = "hosted" | "youtube" | "vimeo" | "provider";
export type StudioVideoPlaybackMode = "play_on_tap" | "autoplay_muted";
export type StudioVideoPresentation = "standard" | "feature";
export type StudioVideoAspect = "16:9" | "1:1" | "9:16";
export type StudioVideoFrameTreatment = "transparent" | "solid" | "glass" | "artist-surface";

export type StudioVideoState = Readonly<{
  contractId: typeof STUDIO_VIDEO_MODULE_CONTRACT;
  provider: StudioVideoProvider;
  sourceUrl: string;
  sourceId?: string;
  playbackMode: StudioVideoPlaybackMode;
  muted: boolean;
  loop: boolean;
  playOnce: boolean;
  controls: boolean;
  playsInline: boolean;
  startSeconds: number;
  endSeconds?: number;
  posterUrl?: string;
  posterMediaAssetId?: string;
  title: string;
  description?: string;
  captionsUrl?: string;
  analyticsId?: string;
  presentation: StudioVideoPresentation;
  aspect: StudioVideoAspect;
  subtitle?: string;
  showTitle: boolean;
  showSubtitle: boolean;
  showDescription: boolean;
  frameTreatment: StudioVideoFrameTreatment;
  frameColor: string;
  frameAccent: string;
  frameRadiusPx: number;
  frameBorderPx: number;
  posterFit: "cover" | "contain";
  posterFocalX: number;
  posterFocalY: number;
  playPresentation: "circle" | "minimal" | "accent";
  locked: boolean;
  lockedBehavior?: TapExperienceLockedBehavior;
}>;

function seconds(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
}

export function identifyVideoSource(url: string): Pick<StudioVideoState, "provider" | "sourceId"> {
  const value = url.trim();
  try {
    const parsed = new URL(value);
    if (parsed.hostname === "youtu.be") return { provider: "youtube", sourceId: parsed.pathname.split("/").filter(Boolean)[0] };
    if (parsed.hostname.endsWith("youtube.com") || parsed.hostname.endsWith("youtube-nocookie.com")) {
      const parts = parsed.pathname.split("/").filter(Boolean);
      return { provider: "youtube", sourceId: parsed.searchParams.get("v") || (parts[0] === "embed" || parts[0] === "shorts" ? parts[1] : undefined) || undefined };
    }
    if (parsed.hostname.endsWith("vimeo.com")) return { provider: "vimeo", sourceId: parsed.pathname.split("/").filter(Boolean).find((part) => /^\d+$/.test(part)) };
  } catch {
    // Invalid/relative URLs remain hosted media so the inspector can report them in context.
  }
  return { provider: "hosted" };
}

export function readStudioVideoState(props: Readonly<Record<string, unknown>>): StudioVideoState {
  const sourceUrl = String(props.videoUrl ?? props.src ?? "");
  const identified = identifyVideoSource(sourceUrl);
  const playbackMode = props.playbackMode === "autoplay_muted" ? "autoplay_muted" : "play_on_tap";
  return {
    contractId: STUDIO_VIDEO_MODULE_CONTRACT,
    provider: (props.videoProvider as StudioVideoProvider | undefined) ?? identified.provider,
    sourceUrl,
    sourceId: String(props.videoSourceId ?? identified.sourceId ?? "") || undefined,
    playbackMode,
    muted: playbackMode === "autoplay_muted" ? true : props.muted !== false,
    loop: props.loop === true,
    playOnce: props.playOnce === true,
    controls: props.controls !== false,
    playsInline: props.playsInline !== false,
    startSeconds: seconds(props.startSeconds),
    endSeconds: props.endSeconds == null || props.endSeconds === "" ? undefined : seconds(props.endSeconds),
    posterUrl: String(props.posterUrl ?? "") || undefined,
    posterMediaAssetId: String(props.posterMediaAssetId ?? "") || undefined,
    title: String(props.videoTitle ?? props.title ?? "Video"),
    description: String(props.videoDescription ?? "") || undefined,
    captionsUrl: String(props.captionsUrl ?? "") || undefined,
    analyticsId: String(props.analyticsId ?? "") || undefined,
    presentation: props.videoPresentation === "feature" ? "feature" : "standard",
    aspect: props.videoAspect === "1:1" || props.videoAspect === "9:16" ? props.videoAspect : "16:9",
    subtitle: String(props.videoSubtitle ?? "") || undefined,
    showTitle: props.videoShowTitle !== false,
    showSubtitle: props.videoShowSubtitle !== false,
    showDescription: props.videoShowDescription === true,
    frameTreatment: props.videoFrameTreatment === "solid" || props.videoFrameTreatment === "glass" || props.videoFrameTreatment === "artist-surface" ? props.videoFrameTreatment : "transparent",
    frameColor: String(props.videoFrameColor ?? "#0b111b"),
    frameAccent: String(props.videoFrameAccent ?? "#b8ff2c"),
    frameRadiusPx: Math.max(0, Math.min(64, Number(props.videoFrameRadiusPx ?? 18))),
    frameBorderPx: Math.max(0, Math.min(8, Number(props.videoFrameBorderPx ?? 1))),
    posterFit: props.posterFit === "contain" ? "contain" : "cover",
    posterFocalX: Math.max(0, Math.min(1, Number(props.posterFocalX ?? .5))),
    posterFocalY: Math.max(0, Math.min(1, Number(props.posterFocalY ?? .5))),
    playPresentation: props.videoPlayPresentation === "minimal" || props.videoPlayPresentation === "accent" ? props.videoPlayPresentation : "circle",
    locked: props.accessState === "locked" || props.videoLocked === true,
    lockedBehavior: props.lockedBehavior && typeof props.lockedBehavior === "object" ? props.lockedBehavior as TapExperienceLockedBehavior : undefined,
  };
}

export function videoAspectRatio(aspect: StudioVideoAspect): number {
  return aspect === "1:1" ? 1 : aspect === "9:16" ? 9 / 16 : 16 / 9;
}

export function videoFeatureDefaults(): Record<string, unknown> {
  return {
    videoPresentation: "feature",
    videoAspect: "16:9",
    videoShowTitle: true,
    videoShowSubtitle: true,
    videoShowDescription: false,
    videoFrameTreatment: "glass",
    videoFrameColor: "#0b111b",
    videoFrameAccent: "#b8ff2c",
    videoFrameRadiusPx: 18,
    videoFrameBorderPx: 1,
    posterFit: "cover",
    posterFocalX: .5,
    posterFocalY: .5,
    videoPlayPresentation: "circle",
    aspectLocked: true,
  };
}

export function applyStudioVideoSource(props: Readonly<Record<string, unknown>>, sourceUrl: string): Record<string, unknown> {
  const source = identifyVideoSource(sourceUrl);
  return { ...props, elementKind: "video", videoUrl: sourceUrl, src: sourceUrl, videoProvider: source.provider, videoSourceId: source.sourceId };
}

export function applyStudioVideoPlayback(
  props: Readonly<Record<string, unknown>>,
  playbackMode: StudioVideoPlaybackMode,
): Record<string, unknown> {
  return { ...props, playbackMode, muted: playbackMode === "autoplay_muted" ? true : props.muted !== false };
}

export function videoEmbedUrl(state: StudioVideoState, autoplay = false): string | null {
  if (!state.sourceId) return null;
  const auto = autoplay ? "1" : "0";
  if (state.provider === "youtube") {
    const params = new URLSearchParams({ autoplay: auto, mute: state.muted ? "1" : "0", controls: state.controls ? "1" : "0", playsinline: "1", start: String(state.startSeconds) });
    if (state.endSeconds) params.set("end", String(state.endSeconds));
    if (state.loop) { params.set("loop", "1"); params.set("playlist", state.sourceId); }
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(state.sourceId)}?${params}`;
  }
  if (state.provider === "vimeo") return `https://player.vimeo.com/video/${encodeURIComponent(state.sourceId)}?autoplay=${auto}&muted=${state.muted ? "1" : "0"}&loop=${state.loop ? "1" : "0"}`;
  return null;
}
