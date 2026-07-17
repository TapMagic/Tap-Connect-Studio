import { NextResponse } from "next/server";
import { getPublicLandingDemos } from "@/lib/services/landing-demos";

export const dynamic = "force-dynamic";

/** Public: all Live Demo modes for the marketing landing page. */
export async function GET() {
  try {
    const data = await getPublicLandingDemos();
    return NextResponse.json(data);
  } catch (error) {
    console.error("landing-demo get", error);
    return NextResponse.json({ published: false, modes: [], fallback: true });
  }
}
