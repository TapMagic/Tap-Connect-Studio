import { redirect } from "next/navigation";
import { SignUp } from "@clerk/nextjs";
import { TapConnectLogo } from "@/components/brand/tap-connect-logo";
import { isClerkConfigured } from "@/lib/utils/app";

export default function SignUpPage() {
  if (!isClerkConfigured()) {
    redirect("/auth/continue");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-10">
      <TapConnectLogo variant="full" priority imgClassName="h-28 w-auto sm:h-32" />
      <SignUp forceRedirectUrl="/auth/continue" signInUrl="/sign-in" />
    </div>
  );
}
