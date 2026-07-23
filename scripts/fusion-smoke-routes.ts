#!/usr/bin/env npx tsx
/**
 * Fusion critical-route inventory + optional curl checklist.
 *
 * Usage:
 *   npx tsx scripts/fusion-smoke-routes.ts           # print route table
 *   npx tsx scripts/fusion-smoke-routes.ts --curl    # emit curl commands
 *   BASE_URL=http://localhost:3000 npx tsx scripts/fusion-smoke-routes.ts --probe
 *
 * Playwright is not a dependency — this script documents smoke coverage.
 * Probe mode skips cleanly when the server is unreachable (exit 0 with note).
 */

export type SmokeRoute = {
  method: "GET" | "POST";
  path: string;
  auth: "public" | "session" | "platform_admin";
  notes: string;
};

export const FUSION_SMOKE_ROUTES: SmokeRoute[] = [
  // Public / health
  { method: "GET", path: "/api/health", auth: "public", notes: "DB ping; 200 or 503" },
  { method: "GET", path: "/t/{deviceCode}", auth: "public", notes: "Tap landing / campaign render" },
  { method: "GET", path: "/mytap/{relationshipId}", auth: "public", notes: "MyTap preference surface" },

  // Studio hubs (session)
  { method: "GET", path: "/dashboard", auth: "session", notes: "Home hub" },
  { method: "GET", path: "/dashboard/experiences", auth: "session", notes: "Experiences hub" },
  { method: "GET", path: "/dashboard/experiences/journeys", auth: "session", notes: "TapFlow editor" },
  { method: "GET", path: "/dashboard/card", auth: "session", notes: "Builder / Tap Card" },
  { method: "GET", path: "/dashboard/workbench", auth: "session", notes: "Campaign workbench" },
  { method: "GET", path: "/dashboard/audience", auth: "session", notes: "Audience hub" },
  { method: "GET", path: "/dashboard/audience/inbox", auth: "session", notes: "Inbox shell" },
  { method: "GET", path: "/dashboard/audience/wallet", auth: "session", notes: "Wallet manager" },
  { method: "GET", path: "/dashboard/insights", auth: "session", notes: "Insights" },
  { method: "GET", path: "/dashboard/tap-points", auth: "session", notes: "Tap Points" },
  { method: "GET", path: "/dashboard/settings", auth: "session", notes: "Settings / billing fold-in" },
  { method: "GET", path: "/dashboard/billing", auth: "session", notes: "Billing dashboard" },

  // Fusion APIs (session unless noted)
  { method: "GET", path: "/api/outbox?view=dead", auth: "session", notes: "Dead-letter list" },
  { method: "GET", path: "/api/wallet", auth: "session", notes: "Wallet passes list" },
  { method: "GET", path: "/api/inbox", auth: "session", notes: "Inbox threads" },
  { method: "GET", path: "/api/loyalty/programs", auth: "session", notes: "TapLoop programs" },
  { method: "GET", path: "/api/journeys/draft", auth: "session", notes: "Journey drafts" },
  { method: "GET", path: "/api/audience/contacts", auth: "session", notes: "Audience contacts" },
  { method: "POST", path: "/api/tapsave/keep", auth: "public", notes: "Keep Card (JSON body)" },
  { method: "POST", path: "/api/loyalty/award", auth: "session", notes: "Idempotent award" },
  { method: "POST", path: "/api/ai/proposals", auth: "session", notes: "Autopilot proposals" },

  // Platform admin
  { method: "GET", path: "/admin/platform", auth: "platform_admin", notes: "Control plane" },
  { method: "GET", path: "/admin/platform/outbox", auth: "platform_admin", notes: "Outbox ops" },
  { method: "GET", path: "/admin/platform/overrides", auth: "platform_admin", notes: "Feature overrides" },
  { method: "GET", path: "/api/admin/features", auth: "platform_admin", notes: "Feature registry API" },
];

function printTable() {
  console.log("Fusion smoke routes (Playwright not installed — use curl / manual)\n");
  console.log(
    [
      "METHOD".padEnd(6),
      "AUTH".padEnd(16),
      "PATH".padEnd(42),
      "NOTES",
    ].join(" ")
  );
  console.log("-".repeat(100));
  for (const r of FUSION_SMOKE_ROUTES) {
    console.log(
      [r.method.padEnd(6), r.auth.padEnd(16), r.path.padEnd(42), r.notes].join(" ")
    );
  }
  console.log(`\nTotal: ${FUSION_SMOKE_ROUTES.length} routes`);
}

function printCurl(base: string) {
  console.log(`# Fusion curl checklist — BASE=${base}\n`);
  console.log(`# Public`);
  console.log(`curl -sS -o /dev/null -w "%{http_code} /api/health\\n" "${base}/api/health"`);
  console.log(`\n# Session cookies required for the rest — open DevTools → copy Cookie header`);
  console.log(`COOKIE='__session=…'`);
  for (const r of FUSION_SMOKE_ROUTES.filter((x) => x.method === "GET" && x.auth !== "public")) {
    console.log(
      `curl -sS -o /dev/null -w "%{http_code} ${r.path}\\n" -H "Cookie: $COOKIE" "${base}${r.path.replace(/\{[^}]+\}/g, "demo")}"`
    );
  }
  console.log(`\n# Public Keep Card (expect 4xx without real businessId — proves route alive)`);
  console.log(
    `curl -sS -o /dev/null -w "%{http_code} POST /api/tapsave/keep\\n" -X POST "${base}/api/tapsave/keep" -H 'Content-Type: application/json' -d '{"businessId":"x","email":"smoke@example.com"}'`
  );
}

async function probe(base: string) {
  const healthUrl = `${base.replace(/\/$/, "")}/api/health`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(healthUrl, { signal: ctrl.signal });
    clearTimeout(t);
    console.log(`Probe OK: ${healthUrl} → ${res.status}`);
    const body = await res.json().catch(() => ({}));
    console.log(JSON.stringify(body));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`Probe skipped (no server): ${healthUrl}`);
    console.log(`  ${msg}`);
    console.log("Start `npm run dev` then re-run with --probe.");
  }
}

const args = process.argv.slice(2);
const base = process.env.BASE_URL ?? "http://localhost:3000";

if (args.includes("--curl")) printCurl(base);
else if (args.includes("--probe")) void probe(base);
else printTable();
