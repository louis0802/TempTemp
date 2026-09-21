import { z } from "zod";
import { boundsSchema, singaporeBounds } from "@/domain/promotion";
import { getMvpPromotions, allowHistory } from "@/server/mvp";
import { failure, json } from "@/server/http";
export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams;
    return json(
      await getMvpPromotions(
        q.has("bbox")
          ? boundsSchema.parse(q.get("bbox")!.split(",").map(Number))
          : singaporeBounds,
        z.string().uuid().nullable().parse(q.get("cursor")),
        allowHistory(req),
      ),
    );
  } catch (e) {
    return failure(e);
  }
}
