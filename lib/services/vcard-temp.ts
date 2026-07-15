import { nanoid } from "nanoid";

type Entry = {
  content: string;
  filename: string;
  expires: number;
};

/** Short-lived in-memory stash so mobile browsers can open a real .vcf URL (Contacts import). */
const store = new Map<string, Entry>();
const TTL_MS = 5 * 60_000;

function prune() {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (entry.expires <= now) store.delete(id);
  }
}

export function stashVCard(content: string, filename: string): string {
  prune();
  const id = nanoid(14);
  const safe = filename.endsWith(".vcf") ? filename : `${filename}.vcf`;
  store.set(id, {
    content,
    filename: safe.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "contact.vcf",
    expires: Date.now() + TTL_MS,
  });
  return id;
}

export function peekVCard(id: string): Entry | null {
  prune();
  const entry = store.get(id);
  if (!entry) return null;
  return entry;
}
