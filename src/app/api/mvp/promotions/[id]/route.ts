import { z } from "zod";
import { visibleMvp } from "@/domain/mvp";
import {
  readMvpData,
  mvpListing,
  mvpPreviewOptions,
  presentMvpListing,
} from "@/server/mvp";
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
    const options = mvpPreviewOptions(new URL(req.url).searchParams);
    const p = visibleMvp(await readMvpData(), options.mode).find(
      (p) => p.id === id,
    );
    return p
      ? json(presentMvpListing(mvpListing(p), options.showSourceText))
      : json({ error: "Offer unavailable" }, 404);
  } catch (e) {
    return failure(e);
  }
}
