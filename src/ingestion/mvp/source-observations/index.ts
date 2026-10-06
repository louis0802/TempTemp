import { createHash } from "node:crypto";
import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { SourceObservation } from "@/domain/mvp-policy";

const instant = z.iso.datetime({ offset: true });
const pageSchema = z.object({
  url: z.url(),
  contentHash: z.string().regex(/^[a-f\d]{64}$/i),
});
const structureProofSchema = z
  .object({
    kind: z.enum(["listing", "empty_listing"]),
    evidence: z.array(z.string().min(1)).min(1),
    traversalComplete: z.literal(true),
    classificationComplete: z.literal(true),
    emptyStateConfirmed: z.boolean(),
  })
  .superRefine((proof, ctx) => {
    if ((proof.kind === "empty_listing") !== proof.emptyStateConfirmed) {
      ctx.addIssue({
        code: "custom",
        message:
          "Empty-list proof must explicitly match the observed listing state",
      });
    }
  });

export const mvpSourceSnapshotSchema = z
  .object({
    sourceId: z.string().min(1),
    snapshotId: z.string().min(1),
    observedAt: instant,
    mode: z.enum(["live", "fixture", "cache"]),
    visitedPages: z.array(pageSchema),
    complete: z.boolean(),
    truncated: z.boolean(),
    errors: z.array(z.string()),
    seenItems: z.array(
      z.object({
        itemId: z.string().min(1),
        canonicalUrl: z.url().optional(),
        nativeId: z.string().min(1).optional(),
      }),
    ),
    structureProof: structureProofSchema.nullable(),
  })
  .superRefine((snapshot, ctx) => {
    if (
      new Set(snapshot.seenItems.map((item) => item.itemId)).size !==
      snapshot.seenItems.length
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["seenItems"],
        message: "Duplicate stable item identity",
      });
    }
    if (
      snapshot.seenItems.some((item) => !item.canonicalUrl && !item.nativeId)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["seenItems"],
        message: "Every item needs a canonical URL or native ID",
      });
    }
    if (
      snapshot.seenItems.some(
        (item) => stableMvpItemKey(snapshot.sourceId, item) !== item.itemId,
      )
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["seenItems"],
        message:
          "Item IDs must use the stable source/native or canonical URL key",
      });
    }
    if (
      snapshot.complete &&
      (snapshot.truncated || snapshot.errors.length || !snapshot.structureProof)
    ) {
      ctx.addIssue({
        code: "custom",
        message:
          "Complete snapshots require full traversal, classification, and structural proof",
      });
    }
    if (snapshot.complete && snapshot.visitedPages.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["visitedPages"],
        message: "Complete snapshots must identify at least one visited page",
      });
    }
    if (
      snapshot.structureProof?.kind === "empty_listing" &&
      snapshot.seenItems.length !== 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["structureProof"],
        message: "Empty-list proof cannot accompany observed items",
      });
    }
    if (
      snapshot.structureProof?.kind === "listing" &&
      snapshot.seenItems.length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["structureProof"],
        message: "Zero items require explicit empty-list proof",
      });
    }
  });

export type MvpSourceSnapshot = z.infer<typeof mvpSourceSnapshotSchema>;
export type SnapshotValidation =
  | { valid: true; snapshot: MvpSourceSnapshot; hash: string }
  | { valid: false; issues: string[] };

export function validateMvpSourceSnapshot(value: unknown): SnapshotValidation {
  const parsed = mvpSourceSnapshotSchema.safeParse(value);
  if (!parsed.success)
    return {
      valid: false,
      issues: parsed.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      ),
    };
  return {
    valid: true,
    snapshot: parsed.data,
    hash: hashSnapshot(parsed.data),
  };
}

export function hashSnapshot(snapshot: MvpSourceSnapshot): string {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

export function stableMvpItemKey(
  sourceId: string,
  input: { canonicalUrl?: string; nativeId?: string },
): string | null {
  const native = input.nativeId?.trim();
  if (native) return `${sourceId}:native:${native}`;
  if (!input.canonicalUrl) return null;
  try {
    const url = new URL(input.canonicalUrl);
    url.hash = "";
    for (const key of [...url.searchParams.keys()])
      if (/^(utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key);
    url.searchParams.sort();
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    return `${sourceId}:url:${url.toString()}`;
  } catch {
    return null;
  }
}

export type ObservationApplyResult = {
  observation: SourceObservation;
  disposition:
    "present" | "absent" | "partial" | "failed" | "cache" | "out_of_order";
};

export function applyMvpSourceSnapshot(
  prior: SourceObservation | null,
  snapshotValue: unknown,
  options: {
    itemKey: string;
    capability: SourceObservation["capability"];
    ttlDays: 7 | 14;
  },
): ObservationApplyResult {
  const incomingAt =
    typeof snapshotValue === "object" &&
    snapshotValue !== null &&
    "observedAt" in snapshotValue &&
    typeof snapshotValue.observedAt === "string"
      ? snapshotValue.observedAt
      : null;
  const incomingMs = incomingAt ? Date.parse(incomingAt) : NaN;
  const sourceId =
    typeof snapshotValue === "object" &&
    snapshotValue !== null &&
    "sourceId" in snapshotValue &&
    typeof snapshotValue.sourceId === "string"
      ? snapshotValue.sourceId
      : (prior?.sourceId ?? "unknown");
  const previous = prior ?? emptyObservation(sourceId, options);
  if (!incomingAt || !Number.isFinite(incomingMs))
    return { observation: previous, disposition: "failed" };
  if (prior?.lastAttemptAt && incomingMs < Date.parse(prior.lastAttemptAt))
    return { observation: previous, disposition: "out_of_order" };
  const incomingId =
    typeof snapshotValue === "object" &&
    snapshotValue !== null &&
    "snapshotId" in snapshotValue &&
    typeof snapshotValue.snapshotId === "string"
      ? snapshotValue.snapshotId
      : null;
  if (
    incomingId &&
    previous.lastAttemptAt === incomingAt &&
    previous.events.at(-1)?.snapshotId === incomingId
  ) {
    const disposition =
      previous.presence === "absent"
        ? "absent"
        : previous.presence === "present" &&
            options.capability === "current_offer_listing"
          ? "present"
          : previous.lastAttemptStatus === "failed"
            ? "failed"
            : "partial";
    return { observation: previous, disposition };
  }
  const checked = validateMvpSourceSnapshot(snapshotValue);
  if (!checked.valid)
    return unchanged(previous, snapshotValue, options, "failed");
  const snapshot = checked.snapshot;
  if (snapshot.sourceId !== previous.sourceId)
    return { observation: previous, disposition: "failed" };
  const observedMs = Date.parse(snapshot.observedAt);
  const previousMs = previous.lastAttemptAt
    ? Date.parse(previous.lastAttemptAt)
    : -Infinity;
  if (observedMs < previousMs)
    return { observation: previous, disposition: "out_of_order" };
  if (
    previous.snapshotId === snapshot.snapshotId &&
    previous.snapshotHash === checked.hash
  )
    return {
      observation: previous,
      disposition:
        options.capability !== "current_offer_listing"
          ? "partial"
          : previous.presence === "absent"
            ? "absent"
            : previous.presence === "present"
              ? "present"
              : "partial",
    };
  if (snapshot.mode === "cache")
    return unchanged(prior, snapshot, options, "cache");

  const seen = snapshot.seenItems.some(
    (item) => item.itemId === options.itemKey,
  );
  const complete =
    snapshot.complete &&
    !snapshot.truncated &&
    snapshot.errors.length === 0 &&
    !!snapshot.structureProof;
  if (options.capability !== "current_offer_listing") {
    if (!complete || !seen)
      return unchanged(
        previous,
        snapshot,
        options,
        complete ? "partial" : snapshot.errors.length ? "failed" : "partial",
      );
    const at = snapshot.observedAt;
    return {
      observation: {
        ...previous,
        firstSeenAt: previous.firstSeenAt ?? at,
        lastAttemptAt: at,
        lastAttemptStatus: "complete",
        snapshotId: snapshot.snapshotId,
        snapshotHash: checked.hash,
        events: [
          ...previous.events,
          { at, type: "present", snapshotId: snapshot.snapshotId },
        ],
      },
      disposition: "partial",
    };
  }
  const disposition = !complete
    ? snapshot.errors.length
      ? "failed"
      : "partial"
    : seen
      ? "present"
      : "absent";
  const at = snapshot.observedAt;
  const eventType =
    disposition === "present" || disposition === "absent"
      ? disposition
      : disposition;
  const updated: SourceObservation = {
    ...previous,
    ...(disposition === "present" && !previous.firstSeenAt
      ? { firstSeenAt: at }
      : {}),
    lastAttemptAt: at,
    lastAttemptStatus:
      disposition === "present" || disposition === "absent"
        ? "complete"
        : disposition,
    ...(complete
      ? {
          lastSuccessfulCompleteCheckAt: at,
          snapshotId: snapshot.snapshotId,
          snapshotHash: checked.hash,
        }
      : {}),
    ...(disposition === "present"
      ? { presence: "present", lastSeenOnSource: at }
      : {}),
    ...(disposition === "absent" ? { presence: "absent" } : {}),
    events: [
      ...previous.events,
      {
        at,
        type: eventType as "present" | "absent" | "partial" | "failed",
        snapshotId: snapshot.snapshotId,
      },
    ],
  };
  return { observation: updated, disposition };
}

function unchanged(
  prior: SourceObservation | null,
  snapshot: unknown,
  options: {
    itemKey: string;
    capability: SourceObservation["capability"];
    ttlDays: 7 | 14;
  },
  disposition: "failed" | "partial" | "cache",
) {
  const sourceId =
    typeof snapshot === "object" &&
    snapshot !== null &&
    "sourceId" in snapshot &&
    typeof snapshot.sourceId === "string"
      ? snapshot.sourceId
      : (prior?.sourceId ?? "unknown");
  const base = prior ?? emptyObservation(sourceId, options);
  // Attempts are auditable, while all freshness/presence fields remain byte-for-byte unchanged.
  const at =
    typeof snapshot === "object" &&
    snapshot !== null &&
    "observedAt" in snapshot &&
    typeof snapshot.observedAt === "string"
      ? snapshot.observedAt
      : null;
  const id =
    typeof snapshot === "object" &&
    snapshot !== null &&
    "snapshotId" in snapshot &&
    typeof snapshot.snapshotId === "string"
      ? snapshot.snapshotId
      : "invalid-snapshot";
  if (disposition === "cache")
    return { observation: base, disposition } as ObservationApplyResult;
  const eventType = disposition;
  const observation = at
    ? ({
        ...base,
        lastAttemptAt: at,
        lastAttemptStatus: disposition,
        events: eventType
          ? [...base.events, { at, type: eventType, snapshotId: id }]
          : base.events,
      } as SourceObservation)
    : base;
  return { observation, disposition } as ObservationApplyResult;
}

function emptyObservation(
  sourceId: string,
  options: {
    itemKey: string;
    capability: SourceObservation["capability"];
    ttlDays: 7 | 14;
  },
): SourceObservation {
  return {
    sourceId,
    sourceKind: "unknown",
    capability: options.capability,
    itemKey: options.itemKey,
    firstSeenAt: null,
    lastSeenOnSource: null,
    lastSuccessfulCompleteCheckAt: null,
    lastAttemptAt: null,
    lastAttemptStatus: "unknown",
    presence: "unknown",
    snapshotId: null,
    snapshotHash: null,
    ttlDays: options.ttlDays,
    events: [],
  };
}

export type MvpSourceCapability = {
  sourceId: string;
  capability: SourceObservation["capability"];
  evidence: readonly string[];
  rationale: string;
};

// Explicit evidence reviewed for this integration; merchant ownership alone is never a capability signal.
export const MVP_SOURCE_CAPABILITIES: Readonly<
  Record<string, MvpSourceCapability>
> = Object.freeze({
  pepper_lunch_sg: {
    sourceId: "pepper_lunch_sg",
    capability: "historical_archive",
    evidence: [
      "tests/fixtures/direct-sources/pepper-captured-seven/listing.html#a59ce8651d7ab5be061ab6adeca10b8ef0ed59235f9c8e4f09de8d3a1f072103",
      "docs/changes/mvp-offer-lifecycle/evaluation/inventory-report.json",
    ],
    rationale:
      "Captured listing semantics do not prove active-only/current-offer membership; do not use it to renew or withdraw open-ended offers.",
  },
  shake_shack_sg: {
    sourceId: "shake_shack_sg",
    capability: "historical_archive",
    evidence: [
      "docs/changes/shake-shack-direct-source/research.md",
      "docs/changes/shake-shack-autonomous-activation/verification.md",
      "tests/fixtures/direct-sources/shake-shack/",
    ],
    rationale:
      "The blog is a mixed editorial archive; current promotion-list semantics are not established, so it cannot renew or withdraw open-ended offers.",
  },
});

const lockTimeoutMs = 5_000;
export async function writeMvpSnapshotAtomic(
  directory: string,
  value: unknown,
): Promise<string> {
  const checked = validateMvpSourceSnapshot(value);
  if (!checked.valid)
    throw new Error(
      `Refusing invalid source snapshot: ${checked.issues.join("; ")}`,
    );
  const snapshot = checked.snapshot;
  await mkdir(directory, { recursive: true });
  const target = path.join(directory, `${safeName(snapshot.sourceId)}.json`);
  const lock = `${target}.lock`;
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  const deadline = Date.now() + lockTimeoutMs;
  let lockHandle: Awaited<ReturnType<typeof open>> | undefined;
  while (!lockHandle) {
    try {
      lockHandle = await open(lock, "wx");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (Date.now() >= deadline)
        throw new Error(
          `Timed out waiting for source snapshot lock: ${snapshot.sourceId}`,
        );
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  try {
    try {
      const old = JSON.parse(await readFile(target, "utf8")) as unknown;
      const oldChecked = validateMvpSourceSnapshot(old);
      if (!oldChecked.valid)
        throw new Error("Existing snapshot is invalid; refusing replacement");
      if (
        Date.parse(oldChecked.snapshot.observedAt) >
        Date.parse(snapshot.observedAt)
      )
        throw new Error("Refusing out-of-order snapshot replacement");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const handle = await open(temp, "wx", 0o600);
    try {
      await handle.writeFile(`${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    // Read and validate the completed temp artifact before the atomic replacement.
    const tempValue: unknown = JSON.parse(await readFile(temp, "utf8"));
    if (!validateMvpSourceSnapshot(tempValue).valid)
      throw new Error("Temporary snapshot validation failed");
    await rename(temp, target);
    const dirHandle = await open(directory, "r");
    try {
      await dirHandle.sync();
    } finally {
      await dirHandle.close();
    }
    return target;
  } finally {
    await rm(temp, { force: true });
    await lockHandle.close();
    await rm(lock, { force: true });
  }
}

export async function readMvpSnapshot(
  directory: string,
  sourceId: string,
): Promise<MvpSourceSnapshot | null> {
  try {
    const parsed: unknown = JSON.parse(
      await readFile(
        path.join(directory, `${safeName(sourceId)}.json`),
        "utf8",
      ),
    );
    const checked = validateMvpSourceSnapshot(parsed);
    if (!checked.valid)
      throw new Error("Stored source snapshot failed validation");
    return checked.snapshot;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function safeName(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}
