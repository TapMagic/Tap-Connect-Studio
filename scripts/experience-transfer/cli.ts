import { appendAuditEvent } from '../../lib/control/audit';
/** Operator-only selective transfer. Export is local-only; plan is read-only; apply requires a reviewed plan hash. */
import { isPlatformAdminEmail } from '../../lib/config/admins';
import { calculateEffectiveEntitlement } from '../../lib/control/entitlements';
import { validateSignaturePublication } from '../../lib/fusion/card/signature-publication-validation';
import { SIGNATURE_FAMILIES } from '../../lib/fusion/creative-studio/signature-assets/registry';
import type { SignatureEntitlementKey } from '../../lib/fusion/creative-studio/signature-assets/types';
import type { TapConnectCardConfig } from '../../lib/brand/tap-card';
import { parseArgs } from 'node:util';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { Prisma, type MediaAsset } from '@prisma/client';
import { prisma } from '../../lib/db';
import { prepareUploadedImage } from '../../lib/media/service';
import { putMediaObject, readMediaObject, deleteMediaObject } from '../../lib/media/storage';
import { collectPreviewLocalMediaKeys, inspectPreviewVisualResourcePortability } from '../../lib/fusion/creative-studio/preview/visual-resources';
import { digest, validateBundle, projectBundle, jsonInput, type TransferBundle, type ObjectEntry } from './core';
const { positionals, values: args } = parseArgs({ allowPositionals: true, options: { package: { type: 'string' }, experience: { type: 'string' }, tenant: { type: 'string' }, actor: { type: 'string' }, 'media-origin': { type: 'string' }, 'approved-plan': { type: 'string' }, execute: { type: 'boolean' }, 'local-test': { type: 'boolean' } } });
const mode = positionals[0], dir = path.resolve(args.package || '');
if (!args.package)
    throw new Error('--package directory required');
function loopback() { return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(process.env.DATABASE_URL || '').hostname); }
async function save(name: string, value: unknown) { await writeFile(path.join(dir, name), JSON.stringify(value, null, 2), { mode: 0o600 }); }
async function exportBundle() {
    if (!loopback())
        throw new Error('Export requires the local source database');
    if (!args.experience)
        throw new Error('--experience required');
    await mkdir(dir, { recursive: false, mode: 0o700 });
    await mkdir(path.join(dir, 'objects'), { mode: 0o700 });
    const bundle = await prisma.$transaction(async (tx) => {
        const document = await tx.cardCreativeDocument.findUniqueOrThrow({ where: { id: args.experience } });
        const sourceTenant = await tx.business.findUniqueOrThrow({ where: { id: document.businessId }, select: { id: true, name: true, logoUrl: true } });
        const snapshots = await tx.publicationSnapshot.findMany({ where: { businessId: document.businessId, subjectType: 'experience', subjectId: document.id }, orderBy: { version: 'asc' } });
        const destination = await tx.experiencePublicDestination.findUniqueOrThrow({ where: { experienceId: document.id } });
        const credentials = await tx.experienceAccessCredential.findMany({ where: { businessId: document.businessId, destinationId: destination.id } });
        const mediaIds = new Set<string>();
        function ids(v: unknown) {
            if (v && typeof v === 'object')
                for (const [k, x] of Object.entries(v)) {
                    if (typeof x === 'string' && /^(?:mediaAssetId|backgroundMediaAssetId|posterMediaAssetId|sourceMediaAssetId)$/.test(k))
                        mediaIds.add(x);
                    else
                        ids(x);
                }
        }
        ids(document.draft);
        snapshots.forEach(s => ids(s.manifest));
        const keys = collectPreviewLocalMediaKeys({ draft: document.draft, snapshots: snapshots.map(s => s.manifest) });
        const media = await tx.mediaAsset.findMany({ where: { businessId: document.businessId, OR: [{ id: { in: [...mediaIds] } }, { storageKey: { in: [...keys] } }] } });
        if ([...mediaIds].some(id => !media.some(m => m.id === id)))
            throw new Error('Referenced MediaAsset is missing');
        for (let i = 0; i < media.length; i++) {
            const parent = media[i].parentAssetId;
            if (parent && !media.some(m => m.id === parent))
                media.push(await tx.mediaAsset.findFirstOrThrow({ where: { id: parent, businessId: document.businessId } }));
        }
        return { format: 'tapconnect-experience-transfer@1' as const, sourceCommit: execFileSync('git', ['rev-parse', 'HEAD']).toString().trim(), createdAt: new Date().toISOString(), sourceTenant, document, snapshots, destination, credentials, media, objects: [] as ObjectEntry[], inlineReplacements: {} };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 30000 });
    const typed: TransferBundle = bundle;
    const keySet = collectPreviewLocalMediaKeys({ document: bundle.document, snapshots: bundle.snapshots.map(s => s.manifest), media: bundle.media });
    for (const m of bundle.media)
        if (m.storageKey)
            keySet.add(m.storageKey);
    async function object(key: string, bytes: Buffer, mimeType: string) { const sha256 = digest(bytes); await writeFile(path.join(dir, 'objects', sha256), bytes, { mode: 0o600 }); typed.objects.push({ sourceKey: key, sha256, size: bytes.length, mimeType }); }
    for (const key of keySet) {
        const bytes = await readMediaObject(key);
        const ext = key.split('.').pop();
        const mime = ({ png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', gif: 'image/gif', avif: 'image/avif' } as Record<string, string>)[ext || ''];
        if (!mime)
            throw new Error('Unsupported object format');
        await object(key, bytes, mime);
    }
    const inline = new Set<string>();
    function collect(v: unknown) {
        if (typeof v === 'string' && v.startsWith('data:'))
            inline.add(v);
        else if (v && typeof v === 'object')
            Object.values(v).forEach(collect);
    }
    collect(bundle.document);
    collect(bundle.snapshots);
    for (const data of inline) {
        const match = data.match(/^data:image\/svg\+xml(;base64)?,([\s\S]+)$/);
        if (!match || data.length > 4000000)
            throw new Error('Unsupported inline visual: migrate through Asset Library first');
        const source = match[1] ? Buffer.from(match[2], 'base64') : Buffer.from(decodeURIComponent(match[2]));
        const prepared = await prepareUploadedImage({ bytes: source, declaredMimeType: 'image/svg+xml', filename: 'transferred-visual.svg' });
        const hash = digest(prepared.originalBytes), key = `${bundle.sourceTenant.id}/uploads/originals/${hash}.svg`, id = 'transfer-svg-' + hash.slice(0, 32);
        if (!typed.objects.some(o => o.sourceKey === key))
            await object(key, prepared.originalBytes, 'image/svg+xml');
        typed.inlineReplacements[data] = { sourceKey: key, assetId: id };
        if (!typed.media.some(m => m.id === id)) {
            const template: MediaAsset = { ...bundle.media[0], id, businessId: bundle.sourceTenant.id, campaignId: null, url: '/api/media/local?key=' + encodeURIComponent(key), storageKey: key, sourceUrl: '/api/media/local?key=' + encodeURIComponent(key), filename: 'Normalized imported visual.svg', sourcePageUrl: null, creatorName: null, creatorUrl: null, attributionName: null, attributionUrl: null, licenseCode: null, licenseUrl: null, attributionText: null, rights: null, rightsNote: 'Normalized source SVG through canonical media ingestion; source retained in checkpoint.', defaultAltText: 'Imported source visual', mimeType: 'image/svg+xml', contentHash: hash, sizeBytes: prepared.originalBytes.length, width: null, height: null, source: 'upload', provider: null, providerAssetId: null, providerId: null, parentAssetId: null, renditionKind: 'original', derivationRecipe: null, approvedById: null, approvalStatus: 'UNREVIEWED', approvedAt: null, importedAt: new Date() };
            typed.media.push(template);
        }
    }
    validateBundle(typed);
    await save('bundle.json', typed);
    const bytes = await readFile(path.join(dir, 'bundle.json'));
    await writeFile(path.join(dir, 'bundle.sha256'), digest(bytes) + '\n', { mode: 0o600 });
    console.log(JSON.stringify({ exported: true, revision: typed.document.draftRevision, pages: (typed.document.draft as {
            experience?: {
                pages: unknown[];
            };
        }).experience?.pages.length, snapshots: typed.snapshots.length, credentials: typed.credentials.length, media: typed.media.length, objects: typed.objects.length, normalizedInlineVisuals: inline.size, bundleHash: digest(bytes) }));
}
async function loadBundle() {
    const bytes = await readFile(path.join(dir, 'bundle.json'));
    if (digest(bytes) !== (await readFile(path.join(dir, 'bundle.sha256'), 'utf8')).trim())
        throw new Error('Bundle checksum mismatch');
    const bundle = JSON.parse(bytes.toString()) as TransferBundle;
    validateBundle(bundle);
    for (const o of bundle.objects) {
        const b = await readFile(path.join(dir, 'objects', o.sha256));
        if (b.length !== o.size || digest(b) !== o.sha256)
            throw new Error('Object checksum mismatch');
    }
    return { bundle, hash: digest(bytes) };
}
async function check(tx: Prisma.TransactionClient, b: TransferBundle) {
    if (!args.tenant || !args.actor)
        throw new Error('--tenant and --actor required');
    const membership = await tx.businessUser.findUnique({ where: { businessId_userId: { businessId: args.tenant, userId: args.actor } }, include: { user: true, business: true } });
    if (!membership || membership.role !== 'OWNER' || membership.user.platformStatus !== 'ACTIVE' || membership.business.lifecycleState !== 'ACTIVE')
        throw new Error('Active target OWNER authorization required');
    if (inspectPreviewVisualResourcePortability({ logoUrl: membership.business.logoUrl }).length)
        throw new Error('Target tenant logo must first use canonical Assets');
    if (await tx.cardCreativeDocument.count({ where: { businessId: args.tenant } }) || await tx.mediaAsset.count({ where: { businessId: args.tenant } }) || await tx.experiencePublicDestination.count({ where: { businessId: args.tenant } }))
        throw new Error('Target must be a dedicated empty tenant; refusing shared customer data');
    const collisions = [await tx.cardCreativeDocument.count({ where: { id: b.document.id } }), await tx.experiencePublicDestination.count({ where: { OR: [{ id: b.destination.id }, { slug: b.destination.slug }, { experienceId: b.document.id }] } }), await tx.experienceAccessCredential.count({ where: { OR: [{ id: { in: b.credentials.map(c => c.id) } }, { tokenHash: { in: b.credentials.map(c => c.tokenHash) } }] } }), await tx.mediaAsset.count({ where: { id: { in: b.media.map(m => m.id) } } }), await tx.publicationSnapshot.count({ where: { id: { in: b.snapshots.map(s => s.id) } } })];
    if (collisions.some(Boolean))
        throw new Error('Identity/slug/hash collision; no overwrite permitted');
    const keys = SIGNATURE_FAMILIES.flatMap(f => f.entitlement ? [f.entitlement.entitlementKey] : []);
    let permitted: readonly SignatureEntitlementKey[] = keys;
    if (!isPlatformAdminEmail(membership.user.email)) {
        const services = await tx.serviceDefinition.findMany({ where: { key: { in: keys }, status: 'ACTIVE' }, include: { planEntitlements: { where: { planId: membership.business.planDefinitionId ?? '__none__' } }, overrides: { where: { businessId: args.tenant, status: 'ACTIVE', revokedAt: null } }, restrictions: { where: { businessId: args.tenant, revokedAt: null } } } });
        permitted = services.filter(s => calculateEffectiveEntitlement({ plan: s.planEntitlements[0] ? { source: 'plan entitlement', enabled: s.planEntitlements[0].enabled, allowance: s.planEntitlements[0].allowance } : s.defaultEnabled ? { source: 'service default', enabled: true } : null, overrides: s.overrides.map(o => ({ source: 'business override', enabled: o.enabled, allowance: o.allowance, startsAt: o.startsAt, expiresAt: o.expiresAt })), restrictions: s.restrictions.map(r => ({ source: 'account restriction', enabled: false, startsAt: r.startsAt, expiresAt: r.expiresAt })) }).enabled).map(s => s.key as SignatureEntitlementKey);
    }
    for (const doc of [b.document.draft, ...b.snapshots.map(s => (s.manifest as {
            document?: unknown;
        }).document)])
        if (!validateSignaturePublication(doc as TapConnectCardConfig, permitted).ok)
            throw new Error('Target entitlement does not permit required Curated content');
    return membership;
}
async function targetPlan() {
    const { bundle, hash } = await loadBundle();
    const origin = args['media-origin'] || process.env.R2_PUBLIC_URL;
    if (!origin)
        throw new Error('--media-origin required');
    if (!loopback() && !origin.startsWith('https://'))
        throw new Error('Production media requires HTTPS');
    if (origin === 'local-fixture' && (!loopback() || !args['local-test'] || process.env.CREATIVE_PROVIDER_MODE !== 'fixture'))
        throw new Error('Fixture media is local-test only');
    if (!loopback() && origin.replace(/\/$/, '') !== process.env.R2_PUBLIC_URL?.replace(/\/$/, '')) throw new Error('Media origin must match the existing configured R2 delivery origin');
    const projected = projectBundle(bundle, args.tenant || '', origin);
    return prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
        await check(tx, bundle);
        const database = (await tx.$queryRawUnsafe<{
            name: string;
        }[]>('SELECT current_database() AS name'))[0].name;
        const columns = await tx.$queryRawUnsafe<{
            table_name: string;
            column_name: string;
        }[]>("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public'");
        for (const [table, col] of [['CardCreativeDocument', 'draftRevision'], ['ExperienceAccessCredential', 'tokenHash'], ['MediaAsset', 'derivationRecipe'], ['PublicationSnapshot', 'manifest']])
            if (!columns.some(c => c.table_name === table && c.column_name === col))
                throw new Error('Target schema mismatch: ' + table + '.' + col);
        const plan = { bundleHash: hash, targetHost: new URL(process.env.DATABASE_URL!).hostname, database, tenant: args.tenant, actor: args.actor, release: execFileSync('git', ['-C', path.resolve(__dirname, '../..'), 'rev-parse', 'HEAD']).toString().trim(), mediaOrigin: origin, documentId: bundle.document.id, revision: bundle.document.draftRevision, credentialIds: bundle.credentials.map(c => c.id), objectKeys: projected.objects.map(o => o.targetKey), importedAsUnpublished: true };
        return { plan, planHash: digest(JSON.stringify(plan)), projected, bundle };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 });
}
async function apply() {
    if (!args.execute || (!loopback() && args['local-test']))
        throw new Error('Explicit --execute required; --local-test is loopback-only');
    const result = await targetPlan();
    if (args['approved-plan'] !== result.planHash)
        throw new Error('Approved plan hash mismatch; run plan and obtain approval');
    if (loopback() && !args['local-test'])
        throw new Error('Local execution requires --local-test');
    const created: {
        targetKey: string;
        sha256: string;
    }[] = [];
    let committed = false;
    try {
        await prisma.$transaction(async (tx) => {
            await tx.$queryRawUnsafe('SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext($1))', result.bundle.document.id);
            await check(tx, result.bundle);
            for (const o of result.projected.objects) {
                // Keep an intent record before remote IO; unknown write outcomes
                // must be reviewed, never treated as permission to delete a key.
                await save('pending-upload-ledger.json', { planHash: result.planHash, objects: created, attempting: { targetKey: o.targetKey, sha256: o.sha256 } });
                await putMediaObject({ storageKey: o.targetKey, bytes: await readFile(path.join(dir, 'objects', o.sha256)), mimeType: o.mimeType, ifAbsent: true });
                created.push({ targetKey: o.targetKey, sha256: o.sha256 });
                await save('pending-upload-ledger.json', { planHash: result.planHash, objects: created });
            }
            // Parent-first source order; only insert, never upsert/update customer rows.
            const remaining = [...result.projected.media];
            while (remaining.length) {
                const index = remaining.findIndex(m => !m.parentAssetId || !remaining.some(p => p.id === m.parentAssetId));
                if (index < 0)
                    throw new Error('Cyclic media derivation');
                const m = remaining.splice(index, 1)[0];
                await tx.mediaAsset.create({ data: { ...m, approvedById: null, derivationRecipe: m.derivationRecipe == null ? Prisma.DbNull : jsonInput(m.derivationRecipe) } as Prisma.MediaAssetUncheckedCreateInput });
            }
            for (const s of result.projected.snapshots)
                await tx.publicationSnapshot.create({ data: { ...s, publishedById: args.actor, tapPointId: null, manifest: jsonInput(s.manifest) } });
            await tx.cardCreativeDocument.create({ data: { ...result.projected.document, sourceDocumentId: null, draft: jsonInput(result.projected.document.draft) } });
            await tx.experiencePublicDestination.create({ data: result.projected.destination });
            for (const c of result.projected.credentials)
                await tx.experienceAccessCredential.create({ data: c });
            await appendAuditEvent({ client: tx, actorId: args.actor, businessId: args.tenant, action: 'studio.experience.imported', permissionUsed: 'card.draft.edit', resourceType: 'Experience', resourceId: result.bundle.document.id, newValue: { bundleHash: result.plan.bundleHash, revision: result.plan.revision, published: false }, metadata: { planHash: result.planHash } });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 120000 });
        committed = true;
        await save('import-receipt.json', { ...result.plan, planHash: result.planHash, createdAt: new Date().toISOString(), objects: created, mediaIds: result.projected.media.map(m => m.id), snapshotIds: result.projected.snapshots.map(s => s.id), destinationId: result.projected.destination.id, draftHash: digest(JSON.stringify(result.projected.document.draft)), credentialState: result.projected.credentials.map(c => ({ id: c.id, tokenHash: c.tokenHash, status: c.status, redemptionCount: c.redemptionCount })) });
        console.log(JSON.stringify({ imported: true, published: false, documentId: result.bundle.document.id, planHash: result.planHash }));
    }
    catch (e) {
        if (!committed)
            for (const o of created) {
                try {
                    if (digest(await readMediaObject(o.targetKey)) === o.sha256)
                        await deleteMediaObject(o.targetKey);
                }
                catch { /* Keep ledger for explicit recovery; never delete unknown bytes. */ }
            }
        throw e;
    }
}
async function rollback() {
    if (!args.execute)
        throw new Error('Rollback requires explicit --execute');
    const receipt = JSON.parse(await readFile(path.join(dir, 'import-receipt.json'), 'utf8'));
    if (receipt.planHash !== args['approved-plan'] || receipt.tenant !== args.tenant || receipt.actor !== args.actor)
        throw new Error('Receipt/target/approval mismatch');
    const database = (await prisma.$queryRawUnsafe<{
        name: string;
    }[]>('SELECT current_database() AS name'))[0].name;
    if (database !== receipt.database || new URL(process.env.DATABASE_URL!).hostname !== receipt.targetHost)
        throw new Error('Wrong rollback database');
    await prisma.$transaction(async (tx) => {
        const member = await tx.businessUser.findUnique({ where: { businessId_userId: { businessId: args.tenant!, userId: args.actor! } } });
        if (member?.role !== 'OWNER')
            throw new Error('Target OWNER required');
        const d = await tx.cardCreativeDocument.findFirstOrThrow({ where: { id: receipt.documentId, businessId: receipt.tenant } });
        if (d.draftRevision !== receipt.revision || d.publicationActive || digest(JSON.stringify(d.draft)) !== receipt.draftHash)
            throw new Error('Imported document was edited/published; preserve it and use explicit reviewed rollback');
        const credentials = await tx.experienceAccessCredential.findMany({ where: { destinationId: receipt.destinationId }, select: { id: true, tokenHash: true, status: true, redemptionCount: true } });
        const order = (rows: typeof credentials) => rows.sort((a, b) => a.id.localeCompare(b.id));
        if (JSON.stringify(order(credentials)) !== JSON.stringify(order(receipt.credentialState)))
            throw new Error('Credentials were used/changed; refusing deletion');
        const snapshots = await tx.publicationSnapshot.findMany({ where: { businessId: receipt.tenant, subjectType: 'experience', subjectId: d.id } });
        if (snapshots.length !== receipt.snapshotIds.length || snapshots.some(s => !receipt.snapshotIds.includes(s.id)))
            throw new Error('New publication history; refusing deletion');
        const other = await tx.cardCreativeDocument.findMany({ where: { businessId: receipt.tenant, id: { not: d.id } }, select: { draft: true } });
        if (other.some(x => receipt.mediaIds.some((id: string) => JSON.stringify(x.draft).includes(id))))
            throw new Error('Imported media is reused');
        await tx.cardCreativeDocument.delete({ where: { id: d.id } });
        await tx.publicationSnapshot.deleteMany({ where: { id: { in: receipt.snapshotIds }, businessId: receipt.tenant, subjectId: d.id } });
        await tx.mediaAsset.deleteMany({ where: { id: { in: receipt.mediaIds }, businessId: receipt.tenant } });
        await appendAuditEvent({ client: tx, actorId: args.actor, businessId: args.tenant, action: 'studio.experience.import_rolled_back', permissionUsed: 'card.draft.edit', resourceType: 'Experience', resourceId: receipt.documentId, newValue: { planHash: receipt.planHash } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    for (const o of receipt.objects) {
        if (await prisma.mediaAsset.count({ where: { storageKey: o.targetKey } }))
            continue;
        if (digest(await readMediaObject(o.targetKey)) !== o.sha256)
            throw new Error('Object changed; retained for review');
        await deleteMediaObject(o.targetKey);
    }
    await save('rollback-receipt.json', { planHash: receipt.planHash, rolledBackAt: new Date().toISOString() });
    console.log('Only unchanged imported records and verified unused objects removed');
}
(async () => {
    if (mode === 'export')
        await exportBundle();
    else if (mode === 'plan') {
        const { plan, planHash } = await targetPlan();
        await save('target-plan.json', { plan, planHash });
        console.log(JSON.stringify({ plan, planHash }, null, 2));
    }
    else if (mode === 'apply')
        await apply();
    else if (mode === 'rollback')
        await rollback();
    else
        throw new Error('Use export | plan | apply | rollback');
})().catch(e => { console.error(e instanceof Error ? e.message : 'Transfer failed'); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
