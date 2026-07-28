---
name: Fusion dev DB setup
description: How to run TapConnect fusion app against Replit Postgres despite the DB safety guard
---
The fusion safety guard (lib/fusion/db/safety.ts) refuses any DATABASE_URL whose db name lacks "fusion"+"dev". On Replit Postgres, create `tapconnect_fusion_dev` on the same server and run everything with:
`DATABASE_URL="postgresql://$PGUSER:$PGPASSWORD@$PGHOST:5432/tapconnect_fusion_dev?sslmode=disable" FUSION_ALLOW_REMOTE_DEV_DB=true FUSION_CONFIRM_ISOLATED_DEV_DB=tapconnect_fusion_dev`
**Why:** guard blocks shared/hosted DBs; migrations assume a V1 baseline so fresh DBs need `npx prisma db push --accept-data-loss`, then `npm run fusion:seed`.
**How to apply:** the "Start application" workflow inlines these env vars; reuse the same prefix for build/smoke/seed commands.

Environment quirks: node/npm are NOT on the shell PATH — prefix commands with `PATH=/nix/store/bf45nflf0wylnscwwa2xgliib91x226l-nodejs-22.22.0/bin:$PATH`. Preview needs `.replit` to forward localPort 5000 → external 80 (edit via `.replit.new` + verifyAndReplaceDotReplit). Running `test:fusion` WITH the FUSION_ env flags makes 3 DB-safety tests fail (env leaks into tests); run tests without those flags for a clean 744-pass baseline.
