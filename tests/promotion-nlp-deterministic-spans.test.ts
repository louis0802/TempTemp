import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { deterministicSpans } from "../src/ingestion/promotion-nlp/deterministic-spans";
import {
  benchmarkSchemaV4,
  spanCoverage,
} from "../src/ingestion/promotion-nlp/oracle-ablation";
const b = benchmarkSchemaV4.parse(
  JSON.parse(
    readFileSync("tests/fixtures/promotion-nlp/benchmark-v4.json", "utf8"),
  ),
);
describe("offline deterministic span baseline", () => {
  it("all spans are exact contiguous literals, deduped, opaque, <=200 and other", () => {
    for (const c of b.cases) {
      const es = deterministicSpans(c.sourceText);
      expect(es.length).toBeLessThanOrEqual(200);
      expect(new Set(es.map((e) => e.quote)).size).toBe(es.length);
      for (const e of es) {
        expect(c.sourceText.includes(e.quote)).toBe(true);
        expect(e.id).toMatch(/^e\d{3}$/);
        expect(e.kind).toBe("other");
      }
    }
  });
  it.each([
    "Opening to 5PM",
    "From $13.90",
    "Save up to 26%",
    "1 – 31 Oct 2026",
    "2 PM – 5 PM",
    "10:30am - 5:30pm",
    "not available via Delivery nor at the following locations: Mandai Wildlife East, Lido, Gardens by the Bay and Changi Airport (Jewel, T2, T2 Transit, T3).",
  ])("retains operator/context %s", (s) => {
    const es = deterministicSpans(s);
    expect(es.some((e) => e.quote === s)).toBe(true);
    if (s === "Opening to 5PM") expect(es.map((e) => e.quote)).toEqual([s]);
  });
  it("does not split decimal money into endpoints", () => {
    expect(
      deterministicSpans("From $13.90. Up to 26% off.").some(
        (e) => e.quote === "From $13.90.",
      ),
    ).toBe(true);
  });
  it("covers Flash this page and Takeaway only", () => {
    const s =
      "Flash this page to enjoy 20% OFF All Regular Items - Takeaway only!";
    for (const q of ["Flash this page", "Takeaway only"])
      expect(deterministicSpans(s).some((e) => e.quote.includes(q))).toBe(true);
  });
  it("deterministically reproduces every source", () => {
    for (const c of b.cases)
      expect(deterministicSpans(c.sourceText)).toEqual(
        deterministicSpans(c.sourceText),
      );
  });
  it("fails closed above cap", () =>
    expect(() =>
      deterministicSpans(
        Array.from({ length: 220 }, (_, i) => `Clause number ${i}!`).join("\n"),
      ),
    ).toThrow("span_cap_exceeded"));
  it("no network/model/dependency access", () => {
    const code = readFileSync(
      "src/ingestion/promotion-nlp/deterministic-spans.ts",
      "utf8",
    );
    expect(code).not.toMatch(
      /fetch\(|https?:|openai|readFile|spawn|provider|from ["\'][^"\']*benchmark/,
    );
  });
  it("reports fixed literal denominators", () => {
    const c = spanCoverage(b.cases);
    expect(c.literal.denominator).toBe(350);
    expect(c.anchors.denominator).toBe(59);
    expect(c.maxSpans).toBeLessThanOrEqual(200);
  });
});
