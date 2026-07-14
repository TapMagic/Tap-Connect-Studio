import Link from "next/link";
import { TapConnectLogo } from "@/components/brand/tap-connect-logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingForm } from "@/components/onboarding/form";
import { getSessionUser, isPlatformAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  if (isPlatformAdmin(user)) {
    redirect("/admin");
  }

  if (user.memberships.length > 0) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <div className="mb-6 flex justify-center">
        <TapConnectLogo variant="full" priority imgClassName="h-24 w-auto" />
      </div>
      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle className="text-2xl">Set up your business</CardTitle>
          <CardDescription>
            Create your Tap Connect Studio account. You can customize branding, campaigns, and
            devices after setup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm />
        </CardContent>
      </Card>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/dashboard" className="text-primary hover:underline">
          Go to dashboard
        </Link>
      </p>
    </div>
  );
}
