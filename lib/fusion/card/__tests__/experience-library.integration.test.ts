import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  prepareIndependentExperienceDraft,
  publishExperience,
  setExperienceAccessActive,
  unpublishExperience,
} from "@/lib/fusion/card/experience-library";
import {
  redeemExperienceCredential,
  rotateExperienceCredential,
} from "@/lib/fusion/card/experience-access-credentials";
import {
  resolveEverEncoreDestination,
  resolvePublishedEverEncoreExperience,
} from "@/lib/fusion/card/public-experience-registry";

const isolatedDatabase = /tapconnect_fusion_dev/i.test(process.env.DATABASE_URL ?? "");

describe("Experience publication/access/QR lifecycle — isolated PostgreSQL", { skip: !isolatedDatabase }, () => {
  it("preserves destination, revision, draft, and original QR across dormancy and republish", async () => {
    const nonce = randomUUID().slice(0, 8);
    const business = await prisma.business.create({ data: { name: `Experience Acceptance ${nonce}`, slug: `experience-acceptance-${nonce}` } });
    const createdDocumentIds: string[] = [];
    try {
      const source = resolvePublishedEverEncoreExperience("love-and-theft")!.config;
      const document = await prisma.cardCreativeDocument.create({
        data: {
          businessId: business.id,
          name: "Demo A",
          clientName: `Acceptance ${nonce}`,
          documentType: "EXPERIENCE",
          experienceType: "DEMO",
          draft: prepareIndependentExperienceDraft(source, "Demo A") as unknown as Prisma.InputJsonValue,
        },
      });
      createdDocumentIds.push(document.id);
      const second = await prisma.cardCreativeDocument.create({
        data: {
          businessId: business.id,
          name: "Demo B",
          clientName: `Acceptance ${nonce}`,
          documentType: "EXPERIENCE",
          experienceType: "DEMO",
          draft: prepareIndependentExperienceDraft(source, "Demo B") as unknown as Prisma.InputJsonValue,
        },
      });
      createdDocumentIds.push(second.id);
      assert.notEqual(document.id, second.id);

      const firstPublish = await publishExperience({
        businessId: business.id,
        documentId: document.id,
        expectedDraftRevision: 1,
        signatureEntitlementKeys: [],
      });
      const stableSlug = firstPublish.publicSlug;
      const firstSnapshotId = firstPublish.snapshot.id;
      const firstQr = await rotateExperienceCredential({
        businessId: business.id,
        experienceId: document.id,
        credentialType: "PERMANENT",
        revokePrevious: false,
      });

      assert.equal((await resolveEverEncoreDestination(stableSlug)).state, "live");
      assert.equal((await redeemExperienceCredential(firstQr.token)).state, "valid");

      await setExperienceAccessActive(business.id, document.id, false);
      const dormant = await resolveEverEncoreDestination(stableSlug);
      assert.equal(dormant.state, "dormant");
      assert.equal(dormant.state === "dormant" ? dormant.reason : null, "access_inactive");
      assert.equal((await redeemExperienceCredential(firstQr.token)).state, "valid");
      assert.equal((await resolveEverEncoreDestination(stableSlug)).state, "dormant");
      const retained = await prisma.cardCreativeDocument.findUniqueOrThrow({ where: { id: document.id } });
      assert.equal(retained.currentPublicationSnapshotId, firstSnapshotId);
      assert.equal(retained.draftRevision, 1);

      await setExperienceAccessActive(business.id, document.id, true);
      assert.equal((await resolveEverEncoreDestination(stableSlug)).state, "live");
      assert.equal((await redeemExperienceCredential(firstQr.token)).state, "valid");

      await unpublishExperience(business.id, document.id);
      assert.equal((await resolveEverEncoreDestination(stableSlug)).state, "dormant");
      const republished = await publishExperience({
        businessId: business.id,
        documentId: document.id,
        expectedDraftRevision: 1,
        signatureEntitlementKeys: [],
      });
      assert.equal(republished.publicSlug, stableSlug);
      assert.equal(republished.snapshot.id, firstSnapshotId);
      assert.equal((await redeemExperienceCredential(firstQr.token)).state, "valid");

      const keptQr = await rotateExperienceCredential({
        businessId: business.id,
        experienceId: document.id,
        credentialType: "PERMANENT",
        revokePrevious: false,
      });
      assert.equal((await redeemExperienceCredential(firstQr.token)).state, "valid");
      assert.equal((await redeemExperienceCredential(keptQr.token)).state, "valid");

      const replacementQr = await rotateExperienceCredential({
        businessId: business.id,
        experienceId: document.id,
        credentialType: "PERMANENT",
        revokePrevious: true,
      });
      assert.equal((await redeemExperienceCredential(firstQr.token)).state, "revoked");
      assert.equal((await redeemExperienceCredential(keptQr.token)).state, "revoked");
      assert.equal((await redeemExperienceCredential(replacementQr.token)).state, "valid");
      const stored = await prisma.experienceAccessCredential.findUniqueOrThrow({ where: { id: replacementQr.credential.id } });
      assert.notEqual(stored.tokenHash, replacementQr.token);
      assert.equal(stored.destinationId, firstQr.destination.id);
    } finally {
      await prisma.publicationSnapshot.deleteMany({ where: { subjectType: "experience", subjectId: { in: createdDocumentIds } } });
      await prisma.business.delete({ where: { id: business.id } });
    }
  });
});
