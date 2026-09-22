import { z } from "zod";
import { boundsSchema, singaporeBounds } from "@/domain/promotion";
import {
  getMvpPromotions,
  mvpPreviewOptions,
  presentMvpListing,
} from "@/server/mvp";
import { failure, json } from "@/server/http";
export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams;
    const options = mvpPreviewOptions(q);
    const response = await getMvpPromotions(
      q.has("bbox")
        ? boundsSchema.parse(q.get("bbox")!.split(",").map(Number))
        : singaporeBounds,
      z.string().uuid().nullable().parse(q.get("cursor")),
      options.mode,
    );
    return json({
      ...response,
      items: response.items.map((p) =>
        presentMvpListing(p, options.showSourceText),
      ),
    });
  } catch (e) {
    return failure(e);
  }
}
