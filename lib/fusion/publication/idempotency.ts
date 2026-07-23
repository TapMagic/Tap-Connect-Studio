import { createHash } from "node:crypto";

/** Cody-compatible stable JSON + SHA-256 request hashing for idempotency. */
export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashPayload(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}
