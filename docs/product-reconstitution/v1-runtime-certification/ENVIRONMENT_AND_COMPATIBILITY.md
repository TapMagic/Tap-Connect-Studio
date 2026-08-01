# Environment and Compatibility

## Isolation

- Detached exact commit: `7357fd9806d56d07d9ded68eef2beec5ea578052`
- Worktree: `/private/tmp/tap-connect-studio-v1-certification`
- V1 database: `tapconnect_v1_cert` in disposable container `tapconnect-v1-reconstitution-cert-pg`, PostgreSQL 16, loopback port 55441
- Current comparison database is separate: `tapconnect_current_fusion_dev` in `tapconnect-current-reconstitution-cert-pg`, loopback port 55442
- V1 server was loopback-only on port 3107. No Clerk, Resend, AI, storage, payment, production, staging, or customer credentials were supplied.

## Compatibility steps

1. `npm ci` used the historical lockfile unchanged. The first attempt failed on restricted network; the approved network retry succeeded. No dependency or lockfile was edited.
2. Runtime: Node `v24.18.0`, npm `11.16.0`, Next `16.2.10`, React `19.2.4`, Prisma/Client `7.8.0`. npm reported 22 audit findings (17 moderate, 5 high); no upgrade was attempted.
3. V1 has no committed Prisma migrations. `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script` generated disposable SQL at `/private/tmp/tapconnect-v1-cert-schema.sql`, applied only to the empty isolated V1 database with `psql`. `prisma db push` and `migrate resolve` were never used.
4. No compatibility patch was required. The detached worktree remained clean at the exact commit.

Evidence: `/private/tmp/tapconnect-v1-cert-evidence/logs/{node-version,npm-version,package-versions,worktree-status,worktree-head}.txt` and `/private/tmp/tapconnect-v1-cert-evidence/db/final-state.txt`.

## Evidence-medium blocker

The required in-app Browser bootstrap completed, but `agent.browsers.getForUrl("http://127.0.0.1:3107/")` reported no available browser and `agent.browsers.list()` returned an empty list. Therefore screenshot and short screen-recording requirements are **BLOCKED**. Real localhost HTTP responses, server-rendered visible text, API payloads, service resolver calls, and database rows were captured instead. This is why the final result is conditional rather than unconditional.

## Safety confirmation

No source/schema/migration file was changed in the V1 worktree. No provider action, publication, deployment, merge, payment, production access, customer contact, database push, or migration resolution occurred.
