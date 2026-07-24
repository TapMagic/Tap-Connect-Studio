import { NextResponse } from "next/server";
import { z } from "zod";
import { listFeatureOverrides, toResolveOverrides } from "@/lib/fusion/features/overrides";
import {
  evaluateTapSaveWalletGate,
  getWalletPassForMyTap,
  issueMockWalletFromTapSave,
} from "@/lib/fusion/wallet/tapsave-wire";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  publicToken: z.string().min(1),
  platform: z.enum(["apple", "google"]).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const publicToken = url.searchParams.get("publicToken")?.trim();
  if (!publicToken) {
    return NextResponse.json({ error: "publicToken required" }, { status: 400 });
  }

  const overrides = toResolveOverrides(await listFeatureOverrides());
  const gate = await evaluateTapSaveWalletGate({ publicToken, overrides });
  if (!gate.ok) {
    const status = gate.code === "not_found" ? 404 : gate.code === "inactive" ? 410 : 503;
    return NextResponse.json({ ok: false, code: gate.code, error: gate.message }, { status });
  }

  const wallet = await getWalletPassForMyTap(publicToken);
  return NextResponse.json({
    ok: true,
    gate,
    wallet,
  });
}

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const overrides = toResolveOverrides(await listFeatureOverrides());
    const result = await issueMockWalletFromTapSave({
      publicToken: body.publicToken,
      platform: body.platform,
      overrides,
    });

    if (!result.ok) {
      const status =
        result.code === "not_found"
          ? 404
          : result.code === "inactive"
            ? 410
            : result.code === "tapsave_off" || result.code === "wallet_off"
              ? 503
              : 400;
      return NextResponse.json(
        {
          ok: false,
          code: result.code,
          error: result.message,
          ...(result.code === "wallet_off"
            ? { feature: "wallet.apple_google", liveStatus: "verified_credentials_required" }
            : {}),
        },
        { status }
      );
    }

    return NextResponse.json({
      ok: true,
      pass: result.pass,
      mock: result.mock,
      previewUrl: result.previewUrl,
      installUrl: result.installUrl,
      alreadyIssued: result.alreadyIssued,
      moment: result.moment,
      liveStatus: result.mock ? "modeled_mock_adapter" : "confirmed",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid wallet payload" }, { status: 400 });
    }
    console.error("MyTap wallet error:", error);
    return NextResponse.json({ error: "Failed to issue mock wallet pass" }, { status: 500 });
  }
}
