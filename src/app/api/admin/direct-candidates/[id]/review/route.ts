import { z } from "zod";
import { requireAdmin } from "@/server/auth/admin";
import { transaction } from "@/server/db";
import { failure, json, readJson } from "@/server/http";
import { reviewDirectCandidate } from "@/ingestion/direct-sources/review";
const input = z.object({
  action: z.enum(["approve", "exclude"]).default("approve"),
  promotion: z.unknown().optional(),
  reason: z.string().trim().min(3).max(2000),
});
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAdmin(req),
      id = z.uuid().parse((await params).id),
      body = input.parse(await readJson(req));
    return json(
      await transaction("admin", (c) =>
        reviewDirectCandidate(c, id, body, actor),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
