export type ExperienceDestinationPolicy = "internal" | "immersive" | "external";

export type ExperienceReturnContext = {
  experienceId: string;
  sessionId: string;
  pageId: string;
  pageSlug: string;
  url: string;
  scrollY: number;
  selectedContentId?: string;
  updatedAt: string;
};

const SESSION_PREFIX = "tapconnect.experience.session";
const RETURN_PREFIX = "tapconnect.experience.return";

export function destinationPolicyForElement(element: HTMLElement | null): ExperienceDestinationPolicy | null {
  if (!element) return null;
  const explicit = element.dataset.destinationPolicy;
  if (explicit === "internal" || explicit === "immersive" || explicit === "external") return explicit;
  if (element.dataset.internalPageId) return "internal";
  if (element.dataset.immersiveContentId) return "immersive";
  if (element instanceof HTMLAnchorElement && element.href) return "external";
  return null;
}

export function ensureExperienceSession(experienceId: string): string {
  if (typeof window === "undefined") return "server";
  const key = `${SESSION_PREFIX}:${experienceId}`;
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `exp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  window.sessionStorage.setItem(key, id);
  return id;
}

export function preserveExperienceReturnContext(context: Omit<ExperienceReturnContext, "sessionId" | "url" | "scrollY" | "updatedAt"> & Partial<Pick<ExperienceReturnContext, "url" | "scrollY" | "selectedContentId">>): ExperienceReturnContext | null {
  if (typeof window === "undefined") return null;
  const value: ExperienceReturnContext = {
    experienceId: context.experienceId,
    sessionId: ensureExperienceSession(context.experienceId),
    pageId: context.pageId,
    pageSlug: context.pageSlug,
    url: context.url || window.location.href,
    scrollY: context.scrollY ?? window.scrollY,
    selectedContentId: context.selectedContentId,
    updatedAt: new Date().toISOString(),
  };
  window.sessionStorage.setItem(`${RETURN_PREFIX}:${context.experienceId}`, JSON.stringify(value));
  return value;
}

export function readExperienceReturnContext(experienceId: string): ExperienceReturnContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(`${RETURN_PREFIX}:${experienceId}`);
    if (!raw) return null;
    const value = JSON.parse(raw) as ExperienceReturnContext;
    return value?.experienceId === experienceId && typeof value.pageId === "string" ? value : null;
  } catch {
    return null;
  }
}

export function prepareExternalAnchor(anchor: HTMLAnchorElement): void {
  const href = anchor.getAttribute("href") || "";
  if (!/^https?:/i.test(href) || anchor.dataset.openBehavior === "same_tab") return;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
}
