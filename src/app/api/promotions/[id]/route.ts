import { z } from "zod";
import { getPromotion } from "@/server/promotions";
import { failure, json } from "@/server/http";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const p = await getPromotion(z.string().uuid().parse(id));
    return p ? json(p) : json({ error: "Offer unavailable" }, 404);
  } catch (e) {
    return failure(e);
  }
}
