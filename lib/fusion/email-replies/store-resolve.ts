/**
 * Resolve Email & Replies store.
 * Default runtime: Prisma (durable).
 * Memory only when EMAIL_REPLIES_STORE=memory (isolated unit tests).
 * Never silently falls back to memory on Prisma failure.
 */

import type { EmailRepliesStore } from "./store";
import { getEmailRepliesMemoryStore } from "./store-memory";
import { getEmailRepliesPrismaStore } from "./store-prisma";

export class EmailRepliesStoreUnavailableError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "EmailRepliesStoreUnavailableError";
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export function isMemoryStoreForced(): boolean {
  return process.env.EMAIL_REPLIES_STORE === "memory";
}

export function getEmailRepliesStore(): EmailRepliesStore {
  if (isMemoryStoreForced()) {
    return getEmailRepliesMemoryStore();
  }
  return getEmailRepliesPrismaStore();
}

export async function requireEmailRepliesStore(): Promise<EmailRepliesStore> {
  const store = getEmailRepliesStore();
  try {
    await store.ping();
    return store;
  } catch (err) {
    throw new EmailRepliesStoreUnavailableError(
      "Email & Replies durable store is unavailable. Settings were not saved and routing cannot proceed.",
      err
    );
  }
}
