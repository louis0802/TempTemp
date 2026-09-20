import { DateTime } from "luxon";
import { promotionSchema, publicationIssues } from "@/domain/promotion";
import { blockingIssues } from "./issues";
import type { OutletAudit } from "./types";
export class PromotionEligibilityService {
  evaluate(
    input: {
      promotion: unknown;
      genuine: boolean;
      nonPromotion: boolean;
      onlineOnly: boolean;
      issues: string[];
      outletAudit: OutletAudit;
      duplicate?: boolean;
    },
    now: DateTime = DateTime.utc(),
  ) {
    const issues = blockingIssues(input.issues);
    if (!now.isValid) issues.push("invalid_evaluation_time");
    const parsed = promotionSchema.safeParse(input.promotion);
    if (input.duplicate)
      return {
        action: "exclude" as const,
        reasons: ["duplicate_candidate"],
        promotion: null,
      };
    if (input.onlineOnly)
      return {
        action: "exclude" as const,
        reasons: ["online_only_not_for_map"],
        promotion: null,
      };
    if (input.nonPromotion)
      return {
        action: "exclude" as const,
        reasons: ["no_promotional_benefit"],
        promotion: null,
      };
    if (!input.genuine) issues.push("promotional_benefit_not_established");
    if (!parsed.success)
      issues.push(
        ...parsed.error.issues.map(
          (i) => `schema:${i.path.join(".")}:${i.message}`,
        ),
      );
    else {
      const p = parsed.data;
      issues.push(...publicationIssues(p));
      const today = now.setZone("Asia/Singapore").toISODate()!;
      if (
        p.endDate &&
        p.endDate < today &&
        !blockingIssues(input.issues).length
      )
        return {
          action: "exclude" as const,
          reasons: ["expired_promotion"],
          promotion: null,
        };
      if (p.startDate && p.startDate > today) issues.push("future_promotion");
      if (p.endDate && p.endDate < today)
        issues.push("expired_or_conflicting_validity");
      const a = input.outletAudit;
      if (
        p.outlets.length !== a.included.length ||
        p.outlets.some(
          (o) =>
            !a.included.some(
              (b) =>
                b.id === o.id &&
                b.address === o.address &&
                b.lat === o.lat &&
                b.lng === o.lng,
            ),
        )
      )
        issues.push("outlet_audit_mismatch");
    }
    const a = input.outletAudit;
    if (a.scope === "unclear" || a.scope === "online_only")
      issues.push("outlet_scope_unresolved");
    if (!a.scopeEvidence.length) issues.push("missing_scope_evidence");
    if (
      a.scope === "all_outlets" ||
      a.scope === "all_outlets_with_exclusions"
    ) {
      if (
        !a.directoryAudit.authoritative ||
        !a.directoryAudit.fullyTraversed ||
        !a.directorySource.length ||
        (a.directoryAudit.officialCount !== null &&
          a.directoryAudit.officialCount !== a.discoveredOutletCount) ||
        a.discoveredOutletCount !== a.included.length + a.excluded.length ||
        a.excluded.some((outlet) => !outlet.evidence.length)
      )
        issues.push("incomplete_all_outlet_enumeration");
    }
    if (
      !a.complete ||
      !a.included.length ||
      a.eligibleOutletCount !== a.included.length ||
      a.issues.length ||
      a.included.some(
        (o) =>
          !o.participationEvidence.length ||
          !o.existenceEvidence.length ||
          !o.coordinateEvidence.length,
      )
    )
      issues.push("incomplete_outlet_audit", ...a.issues);
    if (issues.length || !parsed.success)
      return {
        action: "unresolved" as const,
        reasons: [...new Set(issues)],
        promotion: null,
      };
    return {
      action: "approve" as const,
      reasons: ["verified_current_promotion_complete_outlet_audit"],
      promotion: { ...parsed.data, status: "published" as const },
    };
  }
}
