import test from 'node:test';
import assert from 'node:assert/strict';
import { createBlankExperienceDocument } from '../experience-pages';
import { hashExperienceCredential, experienceCredentialAccessPath } from '../experience-access-credentials';
import { projectBundle, validateBundle, replaceStrings, type TransferBundle } from '../../../../scripts/experience-transfer/core';

function fixture():TransferBundle {
  const draft=createBlankExperienceDocument('Transfer fixture');
  draft.headerLogoUrl='/api/media/local?key=source%2Fuploads%2Flogo.png';
  const b={format:'tapconnect-experience-transfer@1',sourceCommit:'test',createdAt:'2026-01-01',sourceTenant:{id:'source',name:'Source',logoUrl:null},document:{id:'document',businessId:'source',draft,publicationActive:true,experienceStatus:'PUBLISHED',publishedAt:'2026-01-01',draftRevision:42,currentPublicationSnapshotId:'snapshot'},destination:{id:'destination',businessId:'source',experienceId:'document',slug:'stable',accessActive:true},snapshots:[{id:'snapshot',businessId:'source',subjectType:'experience',subjectId:'document',tapPointId:null,manifest:{kind:'experience',document:draft,comparisonSummary:{}},contentHash:'old'}],credentials:[{id:'credential',businessId:'source',destinationId:'destination',tokenHash:hashExperienceCredential('secret'),status:'ACTIVE'}],media:[{id:'asset',businessId:'source',campaignId:null,storageKey:'source/uploads/logo.png',url:draft.headerLogoUrl,sourceUrl:draft.headerLogoUrl,parentAssetId:null}],objects:[{sourceKey:'source/uploads/logo.png',sha256:'a'.repeat(64),size:8,mimeType:'image/png'}],inlineReplacements:{}};
  return b as unknown as TransferBundle;
}
test('rebinds only media/tenant projection and imports privately without rotating credentials',()=>{
  const b=fixture(),original=JSON.stringify(b),before=experienceCredentialAccessPath(b.credentials[0]);
  const p=projectBundle(b,'target','https://media.example.test');
  assert.equal(JSON.stringify(b),original);
  assert.equal((p.document.draft as {headerLogoUrl:string}).headerLogoUrl,'https://media.example.test/target/uploads/logo.png');
  assert.equal(p.document.id,b.document.id);assert.equal(p.document.draftRevision,42);
  assert.equal(p.document.publicationActive,false);assert.equal(p.destination.accessActive,false);
  assert.equal(experienceCredentialAccessPath(p.credentials[0]),before);
  assert.deepEqual((p.document.draft as {experience:unknown}).experience,(b.document.draft as {experience:unknown}).experience);
  assert.notEqual(p.snapshots[0].contentHash,'old');
});
test('rejects cross-tenant records, path traversal, missing bytes and unportable resources',()=>{
  for(const mutate of [(b:TransferBundle)=>{b.media[0].businessId='other'},(b:TransferBundle)=>{b.objects[0].sourceKey='source/../escape'},(b:TransferBundle)=>{b.objects=[]},(b:TransferBundle)=>{b.credentials[0].destinationId='other'}]){const b=fixture();mutate(b);assert.throws(()=>validateBundle(b));}
  const b=fixture();(b.document.draft as {headerLogoUrl:string}).headerLogoUrl='file:///private/logo.png';assert.throws(()=>projectBundle(b,'target','https://media.example.test'),/Unportable/);
});
test('normalizes only the exact exported SVG reference, never arbitrary action destinations',()=>{
  const source={headerLogoUrl:'inline-seeded-svg',href:'https://example.com/listen',actionId:'same'};
  assert.deepEqual(replaceStrings(source,new Map([['inline-seeded-svg','https://media.example.test/asset.svg']])),{headerLogoUrl:'https://media.example.test/asset.svg',href:'https://example.com/listen',actionId:'same'});
});

test('existing-workspace approval binds exact owner, membership and unchanged customer data', async () => {
  const { validateExistingApproval, fingerprint } = await import('../../../../scripts/experience-transfer/existing-workspace');
  const approved = { format: 'tapconnect-existing-workspace@1' as const, tenant: 'approved', actor: 'owner', membersHash: fingerprint(['owner']), baselineHash: fingerprint({ id: 'existing', draft: 'unchanged' }) };
  assert.doesNotThrow(() => validateExistingApproval(approved, { ...approved }));
  for (const change of [{ tenant: 'other' }, { actor: 'other' }, { membersHash: fingerprint(['owner', 'new-member']) }, { baselineHash: fingerprint({ id: 'existing', draft: 'changed' }) }]) {
    assert.throws(() => validateExistingApproval(approved, { ...approved, ...change }), /mismatch|changed/);
  }
  assert.equal(fingerprint({ a: 1, b: { c: 2 } }), fingerprint({ b: { c: 2 }, a: 1 }));
});
