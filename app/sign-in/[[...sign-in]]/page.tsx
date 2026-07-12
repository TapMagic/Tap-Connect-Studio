import { redirect } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/utils/app";

export default function SignInPage() {
  if (!isClerkConfigured()) {
    redirect("/auth/continue");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <SignIn
        forceRedirectUrl="/auth/continue"
        signUpUrl="/sign-up"
      />
    </div>
  );
}
