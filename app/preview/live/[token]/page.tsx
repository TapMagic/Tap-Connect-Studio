import "@/app/t/tap.css";
import { LiveDevicePreviewPage } from "@/components/fusion/creative-studio/live-device-preview-page";
import { isLocalDevAuthEnabled } from "@/lib/config/local-dev";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PreviewLivePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ debug?: string | string[] }>;
}) {
  const { token } = await params;
  const { debug } = await searchParams;
  const debugEnabled = process.env.NODE_ENV !== "production" && isLocalDevAuthEnabled() && debug === "1";
  return <LiveDevicePreviewPage token={token} debug={debugEnabled} />;
}
