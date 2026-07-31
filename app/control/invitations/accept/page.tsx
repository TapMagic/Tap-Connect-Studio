import { InvitationAcceptance } from "./invitation-acceptance";
import "../../control-room.css";

export const dynamic = "force-dynamic";

export default async function InvitationAcceptancePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  return <InvitationAcceptance token={token} />;
}
