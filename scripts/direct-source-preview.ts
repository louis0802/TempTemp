import { lstat, mkdir, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fixtureTransport } from "../src/ingestion/direct-sources/fixtures";
import {
  directSources,
  sourceDefinition,
} from "../src/ingestion/direct-sources/registry";
import {
  runDirectSource,
  type DirectSourceRun,
} from "../src/ingestion/direct-sources/runner";
import { sourceIdSchema } from "../src/ingestion/direct-sources/types";
export function parseArgs(args: string[]) {
  let source: string | undefined;
  let all = false;
  let fixture: string | undefined;
  let output: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--all") {
      all = true;
      continue;
    }
    if (
      !["--source", "--fixture", "--output"].includes(arg) ||
      !args[i + 1] ||
      args[i + 1].startsWith("--")
    )
      throw new Error(`invalid_argument:${arg}`);
    const value = args[++i];
    if (arg === "--source") {
      if (source) throw new Error("duplicate_source_argument");
      source = value;
    }
    if (arg === "--fixture") fixture = value;
    if (arg === "--output") output = value;
  }
  if (source && all) throw new Error("choose_source_or_all");
  if (!source && !all)
    throw new Error("explicit_source_required: use --source <id> or --all");
  return {
    sources: source
      ? [sourceDefinition(sourceIdSchema.parse(source))]
      : [...directSources],
    fixture,
    output,
  };
}
export async function prepareOutput(output?: string, cwd = process.cwd()) {
  const root = await realpath(cwd);
  const base = path.join(root, ".local/direct-source-preview");
  const destination = path.resolve(
    root,
    output ?? path.join(base, new Date().toISOString().replace(/[:.]/g, "-")),
  );
  if (!destination.startsWith(base + path.sep))
    throw new Error("output_must_be_preview_child");
  for (const ancestor of [path.join(root, ".local"), base]) {
    try {
      if ((await lstat(ancestor)).isSymbolicLink())
        throw new Error("output_symlink_forbidden");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  await mkdir(base, { recursive: true });
  const relative = path.relative(base, destination).split(path.sep);
  let parent = base;
  for (const component of relative.slice(0, -1)) {
    parent = path.join(parent, component);
    try {
      const stat = await lstat(parent);
      if (stat.isSymbolicLink() || !stat.isDirectory())
        throw new Error("output_symlink_forbidden");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await mkdir(parent);
    }
  }
  await mkdir(destination); // Existing destinations, including symlinks, fail closed.
  return destination;
}
export async function writeRunArtifacts(
  output: string,
  runs: DirectSourceRun[],
) {
  const json = (file: string, value: unknown) =>
    writeFile(path.join(output, file), JSON.stringify(value, null, 2) + "\n", {
      flag: "wx",
    });
  await mkdir(path.join(output, "evidence"));
  for (const run of runs)
    for (const page of run.pages) {
      const name = page.evidence.id;
      const extension =
        page.evidence.contentType === "application/pdf" ? "pdf" : "html";
      await writeFile(
        path.join(output, "evidence", `${name}.${extension}`),
        page.body,
        { flag: "wx" },
      );
      await json(`evidence/${name}.json`, {
        ...page.evidence,
        artifact: `${name}.${extension}`,
      });
    }
  await json(
    "run.json",
    runs.map(
      ({ source, mode, observedAt, limits, requests, issues, gate }) => ({
        source,
        mode,
        observedAt,
        limits,
        requests,
        issues,
        gate,
      }),
    ),
  );
  await json(
    "enumeration.json",
    runs.map((run) => ({ sourceId: run.source.id, ...run.enumeration })),
  );
  await json(
    "candidates.json",
    runs.flatMap((run) => run.candidates),
  );
  const report = [
    "# Direct-source shadow preview",
    "",
    "One-shot source-specific crawling. No publication or production activation. Direct evidence is authoritative candidate input; Telegram remains signal-only.",
    "",
  ];
  for (const run of runs) {
    report.push(
      `## ${run.source.label}`,
      "",
      `Mode: ${run.mode}. Status: ${run.gate.status}. Observed: ${run.observedAt}.`,
      "",
      `Enumeration complete: ${run.enumeration.complete}; entries: ${run.enumeration.entries.length}; candidates: ${run.candidates.length}.`,
      "",
      "```json",
      JSON.stringify(run.gate, null, 2),
      "```",
      "",
      "### Requested surfaces",
      "",
      ...run.requests.map(
        (r) =>
          `- ${r.relation}: ${r.url} → ${r.status ?? "failed"}${r.error ? ` (${r.error})` : ""}`,
      ),
      "",
      "### Acquisition and coverage issues",
      "",
      ...(run.issues.length
        ? run.issues.map((i) => `- ${i.code}: ${i.url}`)
        : ["None."]),
      "",
    );
  }
  await writeFile(path.join(output, "report.md"), report.join("\n"), {
    flag: "wx",
  });
}
export async function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  const fixture = options.fixture
    ? await fixtureTransport(path.resolve(options.fixture))
    : undefined;
  const output = await prepareOutput(options.output);
  const runs: DirectSourceRun[] = [];
  for (const source of options.sources)
    runs.push(
      await runDirectSource(source, {
        ...fixture,
        mode: fixture ? "fixture" : "live",
      }),
    );
  await writeRunArtifacts(output, runs);
  console.log(
    JSON.stringify(
      {
        output,
        sources: runs.map((run) => ({
          sourceId: run.source.id,
          ...run.gate,
          acquisitionIssues: run.issues,
        })),
      },
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
    console.error(error instanceof Error ? error.message : "preview_failed");
    process.exitCode = 1;
  });
