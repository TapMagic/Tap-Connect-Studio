# Fusion Execution Map — 2026-07-23

## Verified workspace

| Item | Value |
|------|-------|
| Folder | `/Users/rcs/Development/tap-connect-studio-fusion` |
| Branch | `tapconnect-v1-v2-fusion` |
| HEAD | `7357fd9806d56d07d9ded68eef2beec5ea578052` |
| Worktree | Clean at start |
| V1 base | Same tip as `main` merge-base (V1 product tree) |
| Cody ref | `/Users/rcs/Development/tap-connect-studio` @ `50f5604` `tapflow-tapsave-architecture` (RO) |
| Design Lab | `/Users/rcs/Development/tap-connect-studio-cursor` `cursor-ux-design-lab` (RO) |

## Protected confirmation

No push · no merge · no deploy · no production · no `main` edits

## Milestone A/B progress

- [x] Fusion docs + Cody selective import guide  
- [x] Feature Registry + Admin panel with **persisted** overrides (Prisma or `.fusion/` file)  
- [x] API `POST/GET /api/admin/features` (reason required, audited)  
- [x] Prisma migration SQL `20260723000000_fusion_spine`  
- [x] Time-travel preview on Campaign Groups  
- [x] Freeform canvas behind `card.builder.freeform`  
- [x] Expanded Format controls + restored Workbench blocks  

## Apply migration when isolated DATABASE_URL is set

```bash
npm run fusion:dev-db
# .env.local → DATABASE_URL=postgresql://tapconnect:tapconnect@127.0.0.1:5433/tapconnect_fusion_dev
npm run db:migrate:deploy
```

**Never** point migrate at Railway. `npm run db:push` is refused by design.
  

## Risks

- Schema additions need migration before runtime use  
- node_modules may be missing in this worktree  
- Cody V2 Builder is thinner — never import its Builder as replacement  
