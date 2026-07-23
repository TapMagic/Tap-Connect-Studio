import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { decideProposal, getProposal, listProposals } from "@/lib/fusion/autopilot/proposals";

const decideSchema = z.object({
  proposalId: z.string().min(1),
  decision: z.enum(["accept", "reject", "undo"]),
  artifactKinds: z.array(z.string()).optional(),
});

export async function GET() {
  try {
    const { business } = await requireBusiness();
    const proposals = (await listProposals(business.id)).map((p) => ({
      id: p.id,
      status: p.status,
      summary: p.summary,
      recipeId: p.recipeId,
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

export async function POST(request: Request) {
  try {
    const { user, business } = await requireBusiness();
    const body = decideSchema.parse(await request.json());
    const existing = await getProposal(body.proposalId, business.id);
    if (!existing) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const action =
      body.decision === "undo"
        ? ({ type: "undo" } as const)
        : body.decision === "reject"
          ? ({ type: "reject" } as const)
          : body.artifactKinds?.length
            ? ({ type: "partial", artifactKinds: body.artifactKinds } as const)
            : ({ type: "accept" } as const);

    const result = await decideProposal({
      proposalId: body.proposalId,
      businessId: business.id,
      action,
      actorId: user.id,
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
        summary: result.proposal.summary,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
    }
    console.error("Proposal decision error:", error);
    return NextResponse.json({ error: "Failed to update proposal" }, { status: 500 });
  }
}
