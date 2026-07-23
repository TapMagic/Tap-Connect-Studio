/**
 * DEVELOPMENT-ONLY feature override store.
 * Writes to `.fusion/feature-overrides.json` (gitignored).
 * Never use as production persistence.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  FeatureOverrideRepository,
  SetFeatureOverrideInput,
  SetFeatureOverrideResult,
  StoredFeatureOverride,
} from "./repository";

const DEFAULT_PATH = path.join(process.cwd(), ".fusion", "feature-overrides.json");

export class FileFeatureOverrideRepository implements FeatureOverrideRepository {
  readonly kind = "file" as const;

  constructor(private readonly filePath: string = DEFAULT_PATH) {}

  private async read(): Promise<StoredFeatureOverride[]> {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as StoredFeatureOverride[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async write(rows: StoredFeatureOverride[]) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(rows, null, 2), "utf8");
  }

  async list(): Promise<StoredFeatureOverride[]> {
    return this.read();
  }

  async set(input: SetFeatureOverrideInput): Promise<SetFeatureOverrideResult> {
    const scope = input.scope?.trim() || "global";
    const override: StoredFeatureOverride = {
      featureId: input.featureId,
      enabled: input.enabled,
      scope,
      reason: input.reason,
      actorId: input.actorId,
      actorEmail: input.actorEmail,
      actor: input.actorEmail ?? input.actorId,
      updatedAt: new Date().toISOString(),
    };

    try {
      const rows = await this.read();
      const next = rows.filter((r) => !(r.featureId === input.featureId && r.scope === scope));
      next.push(override);
      await this.write(next);
      return { ok: true, storage: "file", override };
    } catch (err) {
      const message = err instanceof Error ? err.message : "File feature override failed";
      return { ok: false, error: message };
    }
  }
}
