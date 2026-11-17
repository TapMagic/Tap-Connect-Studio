/** Shared ownership for HTMLMediaElement audio/video; scoped to a browser document. */
export const STUDIO_MEDIA_CONTRACT = "studioNativeMedia@1" as const;
export type StudioMediaKind = "audio" | "video";
export type StudioMediaSource = {
  mediaAssetId: string;
  url: string;
  mimeType?: string;
  kind: StudioMediaKind;
  /** Native HLS may use this element; a future adapter must retain this ownership contract. */
  transport?: "file" | "hls";
};
const initiatedDocuments = new WeakSet<Document>();
const playbackOwners = new WeakMap<Document, object>();
export function ownsMediaPlayback(element: HTMLMediaElement): boolean {
  return playbackOwners.get(element.ownerDocument) === element;
}
export function mayAttemptMediaAutoplay(document: Document): boolean {
  return (
    !initiatedDocuments.has(document) &&
    ![...document.querySelectorAll<HTMLMediaElement>("audio,video")].some(
      (media) => !media.paused && !media.ended,
    )
  );
}
const CLAIM = "tapconnect:media-playback-claim";
export function claimPlaybackOwner(owner: object, document: Document) {
  initiatedDocuments.add(document);
  playbackOwners.set(document, owner);
  document.dispatchEvent(new CustomEvent(CLAIM, { detail: owner }));
}
export function observePlaybackOwner(
  owner: object,
  document: Document,
  release: () => void,
) {
  const listener = (event: Event) => {
    if ((event as CustomEvent).detail !== owner) release();
  };
  document.addEventListener(CLAIM, listener);
  return () => {
    document.removeEventListener(CLAIM, listener);
    if (playbackOwners.get(document) === owner) playbackOwners.delete(document);
  };
}
export function claimMediaPlayback(element: HTMLMediaElement) {
  initiatedDocuments.add(element.ownerDocument);
  playbackOwners.set(element.ownerDocument, element);
  element.ownerDocument.dispatchEvent(
    new CustomEvent(CLAIM, { detail: element }),
  );
}
export function observeMediaOwnership(element: HTMLMediaElement): () => void {
  const onClaim = (event: Event) => {
    if ((event as CustomEvent).detail !== element) element.pause();
  };
  const onPlay = () => claimMediaPlayback(element);
  element.ownerDocument.addEventListener(CLAIM, onClaim);
  element.addEventListener("play", onPlay);
  return () => {
    element.ownerDocument.removeEventListener(CLAIM, onClaim);
    element.removeEventListener("play", onPlay);
    if (playbackOwners.get(element.ownerDocument) === element)
      playbackOwners.delete(element.ownerDocument);
  };
}
/** MIME/container hints cannot prove codec support. Runtime MediaError remains authoritative. */
export function mediaSupport(
  element: HTMLMediaElement,
  mimeType?: string,
): "unknown" | "unsupported" | "supported" {
  if (!mimeType) return "unknown";
  return element.canPlayType(mimeType) ? "supported" : "unsupported";
}
