import { afterEach, describe, expect, it } from "vitest";
import {
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  selectCandidates,
  defaultFinding,
  evidenceBundleSchema,
  findingSchema,
  buildAudit,
} from "../scripts/research/direct-source-audit/model";
import { runDirectAudit } from "../scripts/research/direct-source-audit/run";
import type {
  AuditResult,
  AuditRecord,
} from "../scripts/research/source-origin-audit/types";
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })),
  );
});
// Captured research input fixture, stripped to independent records; no network.
async function input(): Promise<AuditResult> {
  return JSON.parse(
    await readFile("tests/fixtures/direct-source-origin.json", "utf8"),
  );
}
const empty = evidenceBundleSchema.parse({
  version: 1,
  captures: [],
  findings: [],
});
const prov = {
  input_file: "fixture",
  input_sha256: "fixture",
  evidence_file: "fixture",
  evidence_sha256: "fixture",
};
const capture = {
  id: "official",
  url: "https://merchant.example/",
  retrieved_at: "2026-09-30T00:00:00Z",
  method: "captured HTML",
  status: 200,
  content_sha256: null,
  artifact: null,
  observation: "Corporate official navigation links candidate",
};
describe("research direct-source audit", () => {
  it("includes only resolved offer-associated merchant, issuer and app candidates", async () => {
    const a = await input(),
      rows = selectCandidates(a);
    expect(new Set(rows.map((r) => r.destination_class))).toEqual(
      new Set([
        "merchant_web_candidate",
        "issuer_or_platform_candidate",
        "app_or_deep_link",
      ]),
    );
    expect(rows).toHaveLength(4);
    expect(
      rows.every(
        (r) =>
          r.channel &&
          r.telegram_message_id &&
          r.signal_id &&
          r.source_origin_records.length,
      ),
    ).toBe(true);
    expect(a.records.length).toBeGreaterThan(rows.length);
  });
  it("excludes social/publisher/Telegram/hubs/unresolved/non-offer/context records", async () => {
    const a = await input();
    for (const destination_class of [
      "official_social_candidate",
      "publisher",
      "deal_aggregator",
      "telegram",
      "link_hub",
      "unknown",
    ] as const)
      expect(
        selectCandidates({
          ...a,
          records: [{ ...a.records[0], destination_class }],
        }),
      ).toEqual([]);
    for (const override of [
      { resolution_status: "failed" },
      { signal_class: "non_offer_signal" },
      { association: "source_post" },
      { canonical_candidate_url: null },
    ])
      expect(
        selectCandidates({
          ...a,
          records: [{ ...a.records[0], ...override } as AuditRecord],
        }),
      ).toEqual([]);
  });
  it("dedupes signal plus exact URL stably and preserves all input indexes", async () => {
    const a = await input();
    a.records.push(a.records[0]);
    const rows = selectCandidates(a);
    expect(rows).toHaveLength(4);
    expect(
      rows
        .find((r) => r.signal_id === a.records[0].signal_id)
        ?.source_origin_records.map((r) => r.index),
    ).toEqual([0, a.records.length - 1]);
    expect(selectCandidates(a)).toEqual(rows);
  });
  it("keeps different same-domain offers but counts one reusable domain pattern", async () => {
    const c = selectCandidates(await input()).filter(
      (r) => r.destination_class === "merchant_web_candidate",
    );
    const evidence = evidenceBundleSchema.parse({
      version: 1,
      captures: [capture],
      findings: c.map((row) => ({
        ...defaultFinding(row.candidate_url),
        reusable_pattern: "yes",
        adapter_pattern_key: "captured_html_directory",
        pattern_evidence: [
          {
            evidence_id: "official",
            observation: "Observed directory structure",
          },
        ],
      })),
    });
    const a = buildAudit(c, evidence, prov);
    expect(a.summary.candidate_count).toBe(2);
    expect(a.patterns[0].distinct_domains).toHaveLength(1);
    expect(a.summary.reusable_domain_pattern_counts).toEqual({
      captured_html_directory: 1,
    });
    expect(
      buildAudit(c, empty, prov).summary.reusable_domain_pattern_counts,
    ).toEqual({});
  });
  it("leaves ownership unverified without evidence regardless of merchant hint", async () => {
    const a = buildAudit(selectCandidates(await input()), empty, prov);
    expect(
      a.records.every(
        (r) =>
          r.ownership_status === "unverified" &&
          !r.direct_source_verified &&
          r.source_role === "unknown",
      ),
    ).toBe(true);
    expect(() =>
      findingSchema.parse({
        ...defaultFinding(capture.url),
        ownership_status: "verified",
      }),
    ).toThrow(/explicit evidence/);
    expect(() =>
      evidenceBundleSchema.parse({
        version: 1,
        captures: [],
        findings: [
          {
            ...defaultFinding(capture.url),
            ownership_status: "verified",
            ownership_confidence: "established",
            ownership_evidence: [
              { evidence_id: "missing", observation: "assertion" },
            ],
          },
        ],
      }),
    ).toThrow(/Missing evidence/);
  });
  it("cannot verify ownership from a blocked page or infer enumeration without a listing", () => {
    const finding = {
      ...defaultFinding(capture.url),
      ownership_status: "verified",
      ownership_confidence: "established",
      ownership_evidence: [
        { evidence_id: "official", observation: "Explicit operator statement" },
      ],
    };
    expect(() =>
      evidenceBundleSchema.parse({
        version: 1,
        captures: [{ ...capture, status: 403 }],
        findings: [finding],
      }),
    ).toThrow(/inaccessible evidence/);
    expect(() =>
      findingSchema.parse({
        ...defaultFinding(capture.url),
        enumerable: "yes",
      }),
    ).toThrow(/listing evidence/);
  });
  it("allows verified structured campaign with no enumerable source independently", () => {
    const f = findingSchema.parse({
      ...defaultFinding(capture.url),
      ownership_status: "verified",
      ownership_confidence: "established",
      ownership_evidence: [
        { evidence_id: "official", observation: "Corporate link" },
      ],
      source_role: "merchant_official",
      direct_source_verified: true,
      enumerable: "no",
      extraction_feasibility: "structured",
    });
    expect(f.enumerable).toBe("no");
    expect(f.extraction_feasibility).toBe("structured");
  });
  it("does not label app-only handoff enumerable web", () => {
    expect(() =>
      findingSchema.parse({
        ...defaultFinding(capture.url),
        extraction_feasibility: "app_only",
        enumerable: "yes",
        enumeration_evidence: [
          { evidence_id: "official", observation: "handoff" },
        ],
      }),
    ).toThrow(/App-only/);
    expect(
      findingSchema.parse({
        ...defaultFinding(capture.url),
        extraction_feasibility: "app_only",
        enumerable: "no",
        requires_app: "yes",
      }),
    ).toMatchObject({ enumerable: "no", requires_app: "yes" });
  });
  it("retains an inaccessible candidate in the audit", async () => {
    const c = selectCandidates(await input());
    const e = evidenceBundleSchema.parse({
      version: 1,
      captures: [],
      findings: [
        {
          ...defaultFinding(c[0].candidate_url),
          extraction_feasibility: "inaccessible",
          blocked_or_inaccessible: "yes",
        },
      ],
    });
    const a = buildAudit(c, e, prov);
    expect(a.records).toHaveLength(c.length);
    expect(a.summary.inaccessible_count).toBe(1);
  });
  it("replays captured inputs byte-stably; ownership reviews leave protected evidence and registry unchanged", async () => {
    const root = await realpath(await mkdtemp(join(tmpdir(), "direct-audit-")));
    dirs.push(root);
    const paths = [
      "data/merchant-source-registry.json",
      ".local/source-origin-audit/existing/audit.json",
      ".local/source-discovery-service/seal.json",
    ];
    for (const p of paths) {
      await mkdir(dirname(join(root, p)), { recursive: true });
      await writeFile(join(root, p), JSON.stringify(p));
    }
    const a = await input();
    const c = selectCandidates(a);
    const e = evidenceBundleSchema.parse({
      version: 1,
      captures: [
        {
          ...capture,
          artifact: "official.html",
          content_sha256: createHash("sha256")
            .update("Explicit corporate ownership evidence")
            .digest("hex"),
        },
      ],
      findings: [
        {
          ...defaultFinding(c[0].candidate_url),
          ownership_status: "verified",
          ownership_confidence: "established",
          ownership_evidence: [
            { evidence_id: "official", observation: "explicit corporate link" },
          ],
        },
      ],
    });
    const inputPath = join(root, "input.json"),
      evidence = join(root, "evidence.json");
    await writeFile(
      join(root, "official.html"),
      "Explicit corporate ownership evidence",
    );
    await writeFile(inputPath, JSON.stringify(a));
    await writeFile(evidence, JSON.stringify(e));
    const before = await Promise.all(
      paths.map((p) => readFile(join(root, p), "utf8")),
    );
    const outputs = [];
    for (const run of ["first", "second"])
      outputs.push(
        await runDirectAudit({
          repoRoot: root,
          input: inputPath,
          evidence,
          output: join(root, ".local/direct-source-audit", run),
        }),
      );
    for (const name of [
      "candidates.json",
      "audit.json",
      "report.md",
      "report.csv",
    ])
      expect(await readFile(join(outputs[0].output, name), "utf8")).toBe(
        await readFile(join(outputs[1].output, name), "utf8"),
      );
    expect(outputs[0].audit.summary.verified_authority_count).toBe(1);
    expect(
      await Promise.all(paths.map((p) => readFile(join(root, p), "utf8"))),
    ).toEqual(before);
    expect(await readFile(inputPath, "utf8")).toBe(JSON.stringify(a));
    expect(await readFile(evidence, "utf8")).toBe(JSON.stringify(e));
    await expect(
      runDirectAudit({
        repoRoot: root,
        input: inputPath,
        evidence,
        output: outputs[0].output,
      }),
    ).rejects.toThrow(/exists/);
    for (const p of paths)
      await expect(
        runDirectAudit({
          repoRoot: root,
          input: inputPath,
          evidence,
          output: join(root, p, "new"),
        }),
      ).rejects.toThrow(/child/);
    await writeFile(join(root, "official.html"), "tampered capture");
    await expect(
      runDirectAudit({
        repoRoot: root,
        input: inputPath,
        evidence,
        output: join(root, ".local/direct-source-audit/corrupt"),
      }),
    ).rejects.toThrow(/hash mismatch/);
    await symlink(
      join(root, ".local/source-discovery-service"),
      join(root, ".local/direct-source-audit/alias"),
    );
    await expect(
      runDirectAudit({
        repoRoot: root,
        input: inputPath,
        evidence,
        output: join(root, ".local/direct-source-audit/alias/new"),
      }),
    ).rejects.toThrow(/Symlinked/);
  });
  it("has no production ingestion, database or monitor runtime import path", async () => {
    const visited = new Set<string>();
    async function inspect(file: string) {
      file = resolve(file);
      if (visited.has(file)) return;
      visited.add(file);
      expect(file).not.toMatch(
        /\/src\/ingestion\/|\/server\/|\/db\/|\/source-monitor\/|worker\.ts$|runner\.ts$/,
      );
      const s = await readFile(file, "utf8");
      expect(s).not.toMatch(
        /from\s+["'](?:pg|@supabase\/supabase-js)["']|import\s*\(/,
      );
      for (const m of s.matchAll(
        /(?:import|export)\s+(?!type\b)[\s\S]*?\bfrom\s*["']([^"']+)["']/g,
      ))
        if (m[1].startsWith("."))
          await inspect(join(dirname(file), m[1] + ".ts"));
    }
    await inspect("scripts/research/direct-source-audit.ts");
  });
});
