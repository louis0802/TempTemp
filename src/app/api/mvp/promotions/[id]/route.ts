import { z } from "zod";
import { visibleMvp } from "@/domain/mvp";
import { readMvpData, mvpListing, allowHistory } from "@/server/mvp";
import { failure, json } from "@/server/http";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = z
      .string()
      .uuid()
      .parse((await params).id);
    const p = visibleMvp(await readMvpData(), allowHistory(req)).find(
      (p) => p.id === id,
    );
    return p ? json(mvpListing(p)) : json({ error: "Offer unavailable" }, 404);
  } catch (e) {
    return failure(e);
  }
}
