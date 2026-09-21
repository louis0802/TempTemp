import { readFileSync } from "node:fs";
import type { MvpPromotion } from "@/domain/mvp";
export const benchmark = JSON.parse(
  readFileSync("tests/corpus/post-pattern-categories.json", "utf8"),
) as {
  candidates: {
    candidateId: string;
    sourceUrl: string;
    candidateKey: string;
    offerStructure: string;
    datePattern: string;
    outletScope: string;
    suggestedMerchant: string;
    suggestedTitle: string;
  }[];
};
const exported = JSON.parse(
  readFileSync("exports/review-inbox-2026-09-16/review-inbox.json", "utf8"),
) as {
  items: {
    candidateId: string;
    suggestedPromotion: { description: string };
    source: { url: string; originalText: string };
  }[];
};
const normalize = (s: string) =>
  s.normalize("NFKC").replace(/\s+/g, " ").trim();
export function conformance(records: MvpPromotion[]) {
  const rows = benchmark.candidates.map((b) => {
    const original = exported.items.find(
      (x) => x.candidateId === b.candidateId,
    );
    if (!original)
      throw new Error(
        `Benchmark candidate missing original source: ${b.candidateId}`,
      );
    const source = records.filter((p) => p.sourceUrl === b.sourceUrl);
    const index = b.candidateKey.match(/-(\d+)$/)?.[1];
    let matched = source.filter((p) =>
      index === undefined ? true : p.parentKey.endsWith(`-${index}`),
    );
    let mapping = "source URL and original section ordinal";
    if (source.every((p) => p.parentKey === "unstructured")) {
      matched = source;
      mapping = "source URL; procedural steps belong to one promotion";
    }
    if (!matched.length)
      matched = source.filter((p) =>
        normalize(original.suggestedPromotion.description).includes(
          normalize(p.description),
        ),
      );
    const differences: string[] = [];
    const expectedExclude = [
      "article_or_nonoffer",
      "launch_or_ordinary_menu",
    ].includes(b.offerStructure);
    if (matched.some((p) => (p.status === "exclude") !== expectedExclude))
      differences.push("offer_disposition");
    const patternMap: Record<string, string[]> = {
      now_to_explicit_end: ["now_to_date"],
      explicit_date_range: ["explicit_range"],
      today_from_post_date: ["today"],
      single_explicit_date_or_event: ["single_explicit_date_or_event", "today"],
      recurring_without_validity_end: ["recurring"],
      no_validity_date: ["none"],
      unknown_expiry: ["unknown_expiry", "now_to_date"],
      now_unknown_end: ["none", "start_only", "unknown_expiry"],
      multiple_date_windows: ["multiple_ranges"],
    };
    if (
      matched.some(
        (p) => !(patternMap[b.datePattern] ?? []).includes(p.datePattern),
      )
    )
      differences.push("date_pattern");
    const expectedScope =
      b.outletScope === "unclear" ||
      b.outletScope === "platform_or_network_scope"
        ? "unspecified"
        : b.outletScope;
    if (matched.some((p) => p.outletScope !== expectedScope))
      differences.push("outlet_scope");
    return {
      candidateId: b.candidateId,
      sourceUrl: b.sourceUrl,
      candidateKey: b.candidateKey,
      mapping,
      runtimeIds: matched.map((p) => p.id),
      expected: {
        offerStructure: b.offerStructure,
        datePattern: b.datePattern,
        outletScope: b.outletScope,
      },
      actual: matched.map((p) => ({
        id: p.id,
        status: p.status,
        genuine: p.genuine,
        datePattern: p.datePattern,
        startDate: p.startDate,
        endDate: p.endDate,
        outletScope: p.outletScope,
        merchant: p.merchant,
        title: p.title,
      })),
      differences,
    };
  });
  const accounted = new Set(rows.flatMap((r) => r.runtimeIds));
  const extra = records
    .filter((p) => !accounted.has(p.id))
    .map((p) => ({
      id: p.id,
      sourceUrl: p.sourceUrl,
      description: p.description,
      reason:
        p.sourceUrl === "https://t.me/sgfooddeals/4917" &&
        p.parentKey.endsWith("-9")
          ? "Original 🔟 tenth section was merged into benchmark ninth candidate; parser correctly retains its own child."
          : "UNEXPLAINED",
    }));
  return {
    candidateCount: rows.length,
    runtimeCount: records.length,
    unmatched: rows.filter((r) => !r.runtimeIds.length),
    extra,
    rows,
  };
}
