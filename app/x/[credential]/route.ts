import { NextResponse } from "next/server";
import { redeemExperienceCredential } from "@/lib/fusion/card/experience-access-credentials";
import { getRequestPublicOrigin } from "@/lib/utils/app";

export const runtime = "nodejs";

function unavailable(reason: string) {
  return new NextResponse(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Experience unavailable</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#070a10;color:#fff;font:16px system-ui"><main style="max-width:28rem;padding:2rem;text-align:center"><p style="color:#b8ff2c;font-size:.7rem;letter-spacing:.16em;text-transform:uppercase">Tap Connect</p><h1>Credential unavailable</h1><p style="color:#ffffff99;line-height:1.6">This QR credential is ${reason}. The Experience itself has not been exposed.</p></main></body></html>`, {
    status: 410,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ credential: string }> }) {
  const { credential } = await params;
  const result = await redeemExperienceCredential(credential).catch(() => ({ state: "invalid" as const }));
  if (result.state !== "valid") return unavailable(result.state);
  return NextResponse.redirect(new URL(`/everencore/${result.slug}`, getRequestPublicOrigin(request)), 307);
}
