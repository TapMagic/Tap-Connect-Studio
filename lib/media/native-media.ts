/** Container identification only. Browsers remain responsible for codec decoding. */
export const NATIVE_MEDIA_MIMES = [
  "audio/mpeg",
  "audio/wav",
  "audio/aac",
  "audio/mp4",
  "audio/flac",
  "audio/ogg",
  "audio/opus",
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;
export function sniffNativeMedia(
  bytes: Uint8Array,
  filename: string,
): { mimeType: string; extension: string } | null {
  if (bytes.length < 12) return null;
  const text = (start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end));
  const extension = filename.split(".").pop()?.toLowerCase();
  if (text(0, 4) === "RIFF" && text(8, 12) === "WAVE" && extension === "wav")
    return { mimeType: "audio/wav", extension: "wav" };
  if (text(0, 4) === "fLaC" && extension === "flac")
    return { mimeType: "audio/flac", extension: "flac" };
  if (text(0, 4) === "OggS" && (extension === "ogg" || extension === "opus"))
    return {
      mimeType: "audio/ogg",
      extension,
    };
  if (
    extension === "mp3" &&
    (text(0, 3) === "ID3" ||
      (bytes[0] === 255 && (bytes[1] & 224) === 224 && (bytes[1] & 6) !== 0))
  )
    return { mimeType: "audio/mpeg", extension: "mp3" };
  if (extension === "aac" && bytes[0] === 255 && (bytes[1] & 246) === 240)
    return { mimeType: "audio/aac", extension: "aac" };
  if (text(4, 8) === "ftyp" && ["m4a", "mp4", "mov"].includes(extension || ""))
    return {
      mimeType:
        extension === "m4a"
          ? "audio/mp4"
          : extension === "mov"
            ? "video/quicktime"
            : "video/mp4",
      extension: extension!,
    };
  if (
    extension === "webm" &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  )
    return { mimeType: "video/webm", extension: "webm" };
  return null;
}
export function nativeMediaMimeForKey(key: string): string | null {
  const extension = key.split(".").pop()?.toLowerCase();
  return (
    (
      {
        mp3: "audio/mpeg",
        wav: "audio/wav",
        aac: "audio/aac",
        m4a: "audio/mp4",
        flac: "audio/flac",
        ogg: "audio/ogg",
        opus: "audio/ogg",
        mp4: "video/mp4",
        webm: "video/webm",
        mov: "video/quicktime",
      } as Record<string, string>
    )[extension || ""] || null
  );
}
/** Single byte ranges; malformed/unsatisfiable ranges return false (HTTP 416). */
export function mediaByteRange(
  header: string | null,
  length: number,
): { start: number; end: number } | null | false {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return false;
  const start = match[1]
    ? Number(match[1])
    : Math.max(0, length - Number(match[2]));
  const end =
    match[1] && match[2] ? Math.min(length - 1, Number(match[2])) : length - 1;
  return Number.isSafeInteger(start) &&
    Number.isSafeInteger(end) &&
    start >= 0 &&
    start <= end &&
    start < length
    ? { start, end }
    : false;
}
