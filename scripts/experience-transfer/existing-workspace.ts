import type { Prisma } from '@prisma/client';
import { digest, type TransferBundle } from './core';

function canonical(value: unknown): unknown {
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
    return value;
}
export const fingerprint = (value: unknown) => digest(JSON.stringify(canonical(value)));
export type ExistingWorkspaceApproval = {
    format: 'tapconnect-existing-workspace@1';
    tenant: string;
    actor: string;
    membersHash: string;
    baselineHash: string;
};
export function validateExistingApproval(approval: ExistingWorkspaceApproval, current: ExistingWorkspaceApproval) {
    if (approval.format !== 'tapconnect-existing-workspace@1' || approval.tenant !== current.tenant || approval.actor !== current.actor) throw new Error('Existing workspace approval target/owner mismatch');
    if (approval.membersHash !== current.membersHash) throw new Error('Workspace membership changed; re-review access before import');
    if (approval.baselineHash !== current.baselineHash) throw new Error('Existing workspace data changed; re-review baseline before import');
}
export async function existingWorkspaceEvidence(tx: Prisma.TransactionClient, tenant: string, actor: string, exclude?: TransferBundle): Promise<ExistingWorkspaceApproval> {
    const members = await tx.businessUser.findMany({ where: { businessId: tenant }, orderBy: { id: 'asc' }, select: { id: true, userId: true, role: true, user: { select: { clerkId: true, platformStatus: true } } } });
    if (members.length !== 1 || members[0].userId !== actor || members[0].role !== 'OWNER' || members[0].user.platformStatus !== 'ACTIVE' || !members[0].user.clerkId) throw new Error('Existing workspace requires the sole active Clerk-linked OWNER; additional members require separate access review');
    const rows = {
        business: await tx.business.findUniqueOrThrow({ where: { id: tenant } }),
        documents: await tx.cardCreativeDocument.findMany({ where: { businessId: tenant, ...(exclude ? { id: { not: exclude.document.id } } : {}) }, orderBy: { id: 'asc' } }),
        media: await tx.mediaAsset.findMany({ where: { businessId: tenant, ...(exclude ? { id: { notIn: exclude.media.map(x => x.id) } } : {}) }, orderBy: { id: 'asc' } }),
        destinations: await tx.experiencePublicDestination.findMany({ where: { businessId: tenant, ...(exclude ? { id: { not: exclude.destination.id } } : {}) }, orderBy: { id: 'asc' } }),
        credentials: await tx.experienceAccessCredential.findMany({ where: { businessId: tenant, ...(exclude ? { id: { notIn: exclude.credentials.map(x => x.id) } } : {}) }, orderBy: { id: 'asc' } }),
        snapshots: await tx.publicationSnapshot.findMany({ where: { businessId: tenant, ...(exclude ? { id: { notIn: exclude.snapshots.map(x => x.id) } } : {}) }, orderBy: { id: 'asc' } }),
    };
    return { format: 'tapconnect-existing-workspace@1', tenant, actor, membersHash: fingerprint(members), baselineHash: fingerprint(rows) };
}
