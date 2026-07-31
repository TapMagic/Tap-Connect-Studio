import { cookies } from "next/headers";
import { Suspense } from "react";
import { ControlRoom } from "@/components/control/control-room";
import { requireControlActor } from "@/lib/control/identity";
import { getControlSnapshot } from "@/lib/control/snapshot";
import { prisma } from "@/lib/db";
import "./control-room.css";

export const dynamic = "force-dynamic";

const SECTIONS = new Set([
  "overview",
  "users",
  "businesses",
  "roles",
  "entitlements",
  "support",
  "demo",
  "audit",
  "configuration",
]);

export default async function ControlRoomPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const actor = await requireControlActor();
  const [snapshot, params, cookieStore] = await Promise.all([
    getControlSnapshot(actor),
    searchParams,
    cookies(),
  ]);
  const requestedSection = params.section ?? "overview";
  const initialSection = SECTIONS.has(requestedSection) ? requestedSection : "overview";
  const viewAsUserId = cookieStore.get("tapconnect_view_as")?.value;
  const supportSessionId = cookieStore.get("tapconnect_support_session")?.value;
  const [viewAsUser, supportSession] = await Promise.all([
    viewAsUserId
      ? prisma.user.findUnique({
          where: { id: viewAsUserId },
          select: { id: true, displayName: true, email: true },
        })
      : null,
    supportSessionId
      ? prisma.supportSession.findUnique({
          where: { id: supportSessionId },
          include: {
            actor: { select: { displayName: true, email: true } },
            subject: { select: { displayName: true, email: true } },
          },
        })
      : null,
  ]);

  return (
    <Suspense fallback={<div className="control-loading">Opening Control Room…</div>}>
      <ControlRoom
        snapshot={snapshot}
        initialSection={initialSection}
        viewAsUser={
          viewAsUser
            ? {
                id: viewAsUser.id,
                name: viewAsUser.displayName ?? viewAsUser.email,
              }
            : null
        }
        supportSession={
          supportSession
            ? {
                id: supportSession.id,
                actorName:
                  supportSession.actor.displayName ?? supportSession.actor.email,
                subjectName:
                  supportSession.subject.displayName ?? supportSession.subject.email,
                status: supportSession.status,
                expiresAt: supportSession.expiresAt.toISOString(),
              }
            : null
        }
      />
    </Suspense>
  );
}

