/**
 * Email client compatibility — honest classification for visual properties.
 */

export type EmailSupportClass =
  | "broadly_supported"
  | "supported_with_fallback"
  | "limited_client"
  | "unsupported";

export type EmailPropertyCompatibility = {
  propertyKey: string;
  label: string;
  support: EmailSupportClass;
  warning?: string;
  fallback?: string;
};

const EMAIL_SAFE_PROPERTIES: EmailPropertyCompatibility[] = [
  { propertyKey: "background", label: "Background color", support: "broadly_supported" },
  { propertyKey: "contentSurface", label: "Content surface", support: "broadly_supported" },
  { propertyKey: "headline", label: "Headline color", support: "broadly_supported" },
  { propertyKey: "body", label: "Body text color", support: "broadly_supported" },
  { propertyKey: "ctaBackground", label: "CTA background", support: "broadly_supported" },
  { propertyKey: "ctaText", label: "CTA text color", support: "broadly_supported" },
  { propertyKey: "link", label: "Link color", support: "broadly_supported" },
  { propertyKey: "spacing", label: "Spacing", support: "broadly_supported" },
  { propertyKey: "alignment", label: "Alignment", support: "broadly_supported" },
  { propertyKey: "border", label: "Border", support: "broadly_supported" },
  { propertyKey: "image", label: "Images", support: "broadly_supported" },
  {
    propertyKey: "radius",
    label: "Corner radius",
    support: "limited_client",
    warning: "Some older Outlook versions may show square corners.",
  },
  {
    propertyKey: "font",
    label: "Custom font",
    support: "supported_with_fallback",
    fallback: "Arial, Helvetica, sans-serif",
    warning: "Some email apps may use Arial instead of your Brand font.",
  },
  {
    propertyKey: "gradient",
    label: "Gradients",
    support: "supported_with_fallback",
    fallback: "Solid background color",
    warning: "Gradients may flatten to a solid color in some inboxes.",
  },
  {
    propertyKey: "shadow",
    label: "Shadow",
    support: "limited_client",
    warning: "This shadow may not appear in older Outlook versions.",
  },
  {
    propertyKey: "darkMode",
    label: "Dark inbox treatment",
    support: "limited_client",
    warning: "Dark-mode email clients may alter colors. Preview is representative, not a guarantee.",
  },
  { propertyKey: "animation", label: "Animation", support: "unsupported" },
  { propertyKey: "hover", label: "Hover-dependent meaning", support: "unsupported" },
  { propertyKey: "video", label: "Embedded video", support: "unsupported" },
  { propertyKey: "script", label: "Scripts", support: "unsupported" },
];

export function listEmailPropertyCompatibility(): EmailPropertyCompatibility[] {
  return EMAIL_SAFE_PROPERTIES.map((p) => ({ ...p }));
}

export function compatibilityForProperty(
  propertyKey: string
): EmailPropertyCompatibility | undefined {
  return EMAIL_SAFE_PROPERTIES.find((p) => p.propertyKey === propertyKey);
}

export function emailSafeFontStack(preferredCss: string): {
  preferred: string;
  emailSafe: string;
  warning: string;
} {
  return {
    preferred: preferredCss,
    emailSafe: `${preferredCss}, Arial, Helvetica, sans-serif`,
    warning: "Some email apps may use Arial instead of your Brand font.",
  };
}

export function htmlSafetyWarnings(html: string): string[] {
  const warnings: string[] = [];
  if (/<script[\s>]/i.test(html)) warnings.push("Scripts are not allowed in email HTML.");
  if (/\bon\w+\s*=/i.test(html)) warnings.push("Inline event handlers are not email-safe.");
  if (/<video[\s>]/i.test(html)) warnings.push("Embedded video is not supported — use a linked thumbnail.");
  if (/@import/i.test(html)) warnings.push("@import styles may be stripped by many clients.");
  return warnings;
}

export type EmailPreviewMode =
  | "desktop"
  | "mobile"
  | "light_inbox"
  | "dark_inbox"
  | "image_blocked"
  | "plain_text"
  | "inbox_list";

export function previewModeLabel(mode: EmailPreviewMode): string {
  switch (mode) {
    case "desktop":
      return "Desktop";
    case "mobile":
      return "Mobile";
    case "light_inbox":
      return "Light inbox";
    case "dark_inbox":
      return "Dark inbox";
    case "image_blocked":
      return "Images blocked";
    case "plain_text":
      return "Plain text";
    case "inbox_list":
      return "Inbox list";
  }
}
