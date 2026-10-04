import { createHash } from "node:crypto";
import type { DirectEvidence, EvidenceRelation, SourceId } from "./types";
export const contentHash = (body: string | Uint8Array) =>
  createHash("sha256").update(body).digest("hex");
export function candidateId(
  sourceId: SourceId,
  canonicalUrl: string,
  nativeId: string | null = null,
) {
  return `direct_${contentHash(JSON.stringify([1, sourceId, canonicalUrl, nativeId]))}`;
}
export function makeEvidence(
  sourceId: SourceId,
  requestedUrl: string,
  url: string,
  relation: EvidenceRelation,
  body: Buffer,
  contentType: string,
  httpStatus: number,
  fetchedAt: string,
): DirectEvidence {
  const hash = contentHash(body);
  return {
    id: contentHash(JSON.stringify([sourceId, url, relation, hash])),
    sourceId,
    requestedUrl,
    url,
    relation,
    fetchedAt,
    contentHash: hash,
    contentType,
    httpStatus,
    notes: [],
  };
}
