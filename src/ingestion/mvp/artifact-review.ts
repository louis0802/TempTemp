import { createHash } from "node:crypto";
import { z } from "zod";
import { resolve, extname } from "node:path";
import { mvpPromotionSchema } from "@/domain/mvp";
import { offerPolicySchema } from "@/domain/mvp-policy";

const hash = (text: string) => createHash("sha256").update(text).digest("hex");
export function assertMvpArtifactOutputPath(
  output: string,
  inputs: string[],
  protectedPaths: string[],
  inputDirectories: string[] = [],
) {
  const target = resolve(output);
  const protectedTargets = new Set(
    [
      ...inputs,
      ...protectedPaths,
      "data/mvp-promotions.json",
      "tests/corpus/mvp-conformance-reviewed.json",
    ].map((p) => resolve(p)),
  );
  if (
    extname(target) !== ".json" ||
    protectedTargets.has(target) ||
    target.startsWith(resolve("docs/changes/mvp-offer-lifecycle") + "/") ||
    inputDirectories.some((directory) =>
      target.startsWith(resolve(directory) + "/"),
    )
  )
    throw new Error("mvp_artifact_output_path_protected");
}
const previewSchema = z
  .object({
    version: z.literal(3),
    policyVersion: z.literal("mvp-offer-policy-v1"),
    records: z.array(
      mvpPromotionSchema.and(z.object({ offerPolicy: offerPolicySchema })),
    ),
  })
  .passthrough();
const semanticReviewSchema = z.object({
  reviewer: z.string().min(1),
  previewArtifactSha256: z.string(),
  sourceReviewSha256: z.string(),
  records: z.array(
    z.object({
      recordId: z.string(),
      disposition: z.enum([
        "approved_for_opt_in",
        "withheld",
        "requires_correction",
      ]),
    }),
  ),
});
/** Review applies to exact bytes; withheld records remain in corpus but cannot enter live results. */
export function buildReviewedMvpArtifact(
  previewText: string,
  reviewValue: unknown,
  ledgerText: string,
) {
  const preview = previewSchema.parse(JSON.parse(previewText));
  const review = semanticReviewSchema.parse(reviewValue);
  if (
    hash(previewText) !== review.previewArtifactSha256 ||
    hash(ledgerText) !== review.sourceReviewSha256
  )
    throw new Error("semantic_review_input_hash_mismatch");
  const ledger = z
    .object({
      records: z.array(
        z.object({
          recordId: z.string(),
          changed: z.boolean(),
          scheduleStructureAddition: z.object({
            newRules: z.array(z.unknown()),
          }),
        }),
      ),
    })
    .parse(JSON.parse(ledgerText));
  const required = new Set(
    ledger.records
      .filter(
        (r) => r.changed || r.scheduleStructureAddition.newRules.length > 0,
      )
      .map((r) => r.recordId),
  );
  const decisions = new Map(
    review.records.map((r) => [r.recordId, r.disposition]),
  );
  if (
    decisions.size !== review.records.length ||
    [...required].some((id) => !decisions.has(id))
  )
    throw new Error("semantic_review_missing_or_duplicate_rows");
  if (
    [...decisions.keys()].some(
      (id) => !preview.records.some((r) => r.id === id),
    )
  )
    throw new Error("semantic_review_unknown_record");
  const withheldIds: string[] = [];
  const records = preview.records.map((record) => {
    const disposition = decisions.get(record.id);
    if (!disposition || disposition === "approved_for_opt_in") return record;
    withheldIds.push(record.id);
    return mvpPromotionSchema.parse({
      ...record,
      contentStatus: "needs_content_resolution",
      status: "needs_content_resolution",
      reasons: [...record.reasons, `semantic_review_withheld:${disposition}`],
    });
  });
  return {
    ...preview,
    records,
    statusCounts: {
      ready: records.filter((r) => r.status === "ready").length,
      needs_validity: records.filter((r) => r.status === "needs_validity")
        .length,
      needs_location: records.filter((r) => r.status === "needs_location")
        .length,
      needs_content_resolution: records.filter(
        (r) => r.status === "needs_content_resolution",
      ).length,
    },
    analysisMetrics: preview.metrics,
    metrics: {
      "Total records": records.length,
      "Content resolved": records.filter((r) => r.contentStatus === "resolved")
        .length,
      "Validity resolved": records.filter(
        (r) => r.validityStatus === "resolved",
      ).length,
      "MVP ready": records.filter((r) => r.status === "ready").length,
      "Map-ready": records.filter((r) => r.mapStatus === "ready").length,
    },
    review: {
      reviewer: review.reviewer,
      humanApproval: false,
      previewArtifactSha256: review.previewArtifactSha256,
      sourceReviewSha256: review.sourceReviewSha256,
      reviewedRows: review.records.length,
      approvedChangedRows: review.records.length - withheldIds.length,
      withheldIds,
      activation: "opt_in_only; default legacy unchanged",
    },
  };
}
