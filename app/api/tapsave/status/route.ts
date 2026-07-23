import { NextResponse } from "next/server";
import { getTapSaveStatus } from "@/lib/fusion/tapsave";
import { isFeatureEnabled } from "@/lib/fusion/features/resolve";
import { listFeatureOverrides, toResolveOverrides } from "@/lib/fusion/features/overrides";

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "token required" }, { status: 400 });
    }

    const overrides = toResolveOverrides(await listFeatureOverrides());
    if (!isFeatureEnabled("tapsave.core", { overrides })) {
      return NextResponse.json(
        {
          placeholder: true,
          feature: "tapsave.core",
          message: "TapSave is not enabled.",
        },
        { status: 503 }
      );
    }

    const status = await getTapSaveStatus(token);
    if (!status) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, status });
  } catch (error) {
    console.error("TapSave status error:", error);
    return NextResponse.json({ error: "Failed to load status" }, { status: 500 });
  }
}
