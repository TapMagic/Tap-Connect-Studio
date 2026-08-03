import assert from "node:assert/strict";
import test from "node:test";
import {
  cloneCreativeDocumentName,
  normalizeCreativeDocumentName,
  renameCreativeDocument,
} from "../document-naming";
import {
  evaluateRecoveryJournal,
  readRecoveryJournal,
  writeRecoveryJournal,
  type JournalStorage,
} from "../recovery-journal";

class MemoryStorage implements JournalStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

test("creative-document naming is shared, trimmed, Unicode-safe, and identity-preserving", () => {
  assert.equal(normalizeCreativeDocumentName("  Summer   ✨  Card  "), "Summer ✨ Card");
  assert.equal(cloneCreativeDocumentName("Main Tap Card"), "Copy of Main Tap Card");
  const before = { id: "card-1", type: "CARD" as const, name: "Before", publicationId: "pub-1" };
  assert.deepEqual(renameCreativeDocument(before, "  After  "), { ...before, name: "After" });
});

test("recovery journal offers current pending work and protects a newer server draft", () => {
  const storage = new MemoryStorage();
  writeRecoveryJournal(storage, {
    documentId: "card-1",
    serverRevision: 7,
    checkpointedAt: "2026-08-02T20:14:00.000Z",
    pending: true,
    document: { value: "local" },
  });
  const entry = readRecoveryJournal<{ value: string }>(storage, "card-1");
  assert.equal(evaluateRecoveryJournal({ entry, serverRevision: 7, now: Date.parse("2026-08-02T20:15:00.000Z") }).state, "recoverable");
  assert.equal(evaluateRecoveryJournal({ entry, serverRevision: 8, now: Date.parse("2026-08-02T20:15:00.000Z") }).state, "conflict");
});
