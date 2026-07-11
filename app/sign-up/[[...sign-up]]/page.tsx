import { redirect } from "next/navigation";
import { SignUp } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/utils/app";

export default function SignUpPage() {
  if (!isClerkConfigured()) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <SignUp />
    </div>
  );
}
