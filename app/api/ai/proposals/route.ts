import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import {
  applyProposal,
  decideProposal,
  getProposal,
  getProposalGovernanceTrail,
  listProposals,
} from "@/lib/fusion/autopilot/proposals";
import { compareProposals } from "@/lib/fusion/autopilot/compare";

const decideSchema = z.object({
  proposalId: z.string().min(1),
  decision: z.enum(["accept", "reject", "undo", "apply"]).optional(),
  action: z.enum(["accept", "reject", "undo", "partial", "apply"]).optional(),
  artifactKinds: z.array(z.string()).optional(),
  compareWithId: z.string().optional(),
});

function resolveAction(body: z.infer<typeof decideSchema>) {
  const verb = body.action ?? body.decision;
  if (verb === "undo") return { type: "undo" } as const;
  if (verb === "reject") return { type: "reject" } as const;
  if (verb === "apply") return { type: "apply" } as const;
  if (verb === "partial" || body.artifactKinds?.length) {
    return { type: "partial", artifactKinds: body.artifactKinds ?? [] } as const;
  }
  return { type: "accept" } as const;
}

export async function GET(request: Request) {
  try {
    const { business } = await requireBusiness();
    const url = new URL(request.url);
    const proposalId = url.searchParams.get("proposalId");
    const includeTrail = url.searchParams.get("trail") === "1";
    const compareWithId = url.searchParams.get("compareWithId");

    if (proposalId) {
      const proposal = await getProposal(proposalId, business.id);
      if (!proposal) {
        return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
      }
      const payload: Record<string, unknown> = {
        ok: true,
        proposal: {
          id: proposal.id,
          status: proposal.status,
          summary: proposal.summary,
          recipeId: proposal.recipeId,
          recipeVersion: proposal.recipeVersion,
          revision: proposal.revision,
          mode: proposal.mode,
          appliedAt: proposal.appliedAt,
          createdAt: proposal.createdAt,
          warnings: proposal.warnings,
          artifacts: proposal.artifacts.map((a) => ({ kind: a.kind, label: a.label })),
        },
      };
      if (includeTrail) {
        payload.governanceTrail = getProposalGovernanceTrail(proposalId);
      }
      if (compareWithId) {
        const other = await getProposal(compareWithId, business.id);
        if (other) {
          payload.compare = compareProposals(
            {
              id: proposal.id,
              recipeId: proposal.recipeId,
              recipeVersion: proposal.recipeVersion,
              revision: proposal.revision,
              summary: proposal.summary,
              status: proposal.status,
              artifacts: proposal.artifacts.map((a) => ({ kind: a.kind, label: a.label })),
            },
            {
              id: other.id,
              recipeId: other.recipeId,
              recipeVersion: other.recipeVersion,
              revision: other.revision,
              summary: other.summary,
              status: other.status,
              artifacts: other.artifacts.map((a) => ({ kind: a.kind, label: a.label })),
            }
          );
        }
      }
      return NextResponse.json(payload);
    }

    const proposals = (await listProposals(business.id)).map((p) => ({
      id: p.id,
      status: p.status,
      summary: p.summary,
      recipeId: p.recipeId,
      recipeVersion: p.recipeVersion,
      revision: p.revision,
      appliedAt: p.appliedAt,
      mode: p.mode,
      createdAt: p.createdAt,
      warnings: p.warnings,
    }));
    return NextResponse.json({ ok: true, proposals });
  } catch (error) {
    console.error("List proposals error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

async function handleDecision(body: z.infer<typeof decideSchema>, businessId: string, actorId: string) {
  const existing = await getProposal(body.proposalId, businessId);
  if (!existing) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const action = resolveAction(body);

  if (action.type === "apply") {
    const applied = await applyProposal({
      proposalId: body.proposalId,
      businessId,
      actorId,
    });
    if (!applied.ok) {
      return NextResponse.json(
        { error: applied.message, code: applied.code },
        { status: applied.code === "not_found" ? 404 : 409 }
      );
    }
    return NextResponse.json({
      ok: true,
      proposal: {
        id: applied.proposal.id,
        status: applied.proposal.status,
        appliedAt: applied.proposal.appliedAt,
        summary: applied.proposal.summary,
      },
      governanceTrail: getProposalGovernanceTrail(body.proposalId),
    });
  }

  const result = await decideProposal({
    proposalId: body.proposalId,
    businessId,
    action,
    actorId,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.message, code: result.code },
      { status: result.code === "not_found" ? 404 : 409 }
    );
  }

  return NextResponse.json({
    ok: true,
    proposal: {
      id: result.proposal.id,
      status: result.proposal.status,
      appliedAt: result.proposal.appliedAt,
      summary: result.proposal.summary,
    },
    governanceTrail: getProposalGovernanceTrail(body.proposalId),
  });
}

export async function POST(request: Request) {
  try {
    const { user, business } = await requireBusiness();
    const body = decideSchema.parse(await request.json());
    return handleDecision(body, business.id, user.id);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
    }
    console.error("Proposal decision error:", error);
    return NextResponse.json({ error: "Failed to update proposal" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { user, business } = await requireBusiness();
    const body = decideSchema.parse(await request.json());
    return handleDecision(body, business.id, user.id);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
    }
    console.error("Proposal patch error:", error);
    return NextResponse.json({ error: "Failed to update proposal" }, { status: 500 });
  }
}
