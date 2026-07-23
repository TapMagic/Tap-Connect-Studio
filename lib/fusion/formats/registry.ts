/**
 * Widest practical safe file/format registries for upload, ingest, AI, export.
 */

export type FormatKind =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "slide"
  | "data"
  | "contact"
  | "calendar"
  | "font"
  | "archive"
  | "source"
  | "export";

export type FormatEntry = {
  ext: string[];
  mime: string[];
  kind: FormatKind;
  ingest: boolean;
  upload: boolean;
  ai: boolean;
  export: boolean;
  convertFrom?: string[];
  notes?: string;
};

export const FILE_FORMAT_REGISTRY: FormatEntry[] = [
  { ext: ["png"], mime: ["image/png"], kind: "image", ingest: true, upload: true, ai: true, export: true },
  { ext: ["jpg", "jpeg"], mime: ["image/jpeg"], kind: "image", ingest: true, upload: true, ai: true, export: true },
  { ext: ["webp"], mime: ["image/webp"], kind: "image", ingest: true, upload: true, ai: true, export: true },
  { ext: ["gif"], mime: ["image/gif"], kind: "image", ingest: true, upload: true, ai: true, export: true },
  { ext: ["svg"], mime: ["image/svg+xml"], kind: "image", ingest: true, upload: true, ai: true, export: true, notes: "Sanitize SVG" },
  { ext: ["avif"], mime: ["image/avif"], kind: "image", ingest: true, upload: true, ai: true, export: true },
  { ext: ["heic", "heif"], mime: ["image/heic", "image/heif"], kind: "image", ingest: true, upload: true, ai: true, export: false, convertFrom: ["heic"] },
  { ext: ["tif", "tiff"], mime: ["image/tiff"], kind: "image", ingest: true, upload: true, ai: true, export: false },
  { ext: ["bmp"], mime: ["image/bmp"], kind: "image", ingest: true, upload: true, ai: false, export: false },
  { ext: ["ico"], mime: ["image/x-icon", "image/vnd.microsoft.icon"], kind: "image", ingest: true, upload: true, ai: false, export: true },
  { ext: ["mp4"], mime: ["video/mp4"], kind: "video", ingest: true, upload: true, ai: true, export: true },
  { ext: ["mov"], mime: ["video/quicktime"], kind: "video", ingest: true, upload: true, ai: true, export: false },
  { ext: ["webm"], mime: ["video/webm"], kind: "video", ingest: true, upload: true, ai: true, export: true },
  { ext: ["m4v"], mime: ["video/x-m4v"], kind: "video", ingest: true, upload: true, ai: true, export: false },
  { ext: ["mkv", "avi"], mime: ["video/x-matroska", "video/x-msvideo"], kind: "video", ingest: true, upload: true, ai: false, export: false, notes: "Convert when practical" },
  { ext: ["mp3"], mime: ["audio/mpeg"], kind: "audio", ingest: true, upload: true, ai: true, export: true },
  { ext: ["wav"], mime: ["audio/wav"], kind: "audio", ingest: true, upload: true, ai: true, export: true },
  { ext: ["m4a", "aac"], mime: ["audio/mp4", "audio/aac"], kind: "audio", ingest: true, upload: true, ai: true, export: false },
  { ext: ["flac"], mime: ["audio/flac"], kind: "audio", ingest: true, upload: true, ai: true, export: false },
  { ext: ["ogg", "opus"], mime: ["audio/ogg", "audio/opus"], kind: "audio", ingest: true, upload: true, ai: true, export: false },
  { ext: ["pdf"], mime: ["application/pdf"], kind: "document", ingest: true, upload: true, ai: true, export: true },
  { ext: ["docx"], mime: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"], kind: "document", ingest: true, upload: true, ai: true, export: true },
  { ext: ["doc"], mime: ["application/msword"], kind: "document", ingest: true, upload: true, ai: true, export: false, notes: "Convert to DOCX/PDF" },
  { ext: ["odt"], mime: ["application/vnd.oasis.opendocument.text"], kind: "document", ingest: true, upload: true, ai: true, export: false },
  { ext: ["rtf"], mime: ["application/rtf"], kind: "document", ingest: true, upload: true, ai: true, export: false },
  { ext: ["txt", "md", "markdown"], mime: ["text/plain", "text/markdown"], kind: "document", ingest: true, upload: true, ai: true, export: true },
  { ext: ["html", "htm"], mime: ["text/html"], kind: "document", ingest: true, upload: true, ai: true, export: true, notes: "Sanitize" },
  { ext: ["epub"], mime: ["application/epub+zip"], kind: "document", ingest: true, upload: true, ai: true, export: false },
  { ext: ["eml", "msg", "mbox"], mime: ["message/rfc822"], kind: "document", ingest: true, upload: true, ai: true, export: false },
  { ext: ["pptx"], mime: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"], kind: "slide", ingest: true, upload: true, ai: true, export: false },
  { ext: ["ppt"], mime: ["application/vnd.ms-powerpoint"], kind: "slide", ingest: true, upload: true, ai: true, export: false },
  { ext: ["odp"], mime: ["application/vnd.oasis.opendocument.presentation"], kind: "slide", ingest: true, upload: true, ai: true, export: false },
  { ext: ["key"], mime: ["application/x-iwork-keynote-sffkey"], kind: "slide", ingest: true, upload: true, ai: true, export: false },
  { ext: ["xlsx"], mime: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"], kind: "data", ingest: true, upload: true, ai: true, export: true },
  { ext: ["xls"], mime: ["application/vnd.ms-excel"], kind: "data", ingest: true, upload: true, ai: true, export: false },
  { ext: ["ods"], mime: ["application/vnd.oasis.opendocument.spreadsheet"], kind: "data", ingest: true, upload: true, ai: true, export: false },
  { ext: ["csv", "tsv"], mime: ["text/csv", "text/tab-separated-values"], kind: "data", ingest: true, upload: true, ai: true, export: true },
  { ext: ["json", "jsonl"], mime: ["application/json", "application/x-ndjson"], kind: "data", ingest: true, upload: true, ai: true, export: true },
  { ext: ["xml"], mime: ["application/xml", "text/xml"], kind: "data", ingest: true, upload: true, ai: true, export: true },
  { ext: ["yaml", "yml"], mime: ["application/yaml", "text/yaml"], kind: "data", ingest: true, upload: true, ai: true, export: true },
  { ext: ["zip"], mime: ["application/zip"], kind: "archive", ingest: true, upload: true, ai: false, export: true, notes: "Scan members; reject executables" },
  { ext: ["vcf"], mime: ["text/vcard"], kind: "contact", ingest: true, upload: true, ai: true, export: true },
  { ext: ["ics"], mime: ["text/calendar"], kind: "calendar", ingest: true, upload: true, ai: true, export: true },
  { ext: ["ttf", "otf", "woff", "woff2"], mime: ["font/ttf", "font/otf", "font/woff", "font/woff2"], kind: "font", ingest: true, upload: true, ai: false, export: false, notes: "License controls required" },
];

/** Explicit reject list — never accept as user content */
export const REJECTED_EXECUTABLE_EXT = [
  "exe",
  "dll",
  "bat",
  "cmd",
  "com",
  "msi",
  "scr",
  "ps1",
  "sh",
  "bash",
  "zsh",
  "app",
  "dmg",
  "pkg",
  "apk",
  "ipa",
  "jar",
  "wasm",
];

export function acceptAttribute(): string {
  const exts = FILE_FORMAT_REGISTRY.filter((f) => f.upload).flatMap((f) => f.ext.map((e) => `.${e}`));
  return Array.from(new Set(exts)).join(",");
}

export function findFormatByFilename(name: string): FormatEntry | undefined {
  const ext = name.split(".").pop()?.toLowerCase();
  if (!ext) return undefined;
  if (REJECTED_EXECUTABLE_EXT.includes(ext)) return undefined;
  return FILE_FORMAT_REGISTRY.find((f) => f.ext.includes(ext));
}

export function isUploadAllowed(filename: string, mime?: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (!ext || REJECTED_EXECUTABLE_EXT.includes(ext)) return false;
  const entry = FILE_FORMAT_REGISTRY.find((f) => f.ext.includes(ext));
  if (!entry?.upload) return false;
  if (mime && entry.mime.length && !entry.mime.includes(mime) && !mime.startsWith("application/octet-stream")) {
    // soft allow octet-stream; strict mime mismatch otherwise
    return entry.mime.some((m) => mime.startsWith(m.split("/")[0] + "/"));
  }
  return true;
}
