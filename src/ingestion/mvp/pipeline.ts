import { mvpContent } from "./content";
import { DateTime } from "luxon";
import {
  lifecycle,
  mvpPromotionSchema,
  mvpOutletSchema,
  type MvpPromotion,
} from "@/domain/mvp";
import { digest } from "../resolution/cache";
import { DateResolver } from "../resolution/dates";
import { PostOfferParser, type ParsedOffer } from "../resolution/parser";
import { OutletScopeResolver, plain } from "../resolution/patterns";
import type { OutletDiscovery, SourcePost } from "../resolution/types";
export function stableId(value: string) {
  const h = digest(value);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
/** Split only repeated, self-contained benefit/date blocks; never assign products to campaign waves by guessing. */
function windows(offer: ParsedOffer): ParsedOffer[] {
  const dateLines = offer.text.split("\n").filter((l) => /^\s*[📅📆]/u.test(l));
  const labelled = dateLines.map((l) =>
    plain(l)
      .replace(/\(https?:\/\/[^)]+\)\s*/g, "")
      .match(/^([^:]+):\s*((?:Now|\d)[^\n]+)$/i),
  );
  if (
    dateLines.length > 1 &&
    labelled.every((m) => m && !/\d(?:[.:]\d+)?\s*(?:AM|PM)/i.test(m[2]))
  ) {
    const base = offer.text
      .split("\n")
      .filter((l) => !dateLines.includes(l))
      .join("\n");
    return labelled.map((m, i) => ({
      ...offer,
      key: `${offer.key}-window-${i}`,
      title: `${offer.title} — ${m![1]}`,
      text: `${base}\n📅 ${m![2]}${!/📍/u.test(base) ? `\n📍 ${m![1]}` : ""}`,
    }));
  }
  const pairs = [...offer.text.matchAll(/^[📅📆]([^\n]+)\n\s*📍([^\n]+)/gmu)];
  if (pairs.length > 1 && pairs.length === dateLines.length) {
    let base = offer.text;
    for (const pair of pairs) base = base.replace(pair[0], "");
    return pairs.map((m, i) => ({
      ...offer,
      key: `${offer.key}-window-${i}`,
      text: `${base.trim()}\n📅 ${m[1].trim()}\n📍 ${m[2].trim()}`,
    }));
  }
  if (dateLines.length === 1) {
    const restriction = plain(dateLines[0]).match(/\s*\(([^)]*)\)\s*$/)?.[1];
    const d = plain(dateLines[0]).replace(/\s*\([^)]*\)\s*$/, ""),
      groups = d.split(/\s*\|\s*/);
    const dates = groups.flatMap((g) => {
      const m = g.match(/^(\d{1,2}(?:\s*[,&]\s*\d{1,2})*)\s+([A-Za-z]{3,9})$/);
      return m ? m[1].split(/\s*[,&]\s*/).map((day) => `${day} ${m[2]}`) : [];
    });
    if (
      dates.length > 1 &&
      groups.every((g) =>
        /^\d{1,2}(?:\s*[,&]\s*\d{1,2})*\s+[A-Za-z]{3,9}$/.test(g),
      )
    )
      return dates.map((d, i) => ({
        ...offer,
        key: `${offer.key}-window-${i}`,
        text: offer.text.replace(
          dateLines[0],
          `📅 ${d}${restriction ? `\nDate restriction: ${restriction}` : ""}`,
        ),
      }));
  }
  const starts = [...offer.text.matchAll(/^➡[^\n]+/gmu)];
  if (starts.length < 2) return [offer];
  const blocks = starts.map((m, i) =>
    offer.text.slice(m.index, starts[i + 1]?.index).trim(),
  );
  if (
    !blocks.every(
      (b) =>
        (b.match(/[📅📆]/gu) ?? []).length === 1 &&
        /\d+%\s*off|\$\d+\s*off|[12][ -]for[ -][12]|\bfree\b/i.test(b),
    )
  )
    return [offer];
  const heading = offer.text.slice(0, starts[0].index).trim();
  return blocks.map((b, i) => ({
    ...offer,
    key: `${offer.key}-window-${i}`,
    text: `${heading}\n${b}`,
    title: plain(b.split("\n")[0]),
    benefit: plain(b.split("\n")[0]),
    issues: offer.issues.filter((x) => x !== "requires_split"),
  }));
}
export function mvpDates(text: string, publishedAt: string) {
  const resolver = new DateResolver();
  if (!text.split("\n").some((l) => /^\s*[📅📆]/u.test(l))) {
    text = text
      .split("\n")
      .map((line) =>
        /^(?:Today(?: only)?[.!]?|Now\s*(?:-|–|until|till|to)\s*\d{1,2}\s+[A-Za-z]+(?:\s+20\d{2})?|(?:Valid (?:only )?on\s+)?\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[A-Za-z]*(?:\s+20\d{2})?(?:\s*[-–]\s*\d{1,2}\s+[A-Za-z]+(?:\s+20\d{2})?)?)$/i.test(
          line.trim(),
        )
          ? `📅 ${line.trim()}`
          : line,
      )
      .join("\n");
  }
  // Bounded recurrence retains weekday restrictions while presenting campaign bounds to the existing date parser.
  let normalized = text.replace(
    /(^\s*[📅📆]?\s*)Every (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s*(\d[^\n]+)/gimu,
    "$1$3\nEvery $2",
  );
  const lines = normalized.split("\n").filter((l) => /^\s*[📅📆]/u.test(l));
  const candidate = plain(lines.length === 1 ? lines[0] : normalized).replace(
    /\s*\((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:day)?\)\s*$/i,
    "",
  );
  const single = candidate.match(
    /^(?:valid (?:on|only on)\s+)?(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)(?:\s+(20\d{2}))?(?:\s+only)?[.!]?$/i,
  );
  if (single) {
    const range = `${single[1]} ${single[2]}${single[3] ? " " + single[3] : ""} - ${single[1]} ${single[2]}${single[3] ? " " + single[3] : ""}`;
    normalized = lines.length
      ? normalized.replace(lines[0], `📅 ${range}`)
      : `📅 ${range}`;
  }
  const original = resolver.resolve(normalized, publishedAt);
  const calendarLines = normalized
    .split("\n")
    .filter((l) => /^\s*[📅📆]/u.test(l));
  const result = calendarLines.length
    ? {
        ...resolver.resolve(calendarLines.join("\n"), publishedAt),
        weekdays: original.weekdays,
        hours: original.hours,
        redemptionCutoff: original.redemptionCutoff,
      }
    : original;
  const outside = text
    .split("\n")
    .filter((l) => !/^\s*[📅📆]/u.test(l))
    .join("\n");
  if (
    calendarLines.length &&
    /(?:until|till|valid through|ends on)\s+\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(
      outside,
    )
  )
    result.issues.push("additional_date_claim_requires_verification");
  return {
    ...result,
    pattern: single ? "single_explicit_date_or_event" : result.pattern,
  };
}
export class MvpPipeline {
  private parser = new PostOfferParser();
  constructor(private discovery: OutletDiscovery) {}
  async process(
    source: SourcePost,
    now: DateTime = DateTime.now(),
  ): Promise<MvpPromotion[]> {
    const output: MvpPromotion[] = [];
    let text = /To redeem, simply:/i.test(source.text)
      ? source.text.replace(/^(?:[1-9]️⃣|\d+[.)])\s*/gmu, "• ")
      : source.text;
    text = text.replace(
      /([📅📆]\s*)Today,\s*(\d)/giu,
      (_m, prefix, digit) =>
        `${prefix}${DateTime.fromISO(source.publishedAt).setZone("Asia/Singapore").day}, ${digit}`,
    );
    const parents = await this.parser.parse(text, source.channel);
    const shared = text.match(/\n([📅📆][^\n]+)\s*\n/gu);
    const numbered = text
      .split("\n")
      .filter((l) => /^\s*(?:[1-9]️⃣|🔟|\d+[.)])/.test(l));
    if (
      parents.length > 1 &&
      numbered.length === parents.length &&
      parents.slice(0, -1).every((p) => !p.text.includes("\n")) &&
      shared?.length === 1
    ) {
      const sharedDate = shared[0].trim();
      for (const parent of parents)
        if (!/[📅📆]/u.test(parent.text)) parent.text += `\n${sharedDate}`;
    }
    for (const parent of parents)
      for (const rawOffer of windows(parent)) {
        const offer = mvpContent(rawOffer);
        const dates = mvpDates(offer.text, source.publishedAt);
        let scope = new OutletScopeResolver().resolve(
          offer.text.split("\n").some((l) => /^\s*📍/u.test(l))
            ? offer.text.replace(/Selec ted outlets/gi, "Selected outlets")
            : "",
        );
        const only = offer.text.match(
          /(?:only at|valid only at)\s+([^\n.!]+)/i,
        );
        if (only)
          scope = {
            scope: "named_outlets",
            raw: only[1],
            names: only[1].split(/\s+and\s+|\s*&\s*/i),
            exclusions: [],
          };
        const location = offer.text.split("\n").find((l) => /^\s*📍/u.test(l));
        if (
          location &&
          /outlets? only\s*$/i.test(location) &&
          !/selected|all|online/i.test(location)
        )
          scope = {
            scope: "named_outlets",
            raw: location,
            names: plain(location)
              .replace(/outlets? only\s*$/i, "")
              .split(/\s*&\s*/)
              .map((s) => s.trim()),
            exclusions: [],
          };
        if (/Food Delivery Promo Codes/i.test(source.text))
          scope = {
            scope: "online_only",
            raw: "Food delivery promotion codes",
            names: [],
            exclusions: [],
          };
        if (/Grab Dine Out/i.test(offer.text)) {
          scope = {
            scope: "unclear",
            raw: scope.raw,
            names: [],
            exclusions: [],
          };
          offer.merchant = "";
        }
        const named = scope.scope === "named_outlets";
        const p: MvpPromotion = {
          id: stableId(`${source.url}:${offer.key}`),
          sourceUrl: source.url,
          offerKey: offer.key,
          parentKey: parent.key,
          merchant: offer.merchant,
          title: offer.title,
          benefit: offer.benefit,
          description: offer.text,
          startDate: dates.startDate,
          endDate: dates.endDate,
          weekdays: dates.weekdays,
          hours: dates.hours,
          redemptionCutoff: dates.redemptionCutoff,
          outletScope: scope.scope === "unclear" ? "unspecified" : scope.scope,
          mapCoverageBasis: named
            ? "source_named_outlets"
            : "google_merchant_locations",
          outlets: [],
          status: "needs_location",
          lifecycle: lifecycle(dates.startDate, dates.endDate, now),
          reasons: [],
          datePattern: dates.pattern,
          genuine: true,
          contentStatus: "resolved",
          validityStatus: "resolved",
          mapStatus:
            scope.scope === "online_only" ? "online_only" : "needs_location",
        };
        if (
          !offer.merchant ||
          !offer.title ||
          !offer.benefit ||
          /\[Unsupported/i.test(offer.text)
        ) {
          p.contentStatus = "needs_content_resolution";
          p.reasons.push(
            ...(!offer.merchant ? ["merchant_unresolved"] : []),
            ...(!offer.title ? ["title_unresolved"] : []),
            ...(!offer.benefit ? ["offer_proposition_unresolved"] : []),
            ...(/\[Unsupported/i.test(offer.text)
              ? ["unsupported_source_text"]
              : []),
          );
        }
        if (
          !dates.startDate ||
          !dates.endDate ||
          dates.issues.some((i) =>
            /requires_split|ambiguous|conflicting_dates|invalid_date|additional_date/.test(
              i,
            ),
          )
        ) {
          p.validityStatus = "needs_validity";
          p.reasons.push(
            ...(dates.issues.length
              ? dates.issues
              : ["unknown_expiry_or_start"]),
          );
        }
        if (
          p.contentStatus === "resolved" &&
          p.validityStatus === "resolved" &&
          p.mapStatus !== "online_only"
        ) {
          try {
            const snapshot = await this.discovery.discover(
              offer.merchant,
              named
                ? scope.names.flatMap((n) => n.split(/\s*\|\s*/))
                : undefined,
            );
            const outlets = new Map<string, MvpPromotion["outlets"][number]>();
            for (const b of snapshot.branches) {
              const r = b.resolvedPlace;
              const parsed = mvpOutletSchema.safeParse({
                googlePlaceId: r?.placeId,
                name: b.name,
                address: r?.address,
                latitude: r?.lat,
                longitude: r?.lng,
                businessStatus: r?.businessStatus,
              });
              if (b.status === "operating" && parsed.success)
                outlets.set(parsed.data.googlePlaceId, parsed.data);
            }
            p.outlets = [...outlets.values()].sort((a, b) =>
              a.googlePlaceId.localeCompare(b.googlePlaceId),
            );
            p.mapStatus = p.outlets.length ? "ready" : "needs_location";
            p.reasons = p.outlets.length
              ? []
              : [
                  ...snapshot.issues.filter(
                    (i) => i !== "google_search_not_authoritative_enumeration",
                  ),
                  "no_operational_google_location",
                ];
          } catch (error) {
            p.reasons = [
              error instanceof Error ? error.message : "google_search_failed",
            ];
          }
        }
        p.status =
          p.contentStatus !== "resolved"
            ? "needs_content_resolution"
            : p.validityStatus !== "resolved"
              ? "needs_validity"
              : p.mapStatus === "needs_location"
                ? "needs_location"
                : "ready";
        output.push(mvpPromotionSchema.parse(p));
      }
    return output;
  }
}
