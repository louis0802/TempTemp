import { createHash } from "node:crypto";
import { mkdir, readFile, realpath, lstat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { normalizeIdentity } from "../../src/ingestion/resolution/outlets";
import { directSources } from "../../src/ingestion/direct-sources/registry";
import { readIdentityReview } from "./merchant-source-map/identity";
import { readCoverageAssessments } from "./merchant-source-map/assessments";
import { readSocialResearch } from "./social-sources/read";
import type { DirectAudit } from "./direct-source-audit/model";
import {
  buildMerchantMap,
  reports,
  type HistoricalOffer,
  type MapReview,
} from "./merchant-source-map/build";
export const frozenMapInputs = {
  corpus: "tests/corpus/mvp-conformance-reviewed.json",
  signals:
    ".local/source-origin-audit/2026-09-30-social-corrected-offline/signals.json",
  audit: ".local/direct-source-audit/2026-09-30T14-13-48-529Z/audit.json",
  review: "docs/research/merchant-source-map-review.json",
} as const;
const hash = (raw: string) => createHash("sha256").update(raw).digest("hex");
export const batchAssessmentPath =
  "docs/changes/direct-source-batch-1/source-decisions.json";
const batchAssessmentSchema = z.array(
  z.object({
    merchant: z.string().min(1),
    operator: z.string().min(1),
    ownership: z.enum(["verified", "probable", "unverified"]),
    finalState: z.enum(["enabled", "shadow", "blocked"]),
    adapter: z.string().nullable(),
    blockers: z.array(z.string()),
    evidenceRefs: z.array(z.string()),
  }),
);
export async function readMapInputs(
  root = process.cwd(),
  options: { includeSocial: boolean; includeCoverage?: boolean } = {
    includeSocial: true,
  },
) {
  const inputs = await Promise.all(
    Object.entries(frozenMapInputs).map(async ([name, file]) => {
      const raw = await readFile(path.join(root, file), "utf8");
      return { name, file, sha256: hash(raw), value: JSON.parse(raw) };
    }),
  );
  const get = (name: string) => inputs.find((v) => v.name === name)!.value;
  const review = get("review") as MapReview,
    audit = get("audit") as DirectAudit;
  const corpus = get("corpus") as {
    rows: {
      candidateId: string;
      sourceUrl: string;
      actual: { id: string; merchant: string; genuine: boolean }[];
    }[];
  };
  const sources = new Set(corpus.rows.map((r) => r.sourceUrl));
  const historical: HistoricalOffer[] = corpus.rows.flatMap((r) =>
    r.actual.map((a) => ({
      merchant: a.merchant,
      sourceUrl: r.sourceUrl,
      offerId: `reviewed:${a.id}`,
      offer: a.genuine,
      evidenceRef: `${frozenMapInputs.corpus}#${r.candidateId}`,
    })),
  );
  const signals = get("signals") as {
    signal_class: string;
    signal: { id: string; merchantHint: string; sourcePostUrl: string };
  }[];
  for (const r of signals)
    if (!sources.has(r.signal.sourcePostUrl))
      historical.push({
        merchant:
          review.signal_identities[r.signal.id]?.merchant ??
          r.signal.merchantHint,
        sourceUrl: r.signal.sourcePostUrl,
        offerId: `signal:${r.signal.id}`,
        offer: r.signal_class === "promotion_signal",
        evidenceRef: `${frozenMapInputs.signals}#${r.signal.id}`,
      });
  let batchEvidence: { file: string; sha256: string } | null = null;
  let blockedAssessments: z.infer<typeof batchAssessmentSchema> = [];
  try {
    const raw = await readFile(path.join(root, batchAssessmentPath), "utf8");
    blockedAssessments = batchAssessmentSchema
      .parse(JSON.parse(raw))
      .filter((r) => r.finalState === "blocked" && r.adapter === null);
    batchEvidence = { file: batchAssessmentPath, sha256: hash(raw) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const current =
    options.includeCoverage === false
      ? null
      : {
          identity: await readIdentityReview(root),
          coverage: await readCoverageAssessments(root),
        };
  for (const assessment of current?.coverage.assessments ?? []) {
    if (assessment.adapter_source_id) {
      const source = directSources.find(
        (s) => s.id === assessment.adapter_source_id,
      );
      if (
        !source ||
        normalizeIdentity(source.publicationPolicy.merchant) !==
          normalizeIdentity(assessment.merchant) ||
        assessment.activation !== "shadow" ||
        source.publicationPolicy.enabled
      )
        throw new Error("coverage_adapter_review_mismatch");
    }
  }
  const mapInput = {
    aliases: current?.identity.aliases,
    webAssessments: current?.coverage.assessments,
    historical,
    audit,
    registry: directSources,
    review,
    blockedAssessments,
    provenance: {
      inputs: inputs.map(({ file, sha256 }) => ({ file, sha256 })),
      registry_sha256: hash(JSON.stringify(directSources)),
      batch_assessment: batchEvidence,
      ...(current
        ? {
            identity_review: current.identity.provenance,
            coverage_review: current.coverage.provenance,
          }
        : {}),
      original_signal_provenance:
        "Previously captured one_off_refresh signals, now frozen local replay; not new Telegram collection.",
    },
  };
  const baseMap = buildMerchantMap(mapInput);
  const social = options.includeSocial
    ? await readSocialResearch(
        root,
        new Set([
          ...baseMap.merchants.map((r) => r.normalized_merchant),
          ...(current?.identity.aliases.map((a) =>
            normalizeIdentity(a.alias),
          ) ?? []),
        ]),
        review.signal_identities,
      )
    : null;
  return social
    ? buildMerchantMap({
        ...mapInput,
        socialInventory: social.socialInventory,
        socialAssessments: social.socialAssessments,
        provenance: {
          ...mapInput.provenance,
          social_inputs: social.socialInventory.provenance,
        },
      })
    : baseMap;
}
export async function writeMerchantMap(output: string, root = process.cwd()) {
  const repo = await realpath(root),
    base = path.join(repo, ".local/merchant-source-map"),
    target = path.resolve(repo, output);
  if (!target.startsWith(base + path.sep))
    throw new Error("output_must_be_merchant_map_child");
  // Reject symlinked ancestors before any recursive directory creation.
  let ancestor = path.dirname(target);
  while (ancestor !== repo) {
    try {
      if ((await lstat(ancestor)).isSymbolicLink())
        throw new Error("output_symlink_forbidden");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    ancestor = path.dirname(ancestor);
  }
  const map = await readMapInputs(repo);
  await mkdir(path.dirname(target), { recursive: true });
  await mkdir(target);
  for (const [file, raw] of Object.entries(reports(map)))
    await writeFile(path.join(target, file), raw, { flag: "wx" });
  return { output: target, ...map.summary };
}
export async function main(args = process.argv.slice(2)) {
  if (args.length && (args.length !== 2 || args[0] !== "--output"))
    throw new Error("use_optional_output_only");
  console.log(
    JSON.stringify(
      await writeMerchantMap(
        args[1] ??
          `.local/merchant-source-map/${new Date().toISOString().replace(/[:.]/g, "-")}`,
      ),
      null,
      2,
    ),
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
)
  main().catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "merchant_map_failed",
    );
    process.exitCode = 1;
  });
