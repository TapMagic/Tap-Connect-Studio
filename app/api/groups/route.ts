import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import {
  createCampaignGroup,
  listCampaignGroups,
} from "@/lib/services/groups";
import { GROUP_SEED_OPTIONS } from "@/lib/campaign/group-seeds";

const createSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  timezone: z.string().max(80).optional(),
  seedPack: z
    .enum(["none", "general", "hospitality", "salon", "wedding", "home_services"])
    .optional(),
  /** @deprecated use seedPack */
  seedBarExample: z.boolean().optional(),
});

export async function GET() {
  try {
    const { business } = await requireBusiness();
    const groups = await listCampaignGroups(business.id);
    return NextResponse.json({ groups, seedOptions: GROUP_SEED_OPTIONS });
  } catch (error) {
    console.error("List groups error:", error);
    return NextResponse.json({ error: "Failed to load groups" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, business } = await requireBusiness();
    const body = createSchema.parse(await request.json());

    let seedPack = body.seedPack;
    if (!seedPack && body.seedBarExample) seedPack = "hospitality";

    const group = await createCampaignGroup({
      businessId: business.id,
      title: body.title,
      description: body.description,
      timezone: body.timezone ?? business.timezone,
      seedPack: seedPack ?? "none",
      userId: user.id,
    });

    revalidatePath("/dashboard/groups");
    revalidatePath("/dashboard/campaigns");
    return NextResponse.json({ group });
  } catch (error) {
    console.error("Create group error:", error);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}
