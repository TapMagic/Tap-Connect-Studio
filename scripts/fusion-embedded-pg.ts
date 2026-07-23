/**
 * Start isolated Postgres for flight-test when Docker is unavailable.
 * Binds 127.0.0.1:5433 with user/password tapconnect and DB tapconnect_fusion_dev.
 *
 * Usage: npx tsx scripts/fusion-embedded-pg.ts
 * Leave running in a terminal; Ctrl+C stops the cluster.
 */

import path from "node:path";
import fs from "node:fs";
import EmbeddedPostgres from "embedded-postgres";

const PORT = 5433;
const USER = "tapconnect";
const PASSWORD = "tapconnect";
const DB = "tapconnect_fusion_dev";
const databaseDir = path.join(process.cwd(), ".fusion", "embedded-pg");

async function main() {
  fs.mkdirSync(databaseDir, { recursive: true });

  const pg = new EmbeddedPostgres({
    databaseDir,
    user: USER,
    password: PASSWORD,
    port: PORT,
    persistent: true,
  });

  const marker = path.join(databaseDir, "PG_VERSION");
  if (!fs.existsSync(marker)) {
    console.log("Initialising embedded Postgres cluster…");
    await pg.initialise();
  } else {
    console.log("Reusing existing cluster at", databaseDir);
  }

  console.log(`Starting Postgres on 127.0.0.1:${PORT}…`);
  await pg.start();

  try {
    await pg.createDatabase(DB);
    console.log(`Created database ${DB}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/already exists/i.test(msg)) {
      console.log(`Database ${DB} already exists`);
    } else {
      console.warn("createDatabase:", msg);
    }
  }

  console.log("");
  console.log("READY — isolated fusion DB:");
  console.log(
    `DATABASE_URL=postgresql://${USER}:${PASSWORD}@127.0.0.1:${PORT}/${DB}`
  );
  console.log("Leave this process running. Ctrl+C to stop.");

  const shutdown = async () => {
    console.log("\nStopping embedded Postgres…");
    try {
      await pg.stop();
    } catch {
      /* ignore */
    }
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Keep alive
  await new Promise(() => undefined);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
