import { z } from "zod";
import { boundsSchema, singaporeBounds } from "@/domain/promotion";
import { getPromotions } from "@/server/promotions";
import { failure, json } from "@/server/http";
export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams;
    const bounds = q.has("bbox")
      ? boundsSchema.parse(q.get("bbox")!.split(",").map(Number))
      : singaporeBounds;
    const category = z
      .enum(["All", "Meals", "Cafés", "Drinks", "Desserts"])
      .parse(q.get("category") || "All");
    const cursor = z.string().uuid().nullable().parse(q.get("cursor"));
    return json(await getPromotions(bounds, category, cursor));
  } catch (e) {
    return failure(e);
  }
}
