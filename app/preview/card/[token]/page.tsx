import "@/app/t/tap.css";
import { LiveDevicePreviewPage } from "@/components/fusion/creative-studio/live-device-preview-page";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function LegacyPreviewCardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <LiveDevicePreviewPage
      token={token}
      pageTestId="preview-card-page"
      errorTestId="preview-card-error"
    />
  );
}
