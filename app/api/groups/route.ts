import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { createCampaignGroup, listCampaignGroups } from "@/lib/services/groups";

const createSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  seedBarExample: z.boolean().optional(),
});

export async function GET() {
  try {
    const { business } = await requireBusiness();
    const groups = await listCampaignGroups(business.id);
    return NextResponse.json({ groups });
  } catch (error) {
    console.error("List groups error:", error);
    return NextResponse.json({ error: "Failed to load groups" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, business } = await requireBusiness();
    const body = createSchema.parse(await request.json());

    const group = await createCampaignGroup({
      businessId: business.id,
      title: body.title,
      description: body.description,
      seedBarExample: body.seedBarExample,
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
