import { redirect } from "next/navigation";
import { resolvePostAuthRedirect } from "@/lib/auth";
import { ensurePlatformAdminUsers } from "@/lib/services/admins";

export const dynamic = "force-dynamic";

/** Single post-login router: Admins → /admin, members → /dashboard, new users → /onboarding */
export default async function AuthContinuePage() {
  await ensurePlatformAdminUsers();
  const path = await resolvePostAuthRedirect();
  redirect(path);
}
