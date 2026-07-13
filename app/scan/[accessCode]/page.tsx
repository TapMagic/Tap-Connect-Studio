import { StaffScanReady } from "@/components/scan/staff-scan-ready";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ accessCode: string }> };

export default async function StaffScanJoinPage({ params }: PageProps) {
  const { accessCode } = await params;
  return <StaffScanReady accessCode={accessCode} />;
}
