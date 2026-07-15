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

export function downloadVCardFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".vcf") ? filename : `${filename}.vcf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Save contact with a single user gesture.
 * Prefers system share sheet (Add to Contacts) when the browser allows sharing .vcf files;
 * otherwise downloads the vCard — no extra confirmation beyond the tap.
 */
export async function saveContactWithUserGesture(params: {
  filename: string;
  content: string;
  title?: string;
}): Promise<"shared" | "downloaded"> {
  const name = params.filename.endsWith(".vcf")
    ? params.filename
    : `${params.filename}.vcf`;
  const file = new File([params.content], name, { type: "text/vcard" });

  try {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        files: [file],
        title: params.title || "Save contact",
        text: params.title || "Add to contacts",
      });
      return "shared";
    }
  } catch (err) {
    // User cancelled share — don't force a download
    if (err instanceof DOMException && err.name === "AbortError") {
      return "downloaded";
    }
  }

  downloadVCardFile(name, params.content);
  return "downloaded";
}
