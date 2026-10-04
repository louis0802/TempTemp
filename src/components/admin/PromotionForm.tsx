"use client";
import { useState } from "react";
import { Promotion, promotionSchema } from "@/domain/promotion";
export function draftPromotion(
  value: Partial<Promotion>,
  source?: Promotion["sources"][number],
): Promotion {
  const defaults: Promotion = {
    id: crypto.randomUUID(),
    merchant: "",
    title: "",
    category: "Meals",
    benefit: "",
    description: "",
    terms: [],
    startDate: null,
    endDate: null,
    weekdays: null,
    hours: null,
    scheduleLabel: "",
    excludePublicHolidays: false,
    holidayDates: [],
    holidayCalendarThrough: null,
    outlets: [],
    sources: source ? [source] : [],
    verifiedAt: null,
    reviewDueAt: null,
    status: "needs_review",
    revision: 1,
  };
  const safe: Record<string, unknown> = {};
  for (const [key, schema] of Object.entries(promotionSchema.shape)) {
    const result = schema.safeParse(value?.[key as keyof Promotion]);
    if (result.success) safe[key] = result.data;
  }
  return { ...defaults, ...safe };
}
export default function PromotionForm({
  initial,
  busy,
  onSave,
  onCancel,
  canWithdraw,
}: {
  initial: Promotion;
  busy: boolean;
  onSave: (
    p: Promotion,
    reason: string,
    action: "correct" | "withdraw",
  ) => Promise<void>;
  onCancel: () => void;
  canWithdraw: boolean;
}) {
  const [p, setP] = useState(initial),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [confirmed, setConfirmed] = useState(false);
  function field<K extends keyof Promotion>(key: K, value: Promotion[K]) {
    setP((previous) => ({ ...previous, [key]: value }));
  }
  async function save(action: "correct" | "withdraw") {
    setError("");
    if (reason.trim().length < 3) {
      setError("Explain what you verified or why this should be withdrawn.");
      return;
    }
    if (action === "withdraw") {
      await onSave(initial, reason, action);
      return;
    }
    if (!confirmed) {
      setError(
        "Confirm that you verified the offer and each participating outlet.",
      );
      return;
    }
    const validated = promotionSchema.safeParse({
      ...p,
      verifiedAt: new Date().toISOString(),
    });
    if (!validated.success) {
      setError(
        validated.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("\n"),
      );
      return;
    }
    await onSave(validated.data, reason, action);
  }
  return (
    <form
      className="review-editor"
      onSubmit={(e) => {
        e.preventDefault();
        void save("correct");
      }}
    >
      <h2>Review {p.merchant || "new offer"}</h2>
      <p>
        Check every suggestion against the source. Missing facts stay
        unpublished.
      </p>
      {error && (
        <p role="alert" className="admin-error">
          {error}
        </p>
      )}
      <div className="form-grid">
        <label>
          Merchant
          <input
            value={p.merchant}
            onChange={(e) => field("merchant", e.target.value)}
            required
          />
        </label>
        <label>
          Category
          <select
            value={p.category}
            onChange={(e) =>
              field("category", e.target.value as Promotion["category"])
            }
          >
            {["Meals", "Cafés", "Drinks", "Desserts"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Offer title
          <input
            value={p.title}
            onChange={(e) => field("title", e.target.value)}
            required
          />
        </label>
        <label>
          Benefit
          <input
            value={p.benefit}
            onChange={(e) => field("benefit", e.target.value)}
            placeholder="e.g. Up to 30% off"
            required
          />
        </label>
      </div>
      <label>
        Description
        <textarea
          className="short-text"
          value={p.description}
          onChange={(e) => field("description", e.target.value)}
          required
        />
      </label>
      <label>
        Complete redemption conditions (one per line)
        <textarea
          className="short-text"
          value={p.terms.join("\n")}
          onChange={(e) => field("terms", e.target.value.split("\n"))}
          required
        />
      </label>
      <fieldset>
        <legend>Validity · Singapore time</legend>
        <div className="form-grid">
          <label>
            First valid date
            <input
              type="date"
              value={p.startDate ?? ""}
              onChange={(e) => field("startDate", e.target.value || null)}
              required
            />
          </label>
          <label>
            Last valid date
            <input
              type="date"
              value={p.endDate ?? ""}
              onChange={(e) => field("endDate", e.target.value || null)}
              required
            />
          </label>
          <label>
            Redemption starts
            <input
              type="time"
              value={p.hours?.start ?? ""}
              onChange={(e) =>
                field(
                  "hours",
                  e.target.value
                    ? { start: e.target.value, end: p.hours?.end ?? "" }
                    : null,
                )
              }
            />
          </label>
          <label>
            Redemption ends
            <input
              type="time"
              value={p.hours?.end ?? ""}
              onChange={(e) =>
                field(
                  "hours",
                  e.target.value
                    ? { start: p.hours?.start ?? "", end: e.target.value }
                    : null,
                )
              }
            />
          </label>
        </div>
        <p className="form-help">
          Leave hours blank if unknown. An end time earlier than the start
          crosses midnight. The last valid date still ends at midnight.
        </p>
        <div className="weekday-options" aria-label="Valid weekdays">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
            <label key={d}>
              <input
                type="checkbox"
                checked={p.weekdays?.includes(i + 1) ?? false}
                onChange={(e) => {
                  const days = e.target.checked
                    ? [...(p.weekdays ?? []), i + 1]
                    : (p.weekdays ?? []).filter((n) => n !== i + 1);
                  field("weekdays", days.length ? days.sort() : null);
                }}
              />
              {d}
            </label>
          ))}
        </div>
        <p className="form-help">
          No weekday selection means unrestricted days. Overnight windows use
          their starting weekday.
        </p>
        <label>
          Schedule shown to visitors
          <input
            value={p.scheduleLabel}
            onChange={(e) => field("scheduleLabel", e.target.value)}
            placeholder="e.g. Fridays, 10pm–2am"
            required
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={p.excludePublicHolidays}
            onChange={(e) => field("excludePublicHolidays", e.target.checked)}
          />{" "}
          Excludes public holidays
        </label>
        {p.excludePublicHolidays && (
          <>
            <label>
              Verified holiday dates (one YYYY-MM-DD per line)
              <textarea
                className="short-text"
                value={p.holidayDates.join("\n")}
                onChange={(e) =>
                  field(
                    "holidayDates",
                    e.target.value.split("\n").filter(Boolean),
                  )
                }
              />
            </label>
            <label>
              Holiday calendar verified through
              <input
                type="date"
                value={p.holidayCalendarThrough ?? ""}
                onChange={(e) =>
                  field("holidayCalendarThrough", e.target.value || null)
                }
                required
              />
            </label>
          </>
        )}
      </fieldset>
      <fieldset>
        <legend>Confirmed participating outlets</legend>
        {p.outlets.map((o, i) => (
          <div className="outlet-fields" key={o.id}>
            <div className="form-grid">
              {(["name", "address", "lat", "lng", "evidence"] as const).map(
                (key) => (
                  <label key={key}>
                    {
                      {
                        name: "Branch name",
                        address: "Street address and unit",
                        lat: "Latitude",
                        lng: "Longitude",
                        evidence: "Participation evidence",
                      }[key]
                    }
                    <input
                      type={key === "lat" || key === "lng" ? "number" : "text"}
                      step="any"
                      value={o[key]}
                      onChange={(e) =>
                        field(
                          "outlets",
                          p.outlets.map((item, j) =>
                            j === i
                              ? {
                                  ...item,
                                  [key]:
                                    key === "lat" || key === "lng"
                                      ? Number(e.target.value)
                                      : e.target.value,
                                }
                              : item,
                          ),
                        )
                      }
                      required
                    />
                  </label>
                ),
              )}
            </div>
            <button
              type="button"
              onClick={() =>
                field(
                  "outlets",
                  p.outlets.filter((_, j) => j !== i),
                )
              }
            >
              Remove outlet
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            field("outlets", [
              ...p.outlets,
              {
                id: crypto.randomUUID(),
                name: "",
                address: "",
                lat: 0,
                lng: 0,
                evidence: "",
                verifiedAt: new Date().toISOString(),
              },
            ])
          }
        >
          Add confirmed outlet
        </button>
        <p className="form-help">
          A geocoded address is not proof of participation. Record your evidence
          for every branch.
        </p>
      </fieldset>
      <fieldset>
        <legend>Source references</legend>
        {p.sources.map((s, i) => (
          <label key={i}>
            {"kind" in s && s.kind === "direct"
              ? "Official source"
              : "Source post"}{" "}
            {i + 1}
            <input
              type="url"
              value={s.url}
              readOnly={"kind" in s && s.kind === "direct"}
              onChange={(e) =>
                field(
                  "sources",
                  p.sources.map((x, j) =>
                    i === j ? { ...x, url: e.target.value } : x,
                  ),
                )
              }
              required
            />
          </label>
        ))}
      </fieldset>
      <label>
        Review reason and evidence
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          minLength={3}
        />
      </label>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />{" "}
        I verified the conditions, dates, and every participating outlet.
      </label>
      <div className="admin-actions">
        <button className="primary" disabled={busy} type="submit">
          Save and approve
        </button>
        {canWithdraw && (
          <button
            type="button"
            disabled={busy}
            onClick={() => save("withdraw")}
          >
            Withdraw
          </button>
        )}
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
