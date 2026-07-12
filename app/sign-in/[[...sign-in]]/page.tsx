import { redirect } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/utils/app";

export default function SignInPage() {
  if (!isClerkConfigured()) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <SignIn
        forceRedirectUrl="/dashboard"
        signUpUrl="/sign-up"
      />
    </div>
  );
}
