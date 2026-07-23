/**
 * Safe migrate helper — refuses Railway/shared DBs.
 * Usage: npx tsx scripts/fusion-migrate.ts deploy|status
 */

import { spawnSync } from "node:child_process";
import { assertSafeFusionDatabaseUrl } from "../lib/fusion/db/safety";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error(
    "No DATABASE_URL. Start isolated Postgres:\n  docker compose -f docker-compose.fusion-dev.yml up -d\nThen set DATABASE_URL to tapconnect_fusion_dev. See docs/fusion/LOCAL_DEV_DATABASE.md"
  );
  process.exit(1);
}

const safety = assertSafeFusionDatabaseUrl(url);
if (!safety.ok) {
  console.error("REFUSING migration:", safety.reason);
  process.exit(1);
}

const action = process.argv[2] || "status";
const args =
  action === "deploy"
    ? ["prisma", "migrate", "deploy"]
    : action === "dev"
      ? ["prisma", "migrate", "dev", ...(process.argv.slice(3) || [])]
      : ["prisma", "migrate", "status"];

console.log("Fusion migrate on isolated DB only…");
const result = spawnSync("npx", args, { stdio: "inherit", env: process.env });
process.exit(result.status ?? 1);
