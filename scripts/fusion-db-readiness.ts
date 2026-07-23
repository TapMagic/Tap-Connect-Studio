/**
 * Safe DB readiness proof — prints redacted host/port/db, never password.
 * Exit 0 when assertSafeFusionDatabaseUrl passes; non-zero otherwise.
 *
 * Usage: npx tsx scripts/fusion-db-readiness.ts
 * npm run fusion:db-ready
 */

import { assertSafeFusionDatabaseUrl } from "../lib/fusion/db/safety";

function redactUrl(url: string): {
  protocol: string;
  host: string;
  port: string;
  database: string;
  user: string;
} {
  try {
    const parsed = new URL(url);
    return {
      protocol: parsed.protocol.replace(/:$/, ""),
      host: parsed.hostname || "(empty)",
      port: parsed.port || (parsed.protocol.startsWith("postgres") ? "5432" : ""),
      database: (parsed.pathname || "").replace(/^\//, "") || "(empty)",
      user: parsed.username || "(none)",
    };
  } catch {
    return {
      protocol: "(invalid)",
      host: "(invalid)",
      port: "",
      database: "(invalid)",
      user: "(invalid)",
    };
  }
}

const url = process.env.DATABASE_URL?.trim();

console.log("=== Fusion DB readiness (redacted) ===");

if (!url) {
  console.log("DATABASE_URL: (missing)");
  console.log("safety: FAIL");
  console.log("reason: DATABASE_URL is not set");
  console.log(
    "hint: docker compose -f docker-compose.fusion-dev.yml up -d && set DATABASE_URL to tapconnect_fusion_dev"
  );
  process.exit(1);
}

const redacted = redactUrl(url);
const safety = assertSafeFusionDatabaseUrl(url);

console.log(`protocol: ${redacted.protocol}`);
console.log(`host: ${redacted.host}`);
console.log(`port: ${redacted.port}`);
console.log(`database: ${redacted.database}`);
console.log(`user: ${redacted.user}`);
console.log(`password: (redacted)`);
console.log(`safety: ${safety.ok ? "OK" : "FAIL"}`);
if (!safety.ok) {
  console.log(`reason: ${safety.reason}`);
  process.exit(1);
}

console.log("isolated: true");
console.log("ready: yes");
process.exit(0);
