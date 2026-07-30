import assert from "node:assert/strict";
import test from "node:test";
import { postAuthDestination } from "../post-auth-destination";

test("signed-in owner without a business starts onboarding", () => {
  assert.equal(
    postAuthDestination({
      isPlatformAdmin: false,
      hasBusiness: false,
      cardFirstOnboardingCompleted: false,
    }),
    "/onboarding"
  );
});

test("signed-in owner with incomplete Card-first onboarding resumes onboarding", () => {
  assert.equal(
    postAuthDestination({
      isPlatformAdmin: false,
      hasBusiness: true,
      cardFirstOnboardingCompleted: false,
    }),
    "/onboarding"
  );
});

test("signed-in owner with completed Card-first onboarding continues to Studio", () => {
  assert.equal(
    postAuthDestination({
      isPlatformAdmin: false,
      hasBusiness: true,
      cardFirstOnboardingCompleted: true,
    }),
    "/dashboard"
  );
});

test("platform admin continues to the separate admin workspace", () => {
  assert.equal(
    postAuthDestination({
      isPlatformAdmin: true,
      hasBusiness: false,
      cardFirstOnboardingCompleted: false,
    }),
    "/admin"
  );
});

