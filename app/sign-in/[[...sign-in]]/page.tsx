import { redirect } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import { TapConnectLogo } from "@/components/brand/tap-connect-logo";
import { isClerkConfigured } from "@/lib/utils/app";

export default function SignInPage() {
  if (!isClerkConfigured()) {
    redirect("/auth/continue");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-10">
      <TapConnectLogo variant="full" priority imgClassName="h-28 w-auto sm:h-32" />
      <SignIn forceRedirectUrl="/auth/continue" signUpUrl="/sign-up" />
    </div>
  );
}
