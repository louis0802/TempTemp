/** File-based, research-only interval lifecycle. Raw inputs are frozen before review. */
import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { DateTime } from "luxon";
import { atomicWriteJson, sha256File, writeNewJson } from "./storage";
import type { Evaluation } from "./evaluation";

export const PHASES = [
  "prepared",
  "observing",
  "acquisition_frozen",
  "benchmark_frozen",
  "evaluated",
  "sealed",
] as const;
export type IntervalPhase = (typeof PHASES)[number];
export type IntervalRecord = {
  schema_version: 1;
  run_id: string;
  date: string;
  interval_start_at: string;
  interval_end_at: string;
  protocol_revision: 3 | 4 | 5 | 6;
  protocol_sha256: string;
  registry_sha256: string;
  phase: IntervalPhase;
  transitions: { phase: IntervalPhase; at: string }[];
  partial_reasons: string[];
};
export type AcquisitionInput = {
  core_enumeration_complete?: boolean;
  core_extraction_complete?: boolean;
  all_registry_enumeration_complete?: boolean;
  all_registry_extraction_complete?: boolean;
  source_completeness?: unknown[];
  core_content_partial_reasons?: string[];
  core_content_complete?: boolean;
  core_cadence_complete?: boolean;
  all_registry_content_complete?: boolean;
  all_registry_cadence_complete?: boolean;
  core_candidates?: unknown[];
  supplemental_candidates?: unknown[];

  content_complete?: boolean;
  content_partial_reasons?: string[];
  recovery?: unknown[];
  cadence_gaps?: unknown[];
  source_snapshots: unknown[];
  candidates: unknown[];
  totals: Record<string, unknown>;
  partial_reasons: string[];
};
export type BenchmarkRawInput = {
  content_complete?: boolean;
  content_partial_reasons?: string[];
  posts: unknown[];
  polls: unknown[];
  coverage_gaps: unknown[];
  coverage_complete: boolean;
  channel_status: Record<string, unknown>;
  coverage_note: string;
};

const readJson = async <T>(file: string): Promise<T> =>
  JSON.parse(await readFile(file, "utf8")) as T;
const fileExists = async (file: string) => {
  try {
    await readFile(file);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
};
async function filesBelow(directory: string, prefix = ""): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(path.join(directory, prefix), {
    withFileTypes: true,
  })) {
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory())
      result.push(...(await filesBelow(directory, relative)));
    else if (entry.isFile() && !entry.name.endsWith(".tmp"))
      result.push(relative);
    else throw new Error(`Unsupported research run entry: ${relative}`);
  }
  return result.sort();
}
export const intervalDir = (root: string, date: string) => {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !DateTime.fromISO(date, { zone: "Asia/Singapore" }).isValid
  )
    throw new Error("Invalid Singapore interval date");
  return path.join(root, "runs", date);
};
export async function readInterval(root: string, date: string) {
  const record = await readJson<IntervalRecord>(
    path.join(intervalDir(root, date), "interval.json"),
  );
  if (
    record.schema_version !== 1 ||
    record.date !== date ||
    ![3, 4, 5, 6].includes(record.protocol_revision) ||
    !PHASES.includes(record.phase)
  )
    throw new Error("Invalid interval state");
  return record;
}
export async function openInterval(
  root: string,
  date: string,
  at: string,
  protocolSha256: string,
  registrySha256: string,
  revision: 3 | 4 | 5 | 6 = 3,
  serviceAlreadyObserving = false,
) {
  const dir = intervalDir(root, date);
  if (await fileExists(path.join(dir, "interval.json")))
    return readInterval(root, date);
  const day = DateTime.fromISO(date, { zone: "Asia/Singapore" }).startOf("day");
  const record: IntervalRecord = {
    schema_version: 1,
    run_id: `source-monitor-${date}-${randomUUID()}`,
    date,
    interval_start_at: day.toUTC().toISO()!,
    interval_end_at: day.plus({ days: 1 }).toUTC().toISO()!,
    protocol_revision: revision,
    protocol_sha256: protocolSha256,
    registry_sha256: registrySha256,
    phase: "prepared",
    transitions: [{ phase: "prepared", at }],
    partial_reasons:
      Date.parse(at) >
      day.toMillis() +
        (revision >= 4 && serviceAlreadyObserving ? 5 * 60_000 : 0)
        ? ["service_started_after_interval_start"]
        : [],
  };
  await mkdir(dir, { recursive: true });
  await writeNewJson(path.join(dir, "interval.json"), record, { root });
  return transitionInterval(root, date, "observing", at);
}
export async function transitionInterval(
  root: string,
  date: string,
  target: IntervalPhase,
  at: string,
) {
  const record = await readInterval(root, date);
  if (record.phase === target) return record;
  if (
    record.phase === "sealed" ||
    PHASES.indexOf(target) !== PHASES.indexOf(record.phase) + 1
  )
    throw new Error(
      `Invalid interval transition: ${record.phase} -> ${target}`,
    );
  const next = {
    ...record,
    phase: target,
    transitions: [...record.transitions, { phase: target, at }],
  };
  await atomicWriteJson(
    path.join(intervalDir(root, date), "interval.json"),
    next,
    { root },
  );
  return next;
}
export async function addPartialReason(
  root: string,
  date: string,
  reason: string,
) {
  const record = await readInterval(root, date);
  if (record.phase === "sealed")
    throw new Error("Sealed interval is immutable");
  if (record.partial_reasons.includes(reason)) return record;
  const next = {
    ...record,
    partial_reasons: [...record.partial_reasons, reason],
  };
  await atomicWriteJson(
    path.join(intervalDir(root, date), "interval.json"),
    next,
    { root },
  );
  return next;
}
export async function freezeAcquisition(
  root: string,
  date: string,
  acquisition: AcquisitionInput,
  at: string,
) {
  const dir = intervalDir(root, date),
    file = path.join(dir, "acquisition.json");
  const record = await readInterval(root, date);
  if (record.phase === "sealed")
    throw new Error("Sealed interval is immutable");
  if (record.phase !== "observing" && record.phase !== "acquisition_frozen")
    throw new Error("Acquisition freeze requires observing interval");
  if (!(await fileExists(file)))
    await writeNewJson(file, { ...acquisition, frozen_at: at }, { root });
  if (record.phase === "observing")
    await transitionInterval(root, date, "acquisition_frozen", at);
  const frozen = await readJson<AcquisitionInput & { frozen_at: string }>(file);
  for (const reason of frozen.partial_reasons)
    await addPartialReason(root, date, reason);
  return frozen;
}
export async function freezeRawBenchmark(
  root: string,
  date: string,
  raw: BenchmarkRawInput,
  at: string,
) {
  const dir = intervalDir(root, date),
    rawFile = path.join(dir, "telegram-raw.json");
  const record = await readInterval(root, date);
  if (record.phase === "sealed")
    throw new Error("Sealed interval is immutable");
  if (
    record.phase !== "acquisition_frozen" &&
    record.phase !== "benchmark_frozen"
  )
    throw new Error("Raw benchmark freeze requires acquisition freeze");
  if (!(await fileExists(rawFile)))
    await writeNewJson(rawFile, { ...raw, frozen_at: at }, { root });
  const sealFile = path.join(dir, "OBSERVATIONS_SEALED");
  if (!(await fileExists(sealFile))) {
    const frozenFiles = [
      "acquisition.json",
      "telegram-raw.json",
      ...(await filesBelow(dir)).filter(
        (file) =>
          file.startsWith(`discovery${path.sep}`) ||
          file === "discovery-result.json",
      ),
    ];
    await writeNewJson(
      sealFile,
      {
        sealed_at: at,
        sha256: Object.fromEntries(
          await Promise.all(
            frozenFiles.map(async (file) => [
              file,
              await sha256File(path.join(dir, file)),
            ]),
          ),
        ),
      },
      { root },
    );
  }
  if (record.phase === "acquisition_frozen")
    await transitionInterval(root, date, "benchmark_frozen", at);
  const frozen = await readJson<BenchmarkRawInput & { frozen_at: string }>(
    rawFile,
  );
  if (!frozen.coverage_complete)
    await addPartialReason(root, date, "incomplete_telegram_coverage");
  return frozen;
}
export async function verifyObservationSeal(root: string, date: string) {
  const dir = intervalDir(root, date);
  const seal = await readJson<{ sha256: Record<string, string> }>(
    path.join(dir, "OBSERVATIONS_SEALED"),
  );
  if (!seal.sha256?.["acquisition.json"] || !seal.sha256?.["telegram-raw.json"])
    throw new Error("Incomplete observation seal");
  for (const [file, digest] of Object.entries(seal.sha256)) {
    const resolved = path.resolve(dir, file);
    if (path.isAbsolute(file) || !resolved.startsWith(dir + path.sep))
      throw new Error("Invalid observation seal path");
    if (digest !== (await sha256File(path.join(dir, file))))
      throw new Error(`Frozen research observation changed: ${file}`);
  }
  const current = [
    "acquisition.json",
    "telegram-raw.json",
    ...(await filesBelow(dir)).filter(
      (file) =>
        file.startsWith(`discovery${path.sep}`) ||
        file === "discovery-result.json",
    ),
  ].sort();
  if (
    JSON.stringify(current) !== JSON.stringify(Object.keys(seal.sha256).sort())
  )
    throw new Error("Frozen research observation file set changed");
  return true;
}
export async function sealEvaluation(
  root: string,
  date: string,
  evaluation: Evaluation,
  at: string,
) {
  const dir = intervalDir(root, date),
    record = await readInterval(root, date);
  if (await fileExists(path.join(dir, "SEALED")))
    throw new Error("Sealed interval is immutable");
  if (
    record.phase !== "benchmark_frozen" &&
    record.phase !== "evaluated" &&
    record.phase !== "sealed"
  )
    throw new Error("Evaluation requires both frozen inputs");
  await verifyObservationSeal(root, date);
  const output = path.join(dir, "evaluation.json");
  if (!(await fileExists(output)))
    await writeNewJson(output, evaluation, { root });
  else if (
    JSON.stringify(await readJson<Evaluation>(output)) !==
    JSON.stringify(evaluation)
  )
    throw new Error("Frozen evaluation differs from current review");
  if (record.phase === "benchmark_frozen")
    await transitionInterval(root, date, "evaluated", at);
  if ((await readInterval(root, date)).phase === "evaluated")
    await transitionInterval(root, date, "sealed", at);
  const files = (await filesBelow(dir)).filter(
    (file) => file !== "manifest.json" && file !== "SEALED",
  );
  const manifest = {
    schema_version: 1,
    sealed_at: at,
    sha256: Object.fromEntries(
      await Promise.all(
        files.map(async (file) => [
          file,
          await sha256File(path.join(dir, file)),
        ]),
      ),
    ),
  };
  if (!(await fileExists(path.join(dir, "manifest.json"))))
    await writeNewJson(path.join(dir, "manifest.json"), manifest, { root });
  await writeNewJson(
    path.join(dir, "SEALED"),
    { manifest_sha256: await sha256File(path.join(dir, "manifest.json")) },
    { root },
  );
  return manifest;
}
export async function listedIntervalDates(root: string) {
  try {
    return (await readdir(path.join(root, "runs"), { withFileTypes: true }))
      .filter(
        (item) => item.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(item.name),
      )
      .map((item) => item.name)
      .sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
