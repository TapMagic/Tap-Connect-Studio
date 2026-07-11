import { NextResponse } from "next/server";
import { integrations, nativeFeatures, getConfiguredCount } from "@/lib/config/integrations";

export async function GET() {
  return NextResponse.json({
    configured: getConfiguredCount(),
    total: integrations.length,
    integrations: integrations.map((i) => ({
      id: i.id,
      name: i.name,
      configured: i.configured,
      description: i.description,
      envVars: i.envVars,
      signupUrl: i.signupUrl,
      costNote: i.costNote,
    })),
    nativeFeatures,
  });
}
