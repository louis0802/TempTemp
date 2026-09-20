import { readFileSync } from "node:fs";
import { DateTime } from "luxon";
import { PromotionPipeline } from "@/ingestion/resolution/pipeline";
import { PromotionParticipationResolver } from "@/ingestion/resolution/outlets";
import { parseGenkiDirectory } from "@/ingestion/resolution/directory";
import type {
  Evidence,
  MerchantBranch,
  SourcePost,
  DirectorySnapshot,
} from "@/ingestion/resolution/types";

export const inbox = JSON.parse(
  readFileSync("exports/review-inbox-2026-09-16/review-inbox.json", "utf8"),
) as {
  items: { source: SourcePost & { originalText: string } }[];
};
export function source(url: string): SourcePost {
  const item = inbox.items.find((item) => item.source.url === url);
  if (!item) throw new Error(`Missing original source ${url}`);
  const { originalText, publishedAt, label, channel } = item.source;
  return { url, text: originalText, publishedAt, label, channel };
}
export const fixtureEvidence: Evidence = {
  url: "https://fixture.example.test/directory",
  summary:
    "CONTROLLED TEST EVIDENCE ONLY; not production merchant verification",
  checkedAt: "2026-09-14T12:00:00Z",
};
export function fixtureBranch(
  name: string,
  address = `${name}, Singapore 123456`,
): MerchantBranch {
  return {
    name,
    address,
    postalCode: "123456",
    unit: "",
    status: "operating",
    existenceEvidence: [fixtureEvidence],
  };
}
export function controlledPipeline(
  branches = [fixtureBranch("Test branch")],
  authoritative = true,
) {
  const snapshot: DirectorySnapshot = {
    branches,
    authoritative,
    fullyTraversed: authoritative,
    pages: [fixtureEvidence],
    officialCount: branches.length,
    issues: [],
  };
  const places = {
    resolve: async (_merchant: string, branch: MerchantBranch) => ({
      address: branch.address,
      lat: 1.3,
      lng: 103.85,
      coordinatePrecision: "building" as const,
      coordinateEvidence: [fixtureEvidence],
    }),
  };
  return new PromotionPipeline(
    new PromotionParticipationResolver(
      authoritative
        ? [{ supports: () => true, getSingaporeBranches: async () => snapshot }]
        : [],
      places,
      undefined,
      authoritative ? undefined : { discover: async () => snapshot },
    ),
  );
}
/** Captured Genki locator only; coordinates and unsupported merchant coverage are not invented. */
export function conservativePipeline() {
  return new PromotionPipeline(
    new PromotionParticipationResolver(
      [
        {
          supports: (merchant) => /^genki sushi$/i.test(merchant),
          getSingaporeBranches: async () =>
            parseGenkiDirectory(
              readFileSync(
                "tests/fixtures/resolution/genki-locator.html",
                "utf8",
              ),
              fixtureEvidence,
            ),
        },
      ],
      {
        resolve: async () => {
          throw new Error("No verified coordinates in corpus fixtures");
        },
      },
    ),
  );
}
export const goldenNow = DateTime.fromISO("2026-09-14T12:00:00Z");
export const syntheticGenki: SourcePost = {
  text: "Genki Sushi: 50% off sushi\n📅 Now - 30 Sep\n📍 All outlets\nMembers only.",
  url: "https://t.me/tastesoulsg/99999",
  channel: "tastesoulsg",
  label: "Synthetic test control",
  publishedAt: "2026-09-14T10:00:00Z",
};
