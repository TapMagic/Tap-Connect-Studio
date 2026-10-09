import { prisma } from "@/lib/db";
import { ensureLoveAndTheftExperienceRegistration } from "@/lib/fusion/card/public-experience-registry";

async function main() {
  const businessSlug = process.env.EXPERIENCE_REGISTRATION_BUSINESS_SLUG?.trim();
  if (!businessSlug) throw new Error("EXPERIENCE_REGISTRATION_BUSINESS_SLUG is required.");
  const business = await prisma.business.findUnique({ where: { slug: businessSlug }, select: { id: true } });
  if (!business) throw new Error("Registration business was not found.");
  const document = await ensureLoveAndTheftExperienceRegistration(business.id);
  console.log(`Love & Theft Experience registration ready: ${document.id}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Experience registration failed.");
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
