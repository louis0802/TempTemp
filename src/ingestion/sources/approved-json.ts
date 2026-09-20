import { z } from "zod";
import { readFile, stat } from "node:fs/promises";
export const postSchema = z.object({
  messageId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  publishedAt: z.iso.datetime(),
  text: z.string().max(50000),
  candidates: z
    .array(
      z.object({ key: z.string().min(1).max(100), promotion: z.unknown() }),
    )
    .max(100),
});
export const exportSchema = z.object({
  source: z.enum(["sgfooddeals", "tastesoulsg"]),
  complete: z.literal(true),
  coverageStart: z.iso.datetime(),
  completeThrough: z.iso.datetime(),
  posts: z.array(postSchema).max(10000),
});
export type SourceExport = z.infer<typeof exportSchema>;
export async function readApprovedExport(path: string) {
  if ((await stat(path)).size > 10000000)
    throw new Error("Import exceeds 10 MB");
  return z
    .array(exportSchema)
    .min(1)
    .max(2)
    .refine(
      (v) => new Set(v.map((s) => s.source)).size === v.length,
      "Duplicate source export",
    )
    .parse(JSON.parse(await readFile(path, "utf8")));
}
