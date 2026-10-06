import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { load } from "cheerio";
import { z } from "zod";
import { sourceObservationSchema } from "@/domain/mvp-policy";
import { directPromotionCandidateSchema } from "../direct-sources/types";
import type { DirectSourceRun } from "../direct-sources/runner";
import { digest } from "../resolution/cache";
import {
  applyMvpSourceSnapshot,
  mvpSourceSnapshotSchema,
  stableMvpItemKey,
  MVP_SOURCE_CAPABILITIES,
} from "./source-observations";

export const mvpSourceStateSchema = z.object({
  version: z.literal(1),
  sourceId: z.string(),
  lastSnapshot: mvpSourceSnapshotSchema,
  observations: z.record(z.string(), sourceObservationSchema),
  candidates: z.record(
    z.string(),
    z.object({
      firstReceivedAt: z.iso.datetime({ offset: true }),
      candidate: directPromotionCandidateSchema,
    }),
  ),
});
export type MvpSourceState = z.infer<typeof mvpSourceStateSchema>;

export function snapshotFromDirectRun(run: DirectSourceRun) {
  const errors = run.issues.map((i) => `${i.code}:${i.url}`);
  const seenItems = run.candidates.flatMap((c) => {
    const itemId = stableMvpItemKey(c.sourceId, {
      canonicalUrl: c.canonicalUrl,
      nativeId: c.nativeId ?? undefined,
    });
    if (!itemId || c.extractionStatus === "failed" || !c.description) {
      errors.push(`unresolved_item:${c.canonicalUrl}`);
      return [];
    }
    return [
      {
        itemId,
        canonicalUrl: c.canonicalUrl,
        ...(c.nativeId ? { nativeId: c.nativeId } : {}),
      },
    ];
  });
  if (new Set(seenItems.map((i) => i.itemId)).size !== seenItems.length)
    errors.push("ambiguous_item_boundaries");
  if (run.enumeration.entries.length !== seenItems.length)
    errors.push("incomplete_item_classification");
  const listingPages = run.pages.filter(
    (p) => p.evidence.relation === "listing",
  );
  const structureKnown =
    run.source.id === "pepper_lunch_sg" &&
    listingPages.length > 0 &&
    listingPages.every(
      (p) => load(p.body.toString("utf8"))(".promo__container").length > 0,
    );
  const emptyConfirmed =
    structureKnown &&
    seenItems.length === 0 &&
    listingPages.every((p) => {
      const $ = load(p.body.toString("utf8"));
      return (
        $(".promo__container .promo__item").length === 0 &&
        /no (?:current |available )?promotions/i.test(
          $(".promo__container").text(),
        )
      );
    });
  const complete =
    run.enumeration.complete &&
    run.enumeration.pagination.unresolved.length === 0 &&
    errors.length === 0 &&
    structureKnown &&
    (seenItems.length > 0 || emptyConfirmed);
  return mvpSourceSnapshotSchema.parse({
    sourceId: run.source.id,
    snapshotId: digest({
      sourceId: run.source.id,
      at: run.observedAt,
      pages: listingPages.map((p) => p.evidence.contentHash),
      seenItems,
    }),
    observedAt: run.observedAt,
    mode: run.mode,
    visitedPages: listingPages.map((p) => ({
      url: p.evidence.url,
      contentHash: p.evidence.contentHash,
    })),
    complete,
    truncated: !run.enumeration.complete,
    errors,
    seenItems: [...new Map(seenItems.map((i) => [i.itemId, i])).values()],
    structureProof: complete
      ? {
          kind: emptyConfirmed ? "empty_listing" : "listing",
          evidence: listingPages.map((p) => p.evidence.contentHash),
          traversalComplete: true,
          classificationComplete: true,
          emptyStateConfirmed: emptyConfirmed,
        }
      : null,
  });
}

export function mergeDirectSourceState(
  prior: MvpSourceState | null,
  run: DirectSourceRun,
): MvpSourceState {
  const capability = MVP_SOURCE_CAPABILITIES[run.source.id];
  if (!capability) throw new Error("unreviewed_mvp_source");
  const snapshot = snapshotFromDirectRun(run);
  if (
    prior &&
    Date.parse(prior.lastSnapshot.observedAt) > Date.parse(snapshot.observedAt)
  )
    return prior;
  if (prior?.lastSnapshot.snapshotId === snapshot.snapshotId) return prior;
  const observations = { ...prior?.observations },
    candidates = { ...prior?.candidates };
  for (const c of run.candidates) {
    const key = stableMvpItemKey(c.sourceId, {
      canonicalUrl: c.canonicalUrl,
      nativeId: c.nativeId ?? undefined,
    });
    if (!key || !snapshot.seenItems.some((i) => i.itemId === key)) continue;
    candidates[key] = {
      firstReceivedAt: candidates[key]?.firstReceivedAt ?? c.observedAt,
      candidate: c,
    };
  }
  for (const key of new Set([
    ...Object.keys(observations),
    ...Object.keys(candidates),
  ])) {
    observations[key] = applyMvpSourceSnapshot(
      observations[key] ?? null,
      snapshot,
      {
        itemKey: key,
        capability: capability.capability,
        ttlDays: 14,
      },
    ).observation;
    observations[key] = {
      ...observations[key],
      sourceKind: "official",
      firstSeenAt:
        candidates[key]?.firstReceivedAt ?? observations[key].firstSeenAt,
    };
  }
  return mvpSourceStateSchema.parse({
    version: 1,
    sourceId: run.source.id,
    lastSnapshot: snapshot,
    observations,
    candidates,
  });
}

export async function readMvpSourceState(
  directory: string,
  sourceId: string,
): Promise<MvpSourceState | null> {
  try {
    return mvpSourceStateSchema.parse(
      JSON.parse(
        await readFile(path.join(directory, `${sourceId}.state.json`), "utf8"),
      ),
    );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}
// Lock covers both reading the previous receipt and replacing the entire envelope.
export async function persistMvpSourceRun(
  directory: string,
  run: DirectSourceRun,
) {
  if (!Object.hasOwn(MVP_SOURCE_CAPABILITIES, run.source.id))
    throw new Error("unreviewed_mvp_source");
  await mkdir(directory, { recursive: true });
  const target = path.join(directory, `${run.source.id}.state.json`),
    temp = `${target}.${process.pid}.tmp`,
    lockPath = `${target}.lock`;
  const lock = await open(lockPath, "wx", 0o600);
  try {
    const state = mergeDirectSourceState(
      await readMvpSourceState(directory, run.source.id),
      run,
    );
    const handle = await open(temp, "wx", 0o600);
    try {
      await handle.writeFile(JSON.stringify(state, null, 2) + "\n");
      await handle.sync();
    } finally {
      await handle.close();
    }
    mvpSourceStateSchema.parse(JSON.parse(await readFile(temp, "utf8")));
    await rename(temp, target);
    return state;
  } finally {
    await rm(temp, { force: true });
    await lock.close();
    await rm(lockPath, { force: true });
  }
}
