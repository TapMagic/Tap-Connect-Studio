import { cookies } from "next/headers";
import { Suspense } from "react";
import { ControlRoom } from "@/components/control/control-room";
import { requireControlActor } from "@/lib/control/identity";
import { getControlSnapshot } from "@/lib/control/snapshot";
import { prisma } from "@/lib/db";
import "./control-room.css";
import { buildWorkspaceMenuModel, WORKSPACE_COOKIE } from "@/lib/workspace/context";

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
  searchParams: Promise<{ section?: string; demoId?: string; workspaceId?: string; tab?: string; task?: string }>;
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
  const workspaceUser = await prisma.user.findUniqueOrThrow({
    where: { id: actor.id },
    include: { memberships: { include: { business: true } } },
  });
  const selectedWorkspaceId = cookieStore.get(WORKSPACE_COOKIE)?.value;
  const selectedWorkspace =
    workspaceUser.memberships.find(
      (membership) => membership.businessId === selectedWorkspaceId,
    )?.business ?? workspaceUser.memberships[0]?.business ?? null;
  const [viewAsUser, supportSession, workspaceMenu] = await Promise.all([
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
    buildWorkspaceMenuModel(workspaceUser, selectedWorkspace),
  ]);

  return (
    <Suspense fallback={<div className="control-loading">Opening Control Room…</div>}>
      <ControlRoom
        snapshot={snapshot}
        initialSection={initialSection}
        initialDemoId={params.demoId ?? null}
        initialWorkspaceId={params.workspaceId ?? null}
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
        workspaceMenu={workspaceMenu}
      />
    </Suspense>
  );
}
