import { createHash } from "node:crypto";
import { mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import type { AuditResult } from "../source-origin-audit/types";
import { buildAudit, evidenceBundleSchema, selectCandidates } from "./model";
import { csvReport, markdownReport } from "./report";
const hash = (raw: string) => createHash("sha256").update(raw).digest("hex");
export async function runDirectAudit(options: {
  repoRoot: string;
  input: string;
  evidence: string;
  output: string;
}) {
  const root = await realpath(options.repoRoot);
  const target = resolve(options.output),
    allowed = join(root, ".local/direct-source-audit");
  const within = relative(allowed, target);
  if (!within || within.startsWith("..") || within.startsWith("/"))
    throw new Error("Output must be a new child of .local/direct-source-audit");
  let ancestor = target;
  while (true) {
    try {
      await stat(ancestor);
      if ((await realpath(ancestor)) !== ancestor)
        throw new Error("Symlinked output ancestor");
      break;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      ancestor = dirname(ancestor);
    }
  }
  try {
    await stat(target);
    throw new Error("Output already exists");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  const inputRaw = await readFile(options.input, "utf8"),
    evidenceRaw = await readFile(options.evidence, "utf8");
  const input = JSON.parse(inputRaw) as AuditResult;
  if (
    input.version !== 1 ||
    !Array.isArray(input.records) ||
    input.records.some((r) => !("canonical_candidate_url" in r))
  )
    throw new Error("Corrected source-origin audit required");
  const evidence = evidenceBundleSchema.parse(JSON.parse(evidenceRaw));
  // Captured bodies are replay inputs, not optional mutable diagnostics.
  const evidenceRoot = await realpath(dirname(resolve(options.evidence)));
  for (const capture of evidence.captures) {
    if (!capture.artifact) continue;
    const artifact = await realpath(resolve(evidenceRoot, capture.artifact));
    const withinEvidence = relative(evidenceRoot, artifact);
    if (
      !withinEvidence ||
      withinEvidence.startsWith("..") ||
      withinEvidence.startsWith("/")
    )
      throw new Error(
        "Capture artifact must remain within the evidence directory",
      );
    const digest = createHash("sha256")
      .update(await readFile(artifact))
      .digest("hex");
    if (digest !== capture.content_sha256)
      throw new Error(`Capture hash mismatch: ${capture.id}`);
  }
  const candidates = selectCandidates(input);
  if (
    evidence.findings.some(
      (f) => !candidates.some((c) => c.candidate_url === f.candidate_url),
    )
  )
    throw new Error(
      "Evidence findings must refer only to selected direct candidates",
    );
  const audit = buildAudit(candidates, evidence, {
    input_file: resolve(options.input),
    input_sha256: hash(inputRaw),
    evidence_file: resolve(options.evidence),
    evidence_sha256: hash(evidenceRaw),
  });
  await mkdir(dirname(target), { recursive: true });
  await mkdir(target);
  for (const [name, value] of Object.entries({
    "candidates.json": candidates,
    "audit.json": audit,
  }))
    await writeFile(join(target, name), JSON.stringify(value, null, 2) + "\n");
  await writeFile(join(target, "report.md"), markdownReport(audit));
  await writeFile(join(target, "report.csv"), csvReport(audit));
  return { output: target, audit };
}
