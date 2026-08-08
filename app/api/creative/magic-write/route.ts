import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { runMagicWrite } from "@/lib/services/magic-write";

const schema = z.object({
  operation: z.enum([
    "rewrite",
    "shorten",
    "expand",
    "improve_clarity",
    "change_tone",
    "fix_grammar",
  ]),
  tone: z.string().trim().max(80).optional(),
  coordinated: z.boolean().optional(),
  targets: z
    .array(
      z.object({
        id: z.string().min(1).max(120),
        text: z.string().max(4000),
        role: z.string().max(80).optional().nullable(),
      })
    )
    .min(1)
    .max(12),
});

export async function POST(request: Request) {
  try {
    await requireBusiness();
    const body = schema.parse(await request.json());
    const result = await runMagicWrite(body);
    if (!result.ok) {
      const status =
        result.code === "not_configured"
          ? 503
          : result.code === "empty" || result.code === "invalid"
            ? 400
            : 502;
      return NextResponse.json(
        {
          ok: false,
          code: result.code,
          message: result.message,
        },
        { status }
      );
    }
    return NextResponse.json({
      ok: true,
      mode: result.mode,
      proposals: result.proposals,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, code: "invalid", message: "Invalid Magic Write request." },
        { status: 400 }
      );
    }
    console.error("Magic Write error:", error);
    return NextResponse.json(
      { ok: false, code: "provider_error", message: "Magic Write request failed." },
      { status: 500 }
    );
  }
}
