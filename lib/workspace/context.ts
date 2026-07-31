import type { Business, BusinessUser, User } from "@prisma/client";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export const WORKSPACE_COOKIE = "tapconnect_workspace_id";
export const CONTROL_RETURN_COOKIE = "tapconnect_control_return";

export type WorkspaceMode = {
  kind: "self" | "view-as" | "support";
  label: string;
  detail: string;
  readOnly: boolean;
};

export type WorkspaceMenuItem = {
  id: string;
  name: string;
  kind: string;
  role: string;
  source: "membership" | "support";
};

export type WorkspaceMenuModel = {
  actor: {
    id: string;
    name: string;
    email: string;
    imageUrl: string | null;
    localFixture: boolean;
  };
  currentWorkspaceId: string | null;
  currentWorkspaceName: string | null;
  mode: WorkspaceMode;
  groups: { id: string; label: string; items: WorkspaceMenuItem[] }[];
  returnToControlRoom: string;
};

type WorkspaceUser = User & {
  memberships: (BusinessUser & { business: Business })[];
};

function displayName(user: Pick<User, "displayName" | "firstName" | "lastName" | "email">) {
  return (
    user.displayName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email
  );
}

export function safeControlReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/control") || value.startsWith("//")) {
    return "/control";
  }
  return value;
}

export async function resolveWorkspaceMode(actorId: string): Promise<{
  mode: WorkspaceMode;
  supportBusinessId: string | null;
}> {
  const cookieStore = await cookies();
  const viewAsId = cookieStore.get("tapconnect_view_as")?.value;
  if (viewAsId) {
    const subject = await prisma.user.findUnique({
      where: { id: viewAsId },
      select: { displayName: true, firstName: true, lastName: true, email: true },
    });
    if (subject) {
      return {
        mode: {
          kind: "view-as",
          label: `Viewing as ${displayName(subject)}`,
          detail: "Read-only access diagnosis in Control Room",
          readOnly: true,
        },
        supportBusinessId: null,
      };
    }
  }

  const supportId = cookieStore.get("tapconnect_support_session")?.value;
  if (supportId) {
    const session = await prisma.supportSession.findFirst({
      where: {
        id: supportId,
        actorUserId: actorId,
        status: "ACTIVE",
        expiresAt: { gt: new Date() },
      },
      include: {
        subject: {
          select: { displayName: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    if (session) {
      return {
        mode: {
          kind: "support",
          label: `Supporting ${displayName(session.subject)}`,
          detail: session.businessId
            ? "Time-limited, workspace-scoped support access"
            : "Time-limited platform support access",
          readOnly: false,
        },
        supportBusinessId: session.businessId,
      };
    }
  }

  return {
    mode: {
      kind: "self",
      label: "Operating as myself",
      detail: "Using my own workspace memberships",
      readOnly: false,
    },
    supportBusinessId: null,
  };
}

export async function buildWorkspaceMenuModel(
  user: WorkspaceUser,
  currentBusiness: Business | null,
): Promise<WorkspaceMenuModel> {
  const cookieStore = await cookies();
  const { mode, supportBusinessId } = await resolveWorkspaceMode(user.id);
  const own: WorkspaceMenuItem[] = user.memberships.map((membership) => ({
    id: membership.business.id,
    name: membership.business.name,
    kind: membership.business.workspaceKind,
    role: membership.role,
    source: "membership",
  }));
  const items: WorkspaceMenuItem[] = [...own];

  if (supportBusinessId && !items.some((item) => item.id === supportBusinessId)) {
    const supportBusiness = await prisma.business.findUnique({
      where: { id: supportBusinessId },
    });
    if (supportBusiness) {
      items.push({
        id: supportBusiness.id,
        name: supportBusiness.name,
        kind: supportBusiness.workspaceKind,
        role: "SUPPORT",
        source: "support",
      });
    }
  }

  const group = (id: string, label: string, kinds: string[]) => ({
    id,
    label,
    items: items
      .filter((item) => kinds.includes(item.kind))
      .sort((a, b) => a.name.localeCompare(b.name)),
  });
  const groups = [
    group("internal", "Internal businesses", ["INTERNAL"]),
    group("businesses", "My businesses", ["CUSTOMER", "PARTNER"]),
    group("sandboxes", "Personal sandboxes", ["PERSONAL_SANDBOX", "TEST_FIXTURE"]),
    group("demos", "Demo workspaces", ["DEMO"]),
    {
      id: "support",
      label: "Support access",
      items: items.filter((item) => item.source === "support"),
    },
  ].filter((entry) => entry.items.length > 0);

  return {
    actor: {
      id: user.id,
      name: displayName(user),
      email: user.email,
      imageUrl: user.imageUrl,
      localFixture: user.clerkId?.startsWith("local:") ?? false,
    },
    currentWorkspaceId: currentBusiness?.id ?? null,
    currentWorkspaceName: currentBusiness?.name ?? null,
    mode,
    groups,
    returnToControlRoom: safeControlReturnPath(
      cookieStore.get(CONTROL_RETURN_COOKIE)?.value,
    ),
  };
}
