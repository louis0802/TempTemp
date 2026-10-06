import { DateTime } from "luxon";
import type { Listing } from "@/domain/promotion";

const singaporeZone = "Asia/Singapore";

function observedDate(value: string | null | undefined) {
  if (!value) return "Unknown";
  const date = DateTime.fromISO(value, { setZone: true }).setZone(
    singaporeZone,
  );
  return date.isValid ? date.toFormat("d LLL yyyy") : "Unknown";
}

function scope(
  rule: NonNullable<Listing["mvpOfferPolicy"]>["scheduleRules"][number],
) {
  return [
    rule.weekdays?.length
      ? rule.weekdays
          .map(
            (day) => ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][day - 1],
          )
          .join(", ")
      : null,
    rule.outletNames.length
      ? `Locations: ${rule.outletNames.join(", ")}`
      : null,
    ...rule.conditions,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function OfferPolicyDetails({
  listing,
  showSourceText = false,
}: {
  listing: Listing;
  showSourceText?: boolean;
}) {
  const policy = listing.mvpOfferPolicy;
  if (!policy) return null;

  const sourceUrl = listing.sources[0]?.url;
  const mayShowSourceText =
    policy.sourceTextPolicy === "official_public" ||
    (policy.sourceTextPolicy === "telegram_private" && showSourceText);
  const scheduleLabel =
    policy.scheduleState === "Within listed offer hours" ||
    policy.scheduleState === "Outside listed offer hours"
      ? policy.scheduleState
      : "Check source";

  return (
    <section className="detail-schedule" aria-label="Offer details">
      <p>{policy.summary}</p>
      <span>
        Last seen on source:{" "}
        {observedDate(policy.sourceObservation?.lastSeenOnSource)}
      </span>
      {!policy.sourceObservation?.lastSeenOnSource && policy.firstSeenAt && (
        <span>First observed: {observedDate(policy.firstSeenAt)}</span>
      )}
      <span>
        {listing.startDate ?? "Start unknown"} –{" "}
        {listing.endDate ??
          (policy.validityType === "open_ended"
            ? "No listed end date"
            : "End unknown")}{" "}
        · Singapore time
      </span>
      <p>Summary only. Check the source before you go.</p>
      {sourceUrl && (
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
          View source
        </a>
      )}

      <strong>{scheduleLabel}</strong>
      {listing.mvpState?.lifecycle === "stale" && (
        <span>May have ended, check source</span>
      )}
      {listing.mvpState?.lifecycle === "unknown" && <span>Check source</span>}
      {listing.mvpState?.lifecycle === "withdrawn" && (
        <span>No longer listed by the source</span>
      )}
      {listing.mvpState?.lifecycle === "upcoming" && (
        <span>Not started yet</span>
      )}
      {listing.mvpState?.lifecycle === "expired" && (
        <span>Offer period ended</span>
      )}

      {policy.dateAudit.fragments.length > 0 && (
        <div>
          {policy.dateAudit.fragments.map((fragment, index) => (
            <p key={`${fragment.start}-${fragment.end}-${index}`}>
              <q>{fragment.quote}</q>
            </p>
          ))}
        </div>
      )}
      {policy.scheduleRules.length > 0 && (
        <div>
          {policy.scheduleRules.map((rule, index) => (
            <p key={`${rule.evidence.start}-${rule.evidence.end}-${index}`}>
              <q>{rule.evidence.quote}</q>
              {scope(rule) && <span> — {scope(rule)}</span>}
            </p>
          ))}
        </div>
      )}
      {mayShowSourceText && listing.description && (
        <div className="source-text">
          <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {listing.description}
          </p>
        </div>
      )}
    </section>
  );
}
