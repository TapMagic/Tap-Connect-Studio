import { readStudioMediaBehavior } from "./media-behavior";
import type { StudioMediaSource } from "./media-playback";
/** Audio stores library identity and the URL returned by the canonical media service. */
export type StudioAudioVariant = "compact" | "featured" | "expanded";
export function readStudioAudioState(props: Readonly<Record<string, unknown>>) {
  return {
    kind: "audio" as const,
    behavior: readStudioMediaBehavior(props),
    mediaAssetId: String(props.mediaAssetId || ""),
    url: String(props.src || ""),
    title: String(props.audioTitle || "Audio track"),
    mimeType: String(props.mediaMimeType || ""),
    album: String(props.audioAlbum || ""),
    relatedVideo:
      props.relatedVideo && typeof props.relatedVideo === "object"
        ? (props.relatedVideo as {
            mediaAssetId: string;
            url: string;
            mimeType?: string;
          })
        : undefined,
    artist: String(props.audioArtist || ""),
    description: String(props.audioDescription || ""),
    artwork: String(props.artworkUrl || ""),
    variant: (["compact", "featured", "expanded"].includes(
      String(props.audioVariant),
    )
      ? props.audioVariant
      : "featured") as StudioAudioVariant,
    accent: /^#[\da-f]{6}$/i.test(String(props.audioAccent))
      ? String(props.audioAccent)
      : "#b8ff2c",
  };
}
export type StudioAudioTrack = ReturnType<typeof readStudioAudioState> &
  StudioMediaSource;
export function audioTime(value: number): string {
  const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
