/**
 * Fusion DB readiness — redacted proof before migrate/seed.
 * Never prints passwords. Exits 1 if unsafe.
 *
 * Usage: npx tsx scripts/fusion-db-readiness.ts
 */

import {
  assertSafeFusionDatabaseUrl,
  isIsolatedFusionDatabaseConfigured,
} from "../lib/fusion/db/safety";

function redactUrl(url: string): {
  protocol: string;
  host: string;
  port: string;
  database: string;
  user: string;
} {
  try {
    const u = new URL(url);
    return {
      protocol: u.protocol.replace(":", ""),
      host: u.hostname,
      port: u.port || (u.protocol === "postgresql:" || u.protocol === "postgres:" ? "5432" : ""),
      database: (u.pathname || "").replace(/^\//, "") || "(empty)",
      user: u.username || "(none)",
    };
  } catch {
    return {
      protocol: "invalid",
      host: "(unparseable)",
      port: "",
      database: "(unparseable)",
      user: "(none)",
    };
  }
}

function main() {
  const raw = process.env.DATABASE_URL?.trim() ?? "";
  console.log("=== TapConnect Fusion DB readiness (redacted) ===");
  console.log(`Branch context: expect tapconnect-v1-v2-fusion`);
  console.log(`DATABASE_URL set: ${raw ? "yes" : "no"}`);

  if (!raw) {
    console.log("Result: FAIL — DATABASE_URL is not set");
    console.log(
      "Expected: postgresql://tapconnect:***@127.0.0.1:5433/tapconnect_fusion_dev"
    );
    process.exit(1);
  }

  const redacted = redactUrl(raw);
  console.log("Parsed (password redacted):");
  console.log(`  protocol: ${redacted.protocol}`);
  console.log(`  host:     ${redacted.host}`);
  console.log(`  port:     ${redacted.port || "(default)"}`);
  console.log(`  database: ${redacted.database}`);
  console.log(`  user:     ${redacted.user}`);
  console.log(`  password: ***`);

  const safety = assertSafeFusionDatabaseUrl(raw);
  if (!safety.ok) {
    console.log(`Safety guard: REJECTED`);
    console.log(`  reason: ${safety.reason}`);
    console.log("Result: FAIL — refusing migrate/seed");
    process.exit(1);
  }

  const portOk = redacted.port === "5433" || redacted.port === "";
  const nameOk = redacted.database === "tapconnect_fusion_dev";
  const hostOk =
    redacted.host === "127.0.0.1" ||
    redacted.host === "localhost" ||
    redacted.host === "::1";

  console.log("Checklist:");
  console.log(`  isolated fusion name: ${nameOk ? "PASS" : "WARN — preferred exact tapconnect_fusion_dev"}`);
  console.log(`  local host:           ${hostOk ? "PASS" : "FAIL"}`);
  console.log(`  approved port 5433:   ${redacted.port === "5433" ? "PASS" : "WARN — got " + (redacted.port || "default")}`);
  console.log(`  safety guard:         PASS (isolated)`);
  console.log(`  isIsolatedConfigured: ${isIsolatedFusionDatabaseConfigured()}`);
  console.log(`  Railway/shared risk:  none (guard would reject hosted URLs)`);

  if (!hostOk) {
    console.log("Result: FAIL — host is not local");
    process.exit(1);
  }

  if (!portOk && redacted.port !== "5433") {
    console.log("Result: WARN — continue only if intentionally using alternate local port");
  }

  console.log("Result: READY for migrate/seed against isolated fusion DB only");
  process.exit(0);
}

main();
