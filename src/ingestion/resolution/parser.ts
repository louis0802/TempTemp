import { z } from "zod";
import { digest } from "./cache";
import { plain } from "./patterns";
export interface ParsedOffer {
  key: string;
  text: string;
  merchant: string;
  title: string;
  benefit: string;
  genuine: boolean;
  nonPromotion: boolean;
  issues: string[];
}
// Fallback can identify exact source spans only. Its output never certifies facts or eligibility.
export const fallbackSchema = z
  .object({
    offers: z
      .array(
        z
          .object({
            text: z.string().min(1).max(50000),
            merchant: z.string().max(150),
            title: z.string().max(250),
          })
          .strict(),
      )
      .min(1)
      .max(100),
    conflicts: z.array(z.string().max(500)).max(100),
  })
  .strict();
export interface OfferExtractionFallback {
  extract(text: string): Promise<unknown>;
}
function extract(
  text: string,
  channel: string,
  key: string,
  dealContext = false,
): ParsedOffer {
  const lines = text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const heading = plain(lines[0] ?? "").replace(/^\d+[.)]\s*/, "");
  const pair = heading.match(/^([^:—]{1,150})\s*[:—]\s*(.+)$/);
  const merchant =
    pair?.[1].trim() ??
    (channel === "tastesoulsg" && heading.length < 65 && !/[?!]/.test(heading)
      ? heading
      : "");
  const title = (
    pair?.[2].trim() ?? plain(lines.find((l) => /^➡/u.test(l)) ?? "")
  ).replace(/^\(https?:\/\/[^\s)]+\)\s*/, "");
  const benefit =
    text.match(
      /(?:up to\s+)?\d{1,3}%\s*off|\$\d+(?:\.\d{1,2})?\s+off|(?:1[ -]for[ -]1|2[ -]for[ -]2)|free\s+[^\n.!]{1,45}/i,
    )?.[0] ??
    (/\bU\.?P\.?\s*\$/i.test(text) ||
    ((dealContext ||
      /\b(?:deal|promo(?:tion)?|special offer)\b/i.test(title)) &&
      /\$\d/.test(title))
      ? title
      : "");
  const genuine = !!benefit;
  const nonPromotion =
    !genuine &&
    /#article\b|(?:new|returning) items|product launch|ordinary menu|regular price/i.test(
      text,
    );
  const issues: string[] = [];
  if (!genuine && !nonPromotion)
    issues.push("promotional_benefit_not_established");
  // Generic linked terms are reader-facing details, not an automatic blocker.
  // Unread media can still contain missing core promotion facts.
  const exportMarker = "[Media attached: verify image/video conditions.]";
  if (text.includes(exportMarker)) issues.push("media_export_marker_present");
  const materialText = text.split(exportMarker).join("");
  if (/media attached|image|poster|pictured|video|photo/i.test(materialText))
    issues.push("linked_or_media_terms_require_verification");
  const nonLocationText = lines.filter((line) => !/^📍/u.test(line)).join("\n");
  if (
    /except|excluding|not valid|not applicable|only at|participating outlets/i.test(
      nonLocationText,
    )
  )
    issues.push("material_qualifier_requires_verification");
  if (
    /delivery/i.test(text) &&
    !/dine[- ]in|in[- ]store|collect|takeaway/i.test(text)
  )
    issues.push("physical_redemption_requires_verification");
  if (!merchant || !title) issues.push("merchant_or_title_unresolved");
  return { key, text, merchant, title, benefit, genuine, nonPromotion, issues };
}
export class PostOfferParser {
  constructor(private fallback?: OfferExtractionFallback) {}
  async parse(text: string, channel: string): Promise<ParsedOffer[]> {
    // Channel signatures and the feed-export media footer are metadata, not the last offer's terms.
    const roundupText = text.replace(
      /\n\s*@([a-zA-Z0-9_]+)\s+\(https:\/\/t\.me\/\1\)(?:[ \t]+(?:#(?:deals|shoutout|article)|exclusive))*[ \t]*(?:\n\[Media attached: verify image\/video conditions\.\])?\s*$/,
      "",
    );
    const numbered = [
      ...roundupText.matchAll(/^\s*(?:\d+[.)]|\d\uFE0F?\u20E3|🔟)\s*/gmu),
    ];
    if (numbered.length >= 2) {
      text = roundupText;
      const prefix = text.slice(0, numbered[0].index);
      // Narrow known editorial context establishes deal intent, never validity or participation.
      const dealContext =
        /^\d+ Best Buffet Deals This [A-Za-z]+\s*\n+\s*Enjoy the best buffet deals with 1-for-1 offers & unbeatable prices:\s*$/i.test(
          plain(prefix),
        );
      // Explicit shared blocks or a footer after a list of single-line offers can be shared.
      const sharedMatch =
        text.match(
          /\n(?:Applies to all offers|Shared terms):\s*\n([\s\S]+)$/i,
        ) ??
        (numbered.slice(0, -1).every(
          (m, i) =>
            !text
              .slice(m.index! + m[0].length, numbered[i + 1].index)
              .trim()
              .includes("\n"),
        )
          ? text.match(/\n([📅📆][^\n]+(?:\n📍[^\n]+)?)\s*$/u)
          : null);
      // Do not reinterpret a last entry's multiline conditions as a shared footer.
      const last = numbered.at(-1)!;
      const footerSafe =
        !!sharedMatch &&
        (/Applies to all offers|Shared terms/i.test(sharedMatch[0]) ||
          !text
            .slice(last.index! + last[0].length, sharedMatch.index)
            .trim()
            .includes("\n"));
      const shared = footerSafe ? sharedMatch![1] : "";
      const end = footerSafe ? sharedMatch!.index! : text.length;
      const offers = numbered
        .filter((m) => m.index! < end)
        .map((m, i) => {
          const section = text
            .slice(
              m.index! + m[0].length,
              Math.min(numbered[i + 1]?.index ?? end, end),
            )
            .trim();
          const offer = extract(
            section + (shared ? "\n" + shared : ""),
            channel,
            `offer-${digest(section).slice(0, 16)}-${i}`,
            dealContext,
          );
          // An unrecognized footer may contain shared material terms; retain it and block review.
          if (/^\s*@[a-zA-Z0-9_]+\b/m.test(text))
            offer.issues.push("roundup_footer_context_requires_verification");
          if (prefix.trim())
            offer.issues.push(
              dealContext
                ? "roundup_promotional_context"
                : "roundup_header_context_requires_verification",
            );
          return offer;
        });
      // A single trailing date after a blank separator and no local dates is safely shared only when marked.
      if (
        !shared &&
        offers.some((o) => !/[📅📆]/u.test(o.text)) &&
        offers.some((o) => /[📅📆]/u.test(o.text))
      ) {
        for (const o of offers)
          o.issues.push("ambiguous_roundup_date_ownership");
      }
      return offers;
    }
    const result = extract(text, channel, "unstructured");
    const dates =
      text.match(
        /(?:now\s*(?:till|until|[-–])\s*\d|\d{1,2}\s*[-–]\s*\d{1,2}\s+[a-z]{3})/gi,
      ) ?? [];
    if (dates.length > 1 || (text.match(/[📅📆]/gu) ?? []).length > 1)
      result.issues.push("requires_split");
    if (
      this.fallback &&
      (result.issues.includes("requires_split") || !result.merchant)
    ) {
      try {
        const fallback = fallbackSchema.parse(
          await this.fallback.extract(text),
        );
        if (fallback.offers.some((o) => !text.includes(o.text)))
          throw new Error("Unanchored fallback text");
        return fallback.offers.map((o) => ({
          ...extract(
            o.text,
            channel,
            `fallback-${digest(o.text).slice(0, 16)}`,
          ),
          merchant: o.merchant,
          title: o.title,
          issues: [
            ...result.issues,
            "llm_extraction_requires_verification",
            ...fallback.conflicts,
          ],
        }));
      } catch {
        result.issues.push("invalid_llm_extraction");
      }
    }
    return [result];
  }
}
