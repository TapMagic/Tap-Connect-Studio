/** Additive native-media behavior; absent fields preserve the original player defaults. */
export const STUDIO_MEDIA_BEHAVIOR_CONTRACT = "studioMediaBehavior@1" as const;
export type StudioMediaBehavior = Readonly<{
  contractId: typeof STUDIO_MEDIA_BEHAVIOR_CONTRACT;
  initialPlayback: "manual" | "autoplay";
  loop: "off" | "current";
  startSeconds: number;
  completion: "stop" | "replay";
  continuity: boolean;
  presentation: "audio" | "video";
  artworkVisible: boolean;
  controls: Readonly<{
    progress: boolean;
    time: boolean;
    volume: boolean;
    mute: boolean;
    expand: boolean;
    nativeVideo: boolean;
  }>;
}>;
export function mediaStartSeconds(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(86400, n)) : 0;
}
export function clampMediaStart(start: number, duration: number): number {
  return Number.isFinite(duration) && duration > 0
    ? Math.min(mediaStartSeconds(start), Math.max(0, duration - 0.05))
    : mediaStartSeconds(start);
}
export function readStudioMediaBehavior(
  props: Readonly<Record<string, unknown>>,
): StudioMediaBehavior {
  const raw =
    props.mediaBehavior && typeof props.mediaBehavior === "object"
      ? (props.mediaBehavior as Record<string, unknown>)
      : {};
  const controls =
    raw.controls && typeof raw.controls === "object"
      ? (raw.controls as Record<string, unknown>)
      : {};
  return {
    contractId: STUDIO_MEDIA_BEHAVIOR_CONTRACT,
    initialPlayback: raw.initialPlayback === "autoplay" ? "autoplay" : "manual",
    loop: raw.loop === "current" ? "current" : "off",
    startSeconds: mediaStartSeconds(raw.startSeconds),
    completion: raw.completion === "replay" ? "replay" : "stop",
    continuity: raw.continuity !== false,
    presentation: raw.presentation === "video" ? "video" : "audio",
    artworkVisible: raw.artworkVisible !== false,
    controls: {
      progress: controls.progress !== false,
      time: controls.time !== false,
      volume: controls.volume !== false,
      mute: controls.mute !== false,
      expand: controls.expand !== false,
      nativeVideo: controls.nativeVideo !== false,
    },
  };
}
/** iOS owns physical output volume; never attempt software-volume workarounds. */
export function supportsMediaVolume(
  platform: Pick<Navigator, "userAgent" | "platform" | "maxTouchPoints">,
): boolean {
  return !(
    /iPad|iPhone|iPod/.test(platform.userAgent) ||
    (platform.platform === "MacIntel" && platform.maxTouchPoints > 1)
  );
}

/** Preserve unexposed extension fields when a Host edits a supported setting. */
export function patchStudioMediaBehavior(
  props: Readonly<Record<string, unknown>>,
  change: Partial<StudioMediaBehavior>,
): Record<string, unknown> {
  const raw =
    props.mediaBehavior && typeof props.mediaBehavior === "object"
      ? (props.mediaBehavior as Record<string, unknown>)
      : {};
  const rawControls =
    raw.controls && typeof raw.controls === "object"
      ? (raw.controls as Record<string, unknown>)
      : {};
  const normalized = readStudioMediaBehavior(props);
  return {
    ...raw,
    ...normalized,
    ...change,
    controls: { ...rawControls, ...normalized.controls, ...change.controls },
  };
}
