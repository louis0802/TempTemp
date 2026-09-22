import { z } from "zod";
import { visibleMvp } from "@/domain/mvp";
import { searchListings } from "@/domain/discovery-search";
import { mvpListing, mvpPreviewOptions, readMvpData } from "@/server/mvp";
import { failure, json } from "@/server/http";
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const q = z.string().trim().min(2).max(100).parse(params.get("q"));
    const { mode } = mvpPreviewOptions(params);
    return json({
      items: searchListings(
        visibleMvp(await readMvpData(), mode).map(mvpListing),
        q,
      ),
    });
  } catch (error) {
    return failure(error);
  }
}
