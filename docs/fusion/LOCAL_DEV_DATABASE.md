# Isolated Fusion Development Database

## Absolute rule

The existing **Railway PostgreSQL database is off-limits**.

Do **not**:

- connect fusion migrations to Railway
- run `prisma db push` against Railway, production, shared, or V1 databases
- migrate, reset, or alter any database that is not proven isolated for this fusion branch

Prisma remains the **authoritative production persistence path**. File-backed FeatureOverride storage is **development-only**.

## Required isolated database

| Property | Value |
|----------|--------|
| Engine | PostgreSQL 16+ |
| Database name | `tapconnect_fusion_dev` |
| User / password (local default) | `tapconnect` / `tapconnect` |
| Host | `127.0.0.1` |
| Port | `5433` (avoids colliding with other local Postgres) |
| Connection URL | `postgresql://tapconnect:tapconnect@127.0.0.1:5433/tapconnect_fusion_dev` |

The fusion safety guard (`lib/fusion/db/safety.ts`) refuses:

- Railway / common hosted hosts
- non-local hosts (unless double-confirmed)
- DB names that do not include both `fusion` and `dev`
- generic names like `postgres`, `railway`, `tapconnect`

## Start local Postgres (Docker)

From the fusion worktree:

```bash
docker compose -f docker-compose.fusion-dev.yml up -d
```

Then in `.env.local` (never commit secrets):

```bash
DATABASE_URL="postgresql://tapconnect:tapconnect@127.0.0.1:5433/tapconnect_fusion_dev"
```

Apply migrations **only** to this DB:

```bash
npx prisma migrate deploy
# OR for iterative local schema work on the isolated DB only:
npx prisma migrate dev --name <descriptive_name>
```

Still **never** use `prisma db push` against Railway or shared environments. Prefer migrate history.

## Prove isolation before any migrate

Checklist:

1. `DATABASE_URL` host is `127.0.0.1` or `localhost`
2. Database name is exactly `tapconnect_fusion_dev` (or clearly `*fusion*dev*`)
3. Docker container name is `tapconnect-fusion-dev-pg`
4. You are on branch `tapconnect-v1-v2-fusion`
5. You are **not** using Railway dashboard connection strings

## Persistence layers

| Concern | Production / isolated Postgres | Local without DB |
|---------|--------------------------------|------------------|
| Feature overrides | `PrismaFeatureOverrideRepository` | `FileFeatureOverrideRepository` → `.fusion/` (gitignored) |
| Selection | `getFeatureOverrideRepository()` via `assertSafeFusionDatabaseUrl` | automatic file fallback |

Both implement `FeatureOverrideRepository`.

## Remote hosted isolated DB (rare)

Only if you create a **brand-new** empty database whose sole purpose is fusion branch development:

```bash
FUSION_ALLOW_REMOTE_DEV_DB=true
FUSION_CONFIRM_ISOLATED_DEV_DB=tapconnect_fusion_dev
DATABASE_URL=postgresql://…/tapconnect_fusion_dev
```

Do not set these flags for the existing Railway V1/production database.
