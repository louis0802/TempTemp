import type { DatePattern, ScopeResolution } from "./types";
export const plain = (text: string) =>
  text.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "").trim();
export class PatternClassifier {
  date(text: string): DatePattern {
    const s = plain(text);
    if (/^\d{4}-\d{2}-\d{2}\s*(?:to|[–—])\s*\d{4}-\d{2}-\d{2}$/.test(s))
      return "explicit_range";
    if (
      (
        s.match(
          /\b(?:now\s*(?:till|until|to|[-–—])|\d{1,2}\s*(?:[a-z]{3,9}\s*)?[-–—]\s*\d)/gi,
        ) ?? []
      ).length > 1
    )
      return "multiple_ranges";
    if (/^today(?: only)?[.!]?$/i.test(s)) return "today";
    if (/^now\s*(?:till|until|to|[-–—])/i.test(s)) return "now_to_date";
    if (/\d\s*(?:[a-z]{3,9}(?:\s+20\d\d)?\s*)?(?:[-–—]|to)\s*\d/i.test(s))
      return "explicit_range";
    if (
      /weekdays|every\s+(?:mon|tue|wed|thu|fri|sat|sun)|mon(?:day)?\s*[-–]\s*fri/i.test(
        s,
      )
    )
      return "recurring";
    if (/^(?:from|starts?)\b/i.test(s)) return "start_only";
    if (
      /limited time|ongoing|end date unspecified|from now|expiry unknown/i.test(
        s,
      )
    )
      return "unknown_expiry";
    return "none";
  }
}
export class OutletScopeResolver {
  resolve(text: string): ScopeResolution {
    const lines = text.split("\n").filter((l) => /^\s*📍/u.test(l));
    const raw = lines.length ? lines.map(plain).join("; ") : text.trim();
    const result: ScopeResolution = {
      scope: "unclear",
      raw,
      names: [],
      exclusions: [],
    };
    if (/^all outlets\s*$/i.test(raw)) result.scope = "all_outlets";
    else if (/^all outlets\s+(?:excl\.?|except|excluding)\s+/i.test(raw)) {
      result.scope = "all_outlets_with_exclusions";
      result.exclusions = raw
        .replace(/^all outlets\s+(?:excl\.?|except|excluding)\s+/i, "")
        .split(/\s*[,;&]\s*|\s+and\s+/i)
        .map((name) => name.trim())
        .filter(Boolean);
    } else if (/^selected outlets\b/i.test(raw))
      result.scope = "selected_outlets";
    else if (/^(?:online(?: only)?|delivery only)$/i.test(raw)) {
      if (
        !/walk[- ]in|collect(?:ion)?|booths?|dine[- ]in|in[- ]store|physical/i.test(
          text,
        )
      )
        result.scope = "online_only";
    } else if (
      raw &&
      !/\ball\b|outlets|online|app\b|islandwide|tbc|unknown|unclear|see |https?:/i.test(
        raw,
      ) &&
      (lines.length || /city|mall|point|#|\d/i.test(raw))
    ) {
      result.scope = "named_outlets";
      result.names = raw
        .split(/\s*[;&]\s*|,\s*(?!\s|#?\d|#?B\d)/i)
        .filter(Boolean);
    }
    return result;
  }
}
