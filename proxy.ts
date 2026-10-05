import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { AUTH_SIGN_IN_PATH, PUBLIC_ROUTE_PATTERNS } from "@/lib/auth-route-policy";
import { isLocalDevAuthEnabled } from "@/lib/config/local-dev";

const isPublicRoute = createRouteMatcher(PUBLIC_ROUTE_PATTERNS);

const localDevAuth = isLocalDevAuthEnabled();
const isClerkConfigured =
  !localDevAuth &&
  Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_SECRET_KEY
  );

export default isClerkConfigured
  ? clerkMiddleware(async (auth, request) => {
      if (!isPublicRoute(request)) {
        await auth.protect({
          unauthenticatedUrl: new URL(AUTH_SIGN_IN_PATH, request.url).toString(),
        });
      }
    })
  : function proxy() {
      return NextResponse.next();
    };

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
