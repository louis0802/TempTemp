import { DateTime } from "luxon";
import { blockingIssues, issueAudit } from "./issues";
import { positiveDays } from "../cleanup";
import { DateResolver } from "./dates";
import { OutletScopeResolver } from "./patterns";
import { PostOfferParser } from "./parser";
import { PromotionParticipationResolver } from "./outlets";
import { PromotionEligibilityService } from "./eligibility";
import { ResolutionCache, digest } from "./cache";
import { GenkiOutletProvider } from "./directory";
import { GoogleOutletDiscovery } from "./google-discovery";
import { ApiPlaceResolver } from "./places";
import type { OutletAudit, ProcessingResult, SourcePost } from "./types";
/** Stable source/offer identity; physical outlet identity remains independent. */
function suggestionIdentity(post: SourcePost, key: string) {
  const hash = digest([post.url, digest(post.text), key]);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-8${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
export class PromotionPipeline {
  constructor(
    private outlets: PromotionParticipationResolver,
    private parser = new PostOfferParser(),
  ) {}
  async process(
    post: SourcePost,
    now: DateTime = DateTime.utc(),
  ): Promise<ProcessingResult[]> {
    const offers = await this.parser.parse(post.text, post.channel),
      results: ProcessingResult[] = [],
      seen = new Set<string>();
    for (const offer of offers) {
      const date = new DateResolver().resolve(offer.text, post.publishedAt);
      const scope = new OutletScopeResolver().resolve(
        offer.text.split("\n").some((l) => /^\s*📍/u.test(l)) ? offer.text : "",
      );
      const checkedAt = now.toUTC().toISO()!;
      const evidence = {
        url: post.url,
        checkedAt,
        sourceHash: digest(post.text),
        summary: `Source participation statement: ${scope.raw}`,
      };
      const issues = [...offer.issues, ...date.issues];
      const category =
        /sushi|sashimi|meal|burger|pizza|buffet|restaurant|chicken|steak|wrap|taco/i.test(
          offer.text,
        )
          ? "Meals"
          : /ice cream|dessert|cake|yogurt|froyo/i.test(offer.text)
            ? "Desserts"
            : /coffee|tea|drink/i.test(offer.text)
              ? "Drinks"
              : null;
      if (!category) issues.push("category_unresolved");
      const holiday =
        /(?:excl\.?|excluding|except).*\b(?:PH|public holidays)\b/i.test(
          offer.text,
        );
      if (holiday) issues.push("holiday_calendar_requires_verification");
      const today = now.setZone("Asia/Singapore").toISODate()!;
      const expired =
        !!date.endDate &&
        date.endDate < today &&
        !date.issues.length &&
        !offer.issues.includes("requires_split") &&
        !offer.issues.includes("ambiguous_roundup_date_ownership");
      const duplicateKey = digest([
        offer.merchant.toLowerCase(),
        offer.title.toLowerCase(),
        offer.text.trim(),
        date.startDate,
        date.endDate,
      ]);
      const duplicate = seen.has(duplicateKey);
      seen.add(duplicateKey);
      let audit: OutletAudit = {
        scope: scope.scope,
        scopeEvidence: [evidence],
        directorySource: [],
        directoryAudit: {
          authoritative: false,
          fullyTraversed: false,
          officialCount: null,
        },
        discoveredOutletCount: 0,
        eligibleOutletCount: 0,
        included: [],
        excluded: [],
        issues: ["outlet_resolution_not_attempted"],
        complete: false,
      };
      // Resolve outlets independently of missing terms, so reviewers can reuse the audit.
      // Ambiguous offer ownership cannot supply trustworthy participation context.
      if (
        !expired &&
        !duplicate &&
        !offer.nonPromotion &&
        scope.scope !== "online_only" &&
        !!offer.merchant &&
        !offer.issues.some((issue) =>
          [
            "requires_split",
            "ambiguous_roundup_date_ownership",
            "roundup_header_context_requires_verification",
            "llm_extraction_requires_verification",
            "material_qualifier_requires_verification",
          ].includes(issue),
        ) &&
        !date.issues.includes("requires_split")
      )
        audit = await this.outlets.resolve(offer.merchant, scope, evidence);
      const suggestion = {
        id: suggestionIdentity(post, offer.key),
        merchant: offer.merchant,
        title: offer.title,
        category,
        benefit: offer.benefit,
        description: offer.text,
        terms: [offer.text],
        startDate: date.startDate,
        endDate: date.endDate,
        weekdays: date.weekdays,
        hours: date.hours,
        redemptionCutoff: date.redemptionCutoff,
        scheduleLabel: date.redemptionCutoff
          ? `Till ${date.redemptionCutoff}; ${date.hours ? `${date.hours.start}–${date.hours.end}` : "check opening/redemption start time"}`
          : date.hours
            ? `${date.hours.start}–${date.hours.end}`
            : "Check redemption hours; see source restrictions",
        excludePublicHolidays: holiday,
        holidayDates: [],
        holidayCalendarThrough: null,
        outlets: audit.included.map((o) => ({
          id: o.id,
          name: o.name,
          address: o.address,
          lat: o.lat,
          lng: o.lng,
          verifiedAt: o.verifiedAt,
          evidence: [
            ...o.participationEvidence.map(
              (e) => `Participation: ${e.summary} ${e.url}`,
            ),
            ...o.existenceEvidence.map(
              (e) => `Existence: ${e.summary} ${e.url}`,
            ),
            ...o.coordinateEvidence.map(
              (e) =>
                `Coordinates (${o.coordinatePrecision}): ${e.summary} ${e.url}`,
            ),
          ].join("\n"),
        })),
        sources: [{ label: post.label, url: post.url }],
        verifiedAt: blockingIssues(issues).length ? null : checkedAt,
        reviewDueAt: date.endDate
          ? null
          : now
              .plus({
                days: positiveDays(process.env.UNKNOWN_EXPIRY_REVIEW_DAYS, 7),
              })
              .toUTC()
              .toISO(),
        status: "needs_review",
        revision: 1,
      };
      const decision = expired
        ? {
            action: "exclude" as const,
            reasons: ["expired_promotion"],
            promotion: null,
          }
        : new PromotionEligibilityService().evaluate(
            {
              promotion: suggestion,
              genuine: offer.genuine,
              nonPromotion: offer.nonPromotion,
              onlineOnly: scope.scope === "online_only",
              issues,
              outletAudit: audit,
              duplicate,
            },
            now,
          );
      results.push({
        key: offer.key,
        ...decision,
        suggestion,
        audit: {
          version: 1,
          processedAt: checkedAt,
          sourceHash: digest(post.text),
          issues: issueAudit([...issues, ...audit.issues]),
          dateResolution: date,
          outletResolution: audit,
          requiresSplit: issues.includes("requires_split")
            ? {
                reason:
                  "Branch/product periods cannot share a single promotion.",
                sourceText: offer.text,
              }
            : null,
          classification: decision.action,
          reasons: decision.reasons,
        },
      });
    }
    return results;
  }
}
const cache = new ResolutionCache();
export function defaultPromotionPipeline() {
  return new PromotionPipeline(
    new PromotionParticipationResolver(
      [new GenkiOutletProvider(cache)],
      new ApiPlaceResolver(cache, {
        googleKey: process.env.GOOGLE_PLACES_API_KEY,
        oneMapToken: process.env.ONEMAP_TOKEN,
      }),
      undefined,
      new GoogleOutletDiscovery(cache, process.env.GOOGLE_PLACES_API_KEY),
    ),
  );
}
