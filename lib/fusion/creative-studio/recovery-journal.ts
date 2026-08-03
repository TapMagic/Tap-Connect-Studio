export const CARD_RECOVERY_JOURNAL_VERSION = 1;
export const CARD_RECOVERY_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

export type RecoveryJournalEntry<T> = {
  version: typeof CARD_RECOVERY_JOURNAL_VERSION;
  documentId: string;
  serverRevision: number;
  checkpointedAt: string;
  pending: boolean;
  document: T;
};

export type RecoveryDecision<T> =
  | { state: "none" }
  | { state: "recoverable"; entry: RecoveryJournalEntry<T> }
  | { state: "stale"; entry: RecoveryJournalEntry<T> }
  | { state: "conflict"; entry: RecoveryJournalEntry<T> };

export interface JournalStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function recoveryJournalKey(documentId: string): string {
  return `tapconnect:card-recovery:${documentId}`;
}

export function writeRecoveryJournal<T>(
  storage: JournalStorage,
  entry: Omit<RecoveryJournalEntry<T>, "version" | "checkpointedAt"> & {
    checkpointedAt?: string;
  }
): RecoveryJournalEntry<T> {
  const value: RecoveryJournalEntry<T> = {
    ...entry,
    version: CARD_RECOVERY_JOURNAL_VERSION,
    checkpointedAt: entry.checkpointedAt ?? new Date().toISOString(),
  };
  storage.setItem(recoveryJournalKey(entry.documentId), JSON.stringify(value));
  return value;
}

export function readRecoveryJournal<T>(
  storage: JournalStorage,
  documentId: string
): RecoveryJournalEntry<T> | null {
  const raw = storage.getItem(recoveryJournalKey(documentId));
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<RecoveryJournalEntry<T>>;
    if (
      value.version !== CARD_RECOVERY_JOURNAL_VERSION ||
      value.documentId !== documentId ||
      typeof value.serverRevision !== "number" ||
      typeof value.checkpointedAt !== "string" ||
      typeof value.pending !== "boolean" ||
      !value.document
    ) {
      return null;
    }
    return value as RecoveryJournalEntry<T>;
  } catch {
    return null;
  }
}

export function evaluateRecoveryJournal<T>(input: {
  entry: RecoveryJournalEntry<T> | null;
  serverRevision: number;
  now?: number;
}): RecoveryDecision<T> {
  if (!input.entry || !input.entry.pending) return { state: "none" };
  const age = (input.now ?? Date.now()) - Date.parse(input.entry.checkpointedAt);
  if (!Number.isFinite(age) || age > CARD_RECOVERY_MAX_AGE_MS) {
    return { state: "stale", entry: input.entry };
  }
  if (input.entry.serverRevision < input.serverRevision) {
    return { state: "conflict", entry: input.entry };
  }
  return { state: "recoverable", entry: input.entry };
}

export function clearRecoveryJournal(
  storage: JournalStorage,
  documentId: string
): void {
  storage.removeItem(recoveryJournalKey(documentId));
}
