import { createHash } from 'node:crypto';
import type { CardCreativeDocument, MediaAsset, PublicationSnapshot, ExperiencePublicDestination, ExperienceAccessCredential, Prisma } from '@prisma/client';
import { isTapConnectCardDraft } from '../../lib/fusion/card/draft';
import { inspectPreviewVisualResourcePortability } from '../../lib/fusion/creative-studio/preview/visual-resources';
import { hashPublishManifest } from '../../lib/fusion/publication/snapshots';
export type ObjectEntry = {
    sourceKey: string;
    sha256: string;
    size: number;
    mimeType: string;
};
export type TransferBundle = {
    format: 'tapconnect-experience-transfer@1';
    sourceCommit: string;
    createdAt: string;
    sourceTenant: {
        id: string;
        name: string;
        logoUrl: string | null;
    };
    document: CardCreativeDocument;
    snapshots: PublicationSnapshot[];
    destination: ExperiencePublicDestination;
    credentials: ExperienceAccessCredential[];
    media: MediaAsset[];
    objects: ObjectEntry[];
    inlineReplacements: Record<string, {
        sourceKey: string;
        assetId: string;
    }>;
};
export const digest = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
export function replaceStrings<T>(value: T, replacements: ReadonlyMap<string, string>): T {
    if (typeof value === 'string')
        return (replacements.get(value) ?? value) as T;
    if (Array.isArray(value))
        return value.map(v => replaceStrings(v, replacements)) as T;
    if (value && typeof value === 'object')
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, replaceStrings(v, replacements)])) as T;
    return value;
}
export function validateBundle(bundle: TransferBundle) {
    if (bundle.format !== 'tapconnect-experience-transfer@1' || !isTapConnectCardDraft(bundle.document?.draft))
        throw new Error('Invalid transfer document');
    const biz = bundle.sourceTenant.id, id = bundle.document.id;
    if (bundle.document.businessId !== biz || bundle.destination.businessId !== biz || bundle.destination.experienceId !== id)
        throw new Error('Cross-tenant source');
    for (const s of bundle.snapshots)
        if (s.businessId !== biz || s.subjectType !== 'experience' || s.subjectId !== id || s.tapPointId)
            throw new Error('Unrelated snapshot');
    for (const c of bundle.credentials)
        if (c.businessId !== biz || c.destinationId !== bundle.destination.id || !/^[a-f0-9]{64}$/.test(c.tokenHash))
            throw new Error('Unrelated credential');
    for (const m of bundle.media)
        if (m.businessId !== biz || m.campaignId)
            throw new Error('Unrelated media');
    const objectKeys = new Set<string>();
    for (const o of bundle.objects) {
        if (!o.sourceKey.startsWith(biz + '/') || o.sourceKey.split('/').some(p => !p || p === '.' || p === '..') || !/^[a-f0-9]{64}$/.test(o.sha256) || objectKeys.has(o.sourceKey))
            throw new Error('Invalid object manifest');
        objectKeys.add(o.sourceKey);
    }
    const mediaIds = new Set(bundle.media.map(m => m.id));
    if (mediaIds.size !== bundle.media.length)
        throw new Error('Duplicate media identity');
    for (const m of bundle.media) {
        if (!m.storageKey || !objectKeys.has(m.storageKey))
            throw new Error('Media bytes missing');
        if (m.parentAssetId && !mediaIds.has(m.parentAssetId))
            throw new Error('Media parent missing');
    }
    if (bundle.document.currentPublicationSnapshotId && !bundle.snapshots.some(s => s.id === bundle.document.currentPublicationSnapshotId))
        throw new Error('Current publication missing');
}
export function projectBundle(bundle: TransferBundle, targetBusinessId: string, origin: string) {
    validateBundle(bundle);
    const sourceId = bundle.sourceTenant.id;
    const base = new URL(origin === 'local-fixture' ? 'http://local' : origin);
    if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password || base.search || base.hash)
        throw new Error('Invalid media origin');
    if (!/^[a-zA-Z0-9_-]+$/.test(targetBusinessId))
        throw new Error('Invalid tenant identity');
    const keyMap = new Map(bundle.objects.map(o => [o.sourceKey, targetBusinessId + o.sourceKey.slice(sourceId.length)]));
    const urlFor = (key: string) => origin === 'local-fixture' ? '/api/media/local?key=' + encodeURIComponent(keyMap.get(key)!) : origin.replace(/\/$/, '') + '/' + keyMap.get(key);
    const replacements = new Map<string, string>();
    for (const o of bundle.objects)
        replacements.set('/api/media/local?key=' + encodeURIComponent(o.sourceKey), urlFor(o.sourceKey));
    for (const [inline, resource] of Object.entries(bundle.inlineReplacements))
        replacements.set(inline, urlFor(resource.sourceKey));
    // Resolve absolute local-media references as well as their relative form.
    function collect(v: unknown): void {
        if (typeof v === 'string') {
            try {
                const u = new URL(v, 'http://local');
                if (u.pathname === '/api/media/local') {
                    const key = u.searchParams.get('key');
                    if (keyMap.has(key || ''))
                        replacements.set(v, urlFor(key!));
                    else
                        throw new Error('Unmanifested media reference');
                }
            }
            catch (e) {
                if (e instanceof Error && e.message === 'Unmanifested media reference')
                    throw e;
            }
        }
        else if (Array.isArray(v))
            v.forEach(collect);
        else if (v && typeof v === 'object')
            Object.values(v).forEach(collect);
    }
    collect(bundle.document);
    collect(bundle.snapshots);
    collect(bundle.media);
    const document = replaceStrings(bundle.document, replacements);
    document.businessId = targetBusinessId;
    document.publicationActive = false;
    document.experienceStatus = 'DRAFT';
    document.publishedAt = null;
    if (inspectPreviewVisualResourcePortability(document.draft).length)
        throw new Error('Unportable visual reference remains');
    const snapshots = bundle.snapshots.map(s => {
        const projected = replaceStrings(s, replacements);
        projected.businessId = targetBusinessId;
        const manifest = projected.manifest as unknown as {
            kind: string;
            document: unknown;
            comparisonSummary?: unknown;
        };
        if (manifest.kind !== 'experience' || !isTapConnectCardDraft(manifest.document))
            throw new Error('Invalid snapshot');
        if (inspectPreviewVisualResourcePortability(manifest.document).length)
            throw new Error('Unportable snapshot');
        projected.contentHash = hashPublishManifest({ ...manifest, comparisonSummary: {} } as Parameters<typeof hashPublishManifest>[0]);
        return projected;
    });
    const media = bundle.media.map(m => ({ ...replaceStrings(m, replacements), businessId: targetBusinessId, storageKey: keyMap.get(m.storageKey!)!, approvedById: null }));
    const destination = { ...bundle.destination, businessId: targetBusinessId, accessActive: false };
    const credentials = bundle.credentials.map(c => ({ ...c, businessId: targetBusinessId }));
    return { document, snapshots, media, destination, credentials, objects: bundle.objects.map(o => ({ ...o, targetKey: keyMap.get(o.sourceKey)! })) };
}
export function jsonInput(value: unknown): Prisma.InputJsonValue { return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue; }
