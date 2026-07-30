export type PostAuthDestinationInput = {
  isPlatformAdmin: boolean;
  hasBusiness: boolean;
  cardFirstOnboardingCompleted: boolean;
};

/**
 * Shared acquisition continuation contract.
 * The caller remains responsible for establishing the session and admin workspace.
 */
export function postAuthDestination({
  isPlatformAdmin,
  hasBusiness,
  cardFirstOnboardingCompleted,
}: PostAuthDestinationInput): "/admin" | "/onboarding" | "/dashboard" {
  if (isPlatformAdmin) return "/admin";
  if (!hasBusiness || !cardFirstOnboardingCompleted) return "/onboarding";
  return "/dashboard";
}

