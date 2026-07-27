import { NextResponse } from "next/server";
import { confirmDestinationVerification } from "@/lib/fusion/email-replies/service";
import { requireEmailRepliesStore } from "@/lib/fusion/email-replies/store-resolve";

/**
 * Public verification link/code confirmation.
 * Destination id + token required — no destination enumeration.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const destinationId = url.searchParams.get("destinationId") ?? "";
  if (!token || !destinationId) {
    return NextResponse.json(
      { ok: false, error: "Invalid verification link" },
      { status: 400 }
    );
  }
  try {
    const store = await requireEmailRepliesStore();
    const dest = await store.getDestination(destinationId);
    if (!dest) {
      return NextResponse.json(
        { ok: false, error: "Invalid verification link" },
        { status: 400 }
      );
    }
    const result = await confirmDestinationVerification({
      businessId: dest.businessId,
      destinationId,
      token,
      store,
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: "Verification failed or expired" },
        { status: 400 }
      );
    }
    return NextResponse.json({
      ok: true,
      message: "Destination verified. You can return to Email & Replies setup.",
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Verification temporarily unavailable" },
      { status: 503 }
    );
  }
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    token?: string;
    destinationId?: string;
    businessId?: string;
  };
  if (!body.token || !body.destinationId || !body.businessId) {
    return NextResponse.json(
      { ok: false, error: "Missing fields" },
      { status: 400 }
    );
  }
  const result = await confirmDestinationVerification({
    businessId: body.businessId,
    destinationId: body.destinationId,
    token: body.token,
  });
  return NextResponse.json(
    result.ok
      ? { ok: true }
      : { ok: false, error: "Verification failed or expired" },
    { status: result.ok ? 200 : 400 }
  );
}
