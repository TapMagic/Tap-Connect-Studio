export type SocialPlatform =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "linkedin"
  | "x"
  | "whatsapp"
  | "threads"
  | "snapchat"
  | "pinterest"
  | "yelp"
  | "spotify"
  | "apple_maps"
  | "custom";

export const SOCIAL_PLATFORM_OPTIONS: {
  id: SocialPlatform;
  label: string;
  placeholder: string;
}[] = [
  { id: "instagram", label: "Instagram", placeholder: "https://instagram.com/…" },
  { id: "facebook", label: "Facebook", placeholder: "https://facebook.com/…" },
  { id: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@…" },
  { id: "youtube", label: "YouTube", placeholder: "https://youtube.com/@…" },
  { id: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/…" },
  { id: "x", label: "X / Twitter", placeholder: "https://x.com/…" },
  { id: "whatsapp", label: "WhatsApp", placeholder: "https://wa.me/15551234567" },
  { id: "threads", label: "Threads", placeholder: "https://threads.net/@…" },
  { id: "snapchat", label: "Snapchat", placeholder: "https://snapchat.com/add/…" },
  { id: "pinterest", label: "Pinterest", placeholder: "https://pinterest.com/…" },
  { id: "yelp", label: "Yelp", placeholder: "https://yelp.com/biz/…" },
  { id: "spotify", label: "Spotify", placeholder: "https://open.spotify.com/…" },
];

/** Stored in BrandKit.socialLinks JSON */
export type BrandContactProfile = {
  displayName?: string;
  jobTitle?: string;
  organization?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  note?: string;
  /** Photo / logo at top of downloaded vCard (preferred over business logo) */
  photoUrl?: string;
  socials?: Partial<Record<SocialPlatform, string>>;
};

export function parseBrandContactProfile(raw: unknown): BrandContactProfile {
  if (!raw || typeof raw !== "object") return {};
  return raw as BrandContactProfile;
}

export function escapeVCard(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildVCard(params: {
  fullName: string;
  organization?: string;
  title?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  note?: string;
  /** Base64 photo without data: prefix, jpeg preferred */
  photoBase64?: string;
  photoType?: "JPEG" | "PNG";
}): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCard(params.fullName)}`,
    `N:${escapeVCard(params.fullName)};;;`,
  ];
  if (params.organization) lines.push(`ORG:${escapeVCard(params.organization)}`);
  if (params.title) lines.push(`TITLE:${escapeVCard(params.title)}`);
  if (params.phone) lines.push(`TEL;TYPE=CELL,VOICE:${escapeVCard(params.phone)}`);
  if (params.email) lines.push(`EMAIL;TYPE=INTERNET:${escapeVCard(params.email)}`);
  if (params.website) lines.push(`URL:${escapeVCard(params.website)}`);
  if (params.address) lines.push(`ADR;TYPE=WORK:;;${escapeVCard(params.address)};;;;`);
  if (params.note) lines.push(`NOTE:${escapeVCard(params.note)}`);
  if (params.photoBase64) {
    const type = params.photoType ?? "JPEG";
    lines.push(`PHOTO;ENCODING=b;TYPE=${type}:${params.photoBase64}`);
  }
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

export type SaveContactResult =
  | "shared"
  | "opened"
  | "downloaded"
  | "cancelled";

function vcfFilename(filename: string) {
  const base = filename.trim() || "contact";
  return base.endsWith(".vcf") ? base : `${base}.vcf`;
}

function detectMobilePlatform(): "ios" | "android" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  const iOS =
    /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (iOS) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

function downloadVCardFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = vcfFilename(filename);
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
}

async function stashContactUrl(filename: string, content: string): Promise<string | null> {
  try {
    const res = await fetch("/api/public/vcard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, filename: vcfFilename(filename) }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { url?: string };
    return typeof data.url === "string" ? data.url : null;
  } catch {
    return null;
  }
}

function makeVcfFile(filename: string, content: string) {
  const name = vcfFilename(filename);
  // text/x-vcard improves Contacts handoff on some Android builds
  return new File([content], name, {
    type: "text/x-vcard",
  });
}

async function shareVcfFile(
  file: File,
  title?: string
): Promise<"shared" | "cancelled" | "unsupported"> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return "unsupported";
  }

  const tryShare = async (candidate: File) => {
    const payload: ShareData = { files: [candidate], title: title || "Save contact" };
    if (typeof navigator.canShare === "function" && !navigator.canShare(payload)) {
      return false;
    }
    await navigator.share(payload);
    return true;
  };

  try {
    if (await tryShare(file)) return "shared";
    // Retry with alternate MIME if the first File type was rejected for sharing
    const alt = new File([await file.text()], file.name, { type: "text/vcard" });
    if (await tryShare(alt)) return "shared";
    return "unsupported";
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return "cancelled";
    }
    return "unsupported";
  }
}

/**
 * Save contact with a single user gesture.
 *
 * - Android: share sheet when possible (pick Contacts / Save) — nearly one-tap
 * - iOS: open .vcf inline so Safari shows Add Contact → Create (checkmark flow)
 * - Desktop: download .vcf as last resort
 *
 * Avoids mobile `a.download`, which forces a file download instead of Contacts.
 */
export async function saveContactWithUserGesture(params: {
  filename: string;
  content: string;
  title?: string;
}): Promise<SaveContactResult> {
  const platform = detectMobilePlatform();
  const file = makeVcfFile(params.filename, params.content);

  // Android: Web Share → Contacts is the lowest-friction path
  if (platform === "android") {
    const shared = await shareVcfFile(file, params.title);
    if (shared === "shared" || shared === "cancelled") return shared;
  }

  // iOS (and Android share fallback): real URL with Content-Disposition: inline
  // opens the native Add Contact UI instead of a downloads list.
  if (platform === "ios" || platform === "android") {
    const url = await stashContactUrl(params.filename, params.content);
    if (url) {
      // Same-tab navigation keeps the user gesture; iOS presents Create Contact.
      window.location.assign(url);
      return "opened";
    }

    // Blob fallback if stash failed (still never use download= on mobile)
    const blobUrl = URL.createObjectURL(
      new Blob([params.content], { type: "text/vcard;charset=utf-8" })
    );
    window.location.assign(blobUrl);
    return "opened";
  }

  // Desktop / other: share if the OS supports contact import from share sheet
  const shared = await shareVcfFile(file, params.title);
  if (shared === "shared" || shared === "cancelled") return shared;

  downloadVCardFile(params.filename, params.content);
  return "downloaded";
}
