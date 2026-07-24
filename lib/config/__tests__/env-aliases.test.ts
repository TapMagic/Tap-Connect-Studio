import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { ENV_ALIASES, envPresent, listAliasCoverage, resolveEnv } from "../env-aliases";

describe("env aliases (names only — no secret logging)", () => {
  const keys = ["NEXT_PUBLIC_APP_URL", "APP_URL", "OPENAI_API_KEY", "OPENAI_KEY"];
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of keys) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("resolves canonical when set", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://studio.tapthemagic.com";
    assert.equal(resolveEnv("NEXT_PUBLIC_APP_URL"), "https://studio.tapthemagic.com");
    assert.equal(envPresent("NEXT_PUBLIC_APP_URL"), true);
  });

  it("falls back through alias without requiring recreation", () => {
    process.env.APP_URL = "https://studio.tapthemagic.com";
    assert.equal(resolveEnv("NEXT_PUBLIC_APP_URL"), "https://studio.tapthemagic.com");
    const cov = listAliasCoverage(["NEXT_PUBLIC_APP_URL"]);
    assert.equal(cov[0]?.presentVia, "alias");
    assert.equal(cov[0]?.aliasUsed, "APP_URL");
  });

  it("reports missing without throwing", () => {
    assert.equal(resolveEnv("OPENAI_API_KEY"), undefined);
    assert.equal(listAliasCoverage(["OPENAI_API_KEY"])[0]?.presentVia, "missing");
  });

  it("documents twitter → X alias family", () => {
    assert.ok((ENV_ALIASES.X_API_KEY ?? []).includes("TWITTER_API_KEY"));
  });
});
