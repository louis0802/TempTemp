import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { SourceTrack } from "./progress";

export const coverageReviewPath =
  "docs/changes/coverage-batch-2/source-decisions.json";
const schema = z.object({
  version: z.literal(1),
  captures: z.array(
    z.object({
      file: z.string().startsWith("tests/fixtures/"),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
    }),
  ),
  merchants: z.array(
    z.object({
      merchant: z.string(),
      operator: z.string().nullable(),
      ownership: z.enum(["verified", "probable", "unverified"]),
      urls: z.array(z.url()).min(1),
      family: z.string(),
      enumeration: z.string(),
      extraction: z.string(),
      adapter_source_id: z.string().nullable(),
      activation: z.enum(["blocked", "candidate", "shadow"]),
      blockers: z.array(z.string()).min(1),
      evidence_refs: z.array(z.string()).min(1),
    }),
  ),
});
export type WebAssessment = z.infer<typeof schema>["merchants"][number];
export async function readCoverageAssessments(root: string) {
  const raw = await readFile(path.join(root, coverageReviewPath), "utf8");
  const input = schema.parse(JSON.parse(raw));
  const captured = new Set(input.captures.map((c) => c.file));
  for (const c of input.captures) {
    const file = path.resolve(root, c.file);
    if (!file.startsWith(path.join(root, "tests/fixtures") + path.sep))
      throw new Error("assessment_capture_path_escape");
    if (
      createHash("sha256")
        .update(await readFile(file))
        .digest("hex") !== c.sha256
    )
      throw new Error("assessment_capture_integrity");
  }
  for (const a of input.merchants)
    if (!a.evidence_refs.some((f) => captured.has(f)))
      throw new Error("assessment_evidence_missing");
  if (
    input.merchants.some(
      (a) => a.activation === "shadow" && !a.adapter_source_id,
    )
  )
    throw new Error("shadow_assessment_requires_adapter");
  return {
    assessments: input.merchants,
    provenance: {
      file: coverageReviewPath,
      sha256: createHash("sha256").update(raw).digest("hex"),
    },
  };
}
export function assessmentTrack(a: WebAssessment): SourceTrack {
  return {
    kind: "merchant_web",
    platform: null,
    account: null,
    source_id: null,
    operator: a.operator,
    urls: a.urls,
    ownership: a.ownership,
    enumeration: a.enumeration,
    extraction: a.extraction,
    adapter: null,
    adapter_status: "none",
    activation_status: a.activation,
    stage:
      a.activation === "blocked"
        ? "blocked"
        : a.ownership === "verified"
          ? "ownership_verified"
          : "discovered",
    publication_enabled: false,
    auto_publish: false,
    autonomous_acquisition_enabled: false,
    review_incomplete_candidates: false,
    blockers: a.blockers,
    evidence_refs: a.evidence_refs,
  };
}
