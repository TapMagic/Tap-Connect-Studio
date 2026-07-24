import { TapCastChannelNav } from "@/components/fusion/tapcast/tapcast-channel-nav";

export default function TapCastLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="tapcast-workspace">
      <TapCastChannelNav />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
