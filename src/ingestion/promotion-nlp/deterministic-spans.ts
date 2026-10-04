import type { EvidenceV4 } from "./schema-v4";

/** Offline literal inventory. No semantic kinds, benchmark access, or transport. */
export function deterministicSpans(source: string): EvidenceV4[] {
  const spans = new Set<string>();
  const add = (start: number, end: number) => {
    const quote = source.slice(start, end).trim();
    if (quote) spans.add(quote);
  };
  const boundaries = [0];
  // Decimal prices, abbreviations, range dashes and hyphenated words stay intact.
  for (const m of source.matchAll(/\n+|[!?](?=\s|$)|\.(?=\s+[A-Z]|$)|;/g)) {
    const at = m.index;
    if (
      m[0] === "." &&
      /(?:\bU\.P|\bp\.m|\ba\.m)$/i.test(source.slice(Math.max(0, at - 6), at))
    )
      continue;
    boundaries.push(at + m[0].length);
  }
  boundaries.push(source.length);
  const chunks: [number, number][] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const a = boundaries[i],
      b = boundaries[i + 1];
    // Bounded windows retain overlap at spaces if a captured paragraph has no punctuation.
    if (b - a <= 650) chunks.push([a, b]);
    else {
      let start = a;
      while (start < b) {
        let end = Math.min(start + 600, b);
        if (end < b) {
          const space = source.lastIndexOf(" ", end);
          if (space > start + 350) end = space;
        }
        chunks.push([start, end]);
        if (end === b) break;
        const overlap = source.indexOf(" ", Math.max(start + 1, end - 180));
        start = overlap >= 0 && overlap < end ? overlap + 1 : end;
      }
    }
  }
  for (const [a, b] of chunks) {
    add(a, b);
    // Smaller units supplement, never replace, their operator-preserving enclosing span.
    const text = source.slice(a, b);
    const cuts = [a];
    for (const m of text.matchAll(/\s[-—]\s|:\s|[•\n]/g)) {
      const before = text.slice(Math.max(0, m.index - 30), m.index);
      const after = text.slice(
        m.index + m[0].length,
        m.index + m[0].length + 25,
      );
      const range =
        /\d\s*(?:am|pm|hrs|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)?\s*$/i.test(
          before,
        ) && /^\d/.test(after);
      // A colon in a clock is excluded by the regex. Exclusions retain the whole list.
      if (!range && !/not available|exclud|not valid/i.test(text))
        cuts.push(a + m.index + m[0].length);
    }
    cuts.push(b);
    for (let i = 0; i < cuts.length - 1; i++) add(cuts[i], cuts[i + 1]);
    for (const m of text.matchAll(/\([^()]{1,220}\)/g)) {
      // Parenthetical material retains its literal enclosure; enclosing sentence always survives.
      add(a + m.index, a + m.index + m[0].length);
    }
  }
  // Adjacent sentence context helps group headers without making a full-source mega-node.
  for (let i = 0; i < chunks.length - 1; i++) {
    const [a] = chunks[i],
      [, b] = chunks[i + 1];
    if (b - a <= 650) add(a, b);
  }
  if (spans.size > 200) throw new Error(`span_cap_exceeded:${spans.size}`);
  return [...spans]
    .sort(
      (a, b) =>
        source.indexOf(a) - source.indexOf(b) ||
        a.length - b.length ||
        a.localeCompare(b),
    )
    .map((quote, i) => ({
      id: `e${String(i + 1).padStart(3, "0")}`,
      quote,
      kind: "other",
    }));
}
