import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { readMapInputs } from "./build-merchant-source-map";
import { refreshProgressDocuments } from "./merchant-automation-progress";
import { reports, type MerchantMap } from "./merchant-source-map/build";
import {
  readIdentityReview,
  canonicalIdentity,
} from "./merchant-source-map/identity";
import { coverageBatch2Sources } from "../../src/ingestion/direct-sources/coverage-batch-2-definitions";
import { fixtureTransport } from "../../src/ingestion/direct-sources/fixtures";
import {
  runDirectSource,
  type DirectSourceRun,
} from "../../src/ingestion/direct-sources/runner";
import {
  acquisitionReady,
  evaluateDirectPublication,
  singaporeObservationDate,
} from "../../src/ingestion/direct-sources/publication";
const folder = "docs/changes/coverage-batch-2";
export const fixtureKeys = {
  bari_bari_steak_sg: "baribaristeak",
  captain_kim_sg: "captainkim",
  sushiro_sg: "sushiro",
  mcdonalds_sg: "mcdonalds",
} as const;
export async function replayCoverageSource(
  source: (typeof coverageBatch2Sources)[number],
) {
  const key = fixtureKeys[source.id as keyof typeof fixtureKeys];
  if (!key) throw new Error("not_batch_2_source");
  return runDirectSource(source, {
    ...(await fixtureTransport(
      `tests/fixtures/coverage-batch-2/${key}/replay-manifest.json`,
    )),
    mode: "fixture",
  });
}
export async function generateCoverageReport() {
  const before = JSON.parse(
    await readFile(`${folder}/baseline-merchants.json`, "utf8"),
  ) as MerchantMap;
  const selection = JSON.parse(
    await readFile(`${folder}/selection.json`, "utf8"),
  ) as MerchantMap["merchants"];
  const after = await readMapInputs(),
    identity = await readIdentityReview(process.cwd());
  const replay: {
    source: string;
    merchant: string;
    enumeration: DirectSourceRun["enumeration"];
    gate: DirectSourceRun["gate"];
    requests: DirectSourceRun["requests"];
    candidates: DirectSourceRun["candidates"];
    issues: DirectSourceRun["issues"];
    decisions: (ReturnType<typeof evaluateDirectPublication> & {
      candidateId: string;
      title: string | null;
    })[];
    counts: {
      candidates: number;
      excluded: number;
      review: number;
      ready: number;
    };
  }[] = [];
  for (const source of coverageBatch2Sources) {
    const run = await replayCoverageSource(source);
    const decisions = run.candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      title: candidate.title,
      ...evaluateDirectPublication(candidate, {
        asOf: singaporeObservationDate(run.observedAt),
        acquisitionReady: acquisitionReady(run),
        outlets: [],
        outletsVerified: false,
        outletIssues: ["official_outlet_resolution_not_activated"],
        verifiedAt: run.observedAt,
      }),
    }));
    replay.push({
      source: source.id,
      merchant: source.publicationPolicy.merchant,
      enumeration: run.enumeration,
      gate: run.gate,
      requests: run.requests,
      candidates: run.candidates,
      issues: run.issues,
      decisions,
      counts: {
        candidates: decisions.length,
        excluded: decisions.filter((d) => d.result === "exclude").length,
        review: decisions.filter((d) => d.result === "needs_review").length,
        ready: decisions.filter((d) => d.result === "ready").length,
      },
    });
  }
  const delta = Object.fromEntries(
    Object.keys(before.summary.progress_counts).map((key) => [
      key,
      after.summary.progress_counts[key] - before.summary.progress_counts[key],
    ]),
  );
  const moved = (state: string) =>
    selection
      .filter(
        (b) =>
          b.automation_progress === state &&
          after.merchants.find(
            (a) =>
              a.normalized_merchant ===
              canonicalIdentity(b.merchant, identity.aliases),
          )?.automation_progress !== state,
      )
      .map((b) => b.merchant);
  const rows = selection.map((b) => {
    const a = after.merchants.find(
      (a) =>
        a.normalized_merchant ===
        canonicalIdentity(b.merchant, identity.aliases),
    );
    if (!a) throw new Error("selected_canonical_merchant_missing");
    const web = a.source_tracks.filter((t) => t.kind === "merchant_web"),
      social = a.source_tracks.filter((t) => t.kind === "merchant_social");
    return {
      merchant: a.merchant,
      tg_signals: a.historical_signal_count,
      tg_offers: a.historical_offer_count,
      web_state: web.map((t) => t.activation_status).join("; "),
      social_state:
        social
          .map(
            (t) =>
              `${t.platform}:${t.account ?? "account unresolved"}:${t.activation_status}`,
          )
          .join("; ") || "no merchant-controlled link verified",
      ownership: [...new Set(a.source_tracks.map((t) => t.ownership))]
        .sort()
        .join("; "),
      enumeration: web.map((t) => t.enumeration).join("; "),
      ...(replay.find((r) => r.merchant === a.merchant)?.counts ?? {
        candidates: 0,
        excluded: 0,
        review: 0,
        ready: 0,
      }),
      final_progress: a.automation_progress,
      next_action: a.next_action,
      main_blockers: [
        ...new Set(a.source_tracks.flatMap((t) => t.blockers)),
      ].sort(),
    };
  });
  const result = {
    version: 1,
    before: before.summary,
    after: after.summary,
    delta,
    aliases: identity.aliases,
    moved_out_of_not_assessed: moved("not_assessed"),
    moved_out_of_source_candidate: moved("source_candidate"),
    rows,
    newly_enabled: rows
      .filter((r) => r.final_progress === "auto_enabled")
      .map((r) => r.merchant),
    newly_shadow: rows
      .filter((r) => r.final_progress === "shadow_only")
      .map((r) => r.merchant),
    newly_blocked: rows
      .filter((r) => r.final_progress === "blocked")
      .map((r) => r.merchant),
    remaining_candidates: rows
      .filter((r) => r.final_progress === "source_candidate")
      .map((r) => r.merchant),
  };
  const cell = (v: unknown) =>
    String(v).replace(/\|/g, "\\|").replace(/\n/g, " ");
  const md = [
    "# Coverage batch 2 generated results",
    "",
    "Counts are offline generic publication-gate dispositions on 2 October 2026 in Singapore. Zero extracted candidates for a source without an adapter means no safe extraction was implemented, not no promotions exist.",
    "",
    "| State | Before | After | Delta |",
    "|---|---:|---:|---:|",
    ...Object.keys(delta).map(
      (k) =>
        `| ${k} | ${before.summary.progress_counts[k]} | ${after.summary.progress_counts[k]} | ${delta[k]} |`,
    ),
    "",
    `Historical denominator: ${before.summary.historical_merchant_count} → ${after.summary.historical_merchant_count}; autonomous coverage: ${before.summary.auto_enabled_percentage}% → ${after.summary.auto_enabled_percentage}%. The coverage percentage increase comes only from the reviewed alias correction; no new source is enabled.`,
    "",
    `Selected rows out of not_assessed: ${result.moved_out_of_not_assessed.length}; out of source_candidate: ${result.moved_out_of_source_candidate.length}. Ajumma’s is a separate identity correction, not a batch source activation.`,
    "",
    "| Merchant | TG Signals | TG Offers | Web State | Social State | Ownership | Enumeration | Candidates | Excluded | Review | Ready | Final Progress | Next Action | Main Blockers |",
    "|---|---:|---:|---|---|---|---|---:|---:|---:|---:|---|---|---|",
    ...rows.map(
      (r) =>
        `| ${[r.merchant, r.tg_signals, r.tg_offers, r.web_state, r.social_state, r.ownership, r.enumeration, r.candidates, r.excluded, r.review, r.ready, r.final_progress, r.next_action, r.main_blockers.join(", ")].map(cell).join(" | ")} |`,
    ),
    "",
  ].join("\n");
  await refreshProgressDocuments();
  for (const [file, raw] of Object.entries(reports(after)))
    await writeFile(`${folder}/${file}`, raw);
  await writeFile(
    `${folder}/replay.json`,
    JSON.stringify(replay, null, 2) + "\n",
  );
  await writeFile(
    `${folder}/progress-delta.json`,
    JSON.stringify(result, null, 2) + "\n",
  );
  await writeFile(`${folder}/batch-results.md`, md);
  // Preserve failed requests as well as successful captures, with independent merchant totals.
  const research = [];
  for (const merchant of await readdir("tests/fixtures/coverage-batch-2")) {
    const base = `tests/fixtures/coverage-batch-2/${merchant}`;
    const rounds = await readdir(base, { withFileTypes: true });
    const attempts = [];
    for (const round of rounds
      .filter((r) => r.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(base, round.name, "manifest.json"),
        manifest = JSON.parse(await readFile(file, "utf8"));
      attempts.push(
        ...manifest.captures.map((c: Record<string, unknown>) => ({
          ...c,
          merchant,
          round: round.name,
          captured_at: manifest.captured_at,
          manifest: file,
          purpose:
            round.name.startsWith("social") ||
            String(c.url).includes("instagram.com")
              ? "public exact social identity/acquisition assessment"
              : "explicit official web source/ownership/outlet structural assessment",
        })),
      );
    }
    research.push({ merchant, request_count: attempts.length, attempts });
  }
  await writeFile(
    `${folder}/research-ledger.json`,
    JSON.stringify(research, null, 2) + "\n",
  );
  return result;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
)
  generateCoverageReport()
    .then((r) =>
      console.log(
        JSON.stringify(
          {
            before: r.before.progress_counts,
            after: r.after.progress_counts,
            delta: r.delta,
            rows: r.rows.map((x) => ({
              merchant: x.merchant,
              progress: x.final_progress,
              candidates: x.candidates,
              excluded: x.excluded,
              review: x.review,
              ready: x.ready,
            })),
          },
          null,
          2,
        ),
      ),
    )
    .catch((e: unknown) => {
      console.error(e instanceof Error ? e.message : e);
      process.exitCode = 1;
    });
