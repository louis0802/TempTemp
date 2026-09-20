import { digest, fetchText, ResolutionCache } from "./cache";
import type { DirectorySnapshot, Evidence, MerchantBranch } from "./types";

/** Fixed provider-owned URL only. Redirects are rejected by fetchText. */
export async function officialDirectoryPage(
  cache: ResolutionCache,
  url: string,
  fetcher: typeof fetch,
) {
  const page = await cache.get("official-page:" + url, url, 3600_000, () =>
    fetchText(url, {}, fetcher),
  );
  const evidence: Evidence = {
    url,
    checkedAt: page.checkedAt,
    sourceHash: page.sourceHash,
    summary:
      "Official merchant directory; parser validates enumeration against source count and navigation.",
  };
  return { html: page.value, evidence };
}

/** Provenance alone does not prove enumeration; callers must supply source-specific checks. */
export function auditedDirectory(input: {
  html: string;
  evidence: Evidence;
  officialUrl: string;
  branches: MerchantBranch[];
  officialCount: number | null;
  traversalEstablished: boolean;
  issues: string[];
}): DirectorySnapshot {
  const { branches, evidence, officialCount } = input;
  const issues = [...input.issues];
  if (
    evidence.url !== input.officialUrl ||
    evidence.sourceHash !== digest(input.html) ||
    !Number.isFinite(Date.parse(evidence.checkedAt))
  )
    issues.push("invalid_official_source_provenance");
  if (!input.traversalEstablished) issues.push("unproven_directory_traversal");
  if (!branches.length) issues.push("empty_official_directory");
  if (
    officialCount !== null &&
    (!Number.isInteger(officialCount) ||
      officialCount < 1 ||
      officialCount !== branches.length)
  )
    issues.push("official_count_mismatch");
  const normalize = (s: string) =>
    s.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
  for (const field of ["name", "address"] as const) {
    if (
      new Set(branches.map((b) => normalize(b[field]))).size !== branches.length
    )
      issues.push(`duplicate_directory_${field}`);
  }
  for (const branch of branches) {
    if (
      !branch.name ||
      !branch.address ||
      !/^\d{6}$/.test(branch.postalCode) ||
      !branch.existenceEvidence.length
    )
      issues.push(`invalid_directory_branch:${branch.name}`);
  }
  const valid = issues.length === 0;
  return {
    branches,
    authoritative: valid,
    fullyTraversed: valid,
    pages: [evidence],
    officialCount,
    issues: [...new Set(issues)],
  };
}
