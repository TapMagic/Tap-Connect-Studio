import { NextRequest, NextResponse } from "next/server";
import {
  browseIconifyCollection,
  fetchIconSvg,
  searchIconify,
} from "@/lib/fusion/creative-studio/providers/iconify";
import { createIconAsset } from "@/lib/fusion/creative-studio/icon-asset";
import {
  ICON_BROWSE_CATEGORIES,
  ICON_COLLECTION_BROWSE,
  browseCategoryById,
  collectionById,
} from "@/lib/fusion/creative-studio/icon-browse";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() || "";
  const category = request.nextUrl.searchParams.get("category")?.trim() || "";
  const collection = request.nextUrl.searchParams.get("collection")?.trim() || "";
  const prefix = request.nextUrl.searchParams.get("prefix")?.trim() || "";
  const id = request.nextUrl.searchParams.get("id")?.trim() || "";

  try {
    if (id) {
      const split = id.indexOf(":");
      if (split <= 0) return NextResponse.json({ icon: null });
      const collection = id.slice(0, split);
      const name = id.slice(split + 1);
      const svg = await fetchIconSvg(collection, name);
      const icon = svg ? createIconAsset({ provider: "iconify", collection, iconName: name, svg }) : null;
      return NextResponse.json({ icon });
    }
    if (request.nextUrl.searchParams.get("meta") === "1") {
      return NextResponse.json({
        categories: ICON_BROWSE_CATEGORIES.map(({ id, label }) => ({ id, label })),
        collections: ICON_COLLECTION_BROWSE.map(({ id, label, prefix: p }) => ({
          id,
          label,
          prefix: p,
        })),
      });
    }

    if (collection) {
      const col = collectionById(collection);
      if (!col) return NextResponse.json({ icons: [], fallback: false });
      const icons = await browseIconifyCollection(col.prefix, col.sampleQuery);
      return NextResponse.json({ icons, fallback: false, mode: "collection", collection: col.id });
    }

    if (category) {
      const cat = browseCategoryById(category);
      if (!cat || !cat.query) {
        return NextResponse.json({ icons: [], fallback: false, mode: "browse", category });
      }
      const icons = await searchIconify(cat.query, { prefix: cat.prefix });
      return NextResponse.json({ icons, fallback: false, mode: "browse", category: cat.id });
    }

    if (query.length < 2) return NextResponse.json({ icons: [] });
    const icons = await searchIconify(query, { prefix: prefix || undefined });
    return NextResponse.json({ icons, fallback: false, mode: "search" });
  } catch {
    return NextResponse.json({ icons: [], fallback: true }, { status: 200 });
  }
}
