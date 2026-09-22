"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownUp,
  ArrowUpRight,
  Check,
  Coffee,
  Compass,
  LocateFixed,
  MapPin,
  SlidersHorizontal,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { Listing, PromotionResponse, SourceHealth } from "@/domain/promotion";
import {
  groupMapLocations,
  type MapLocationGroup,
} from "@/domain/map-locations";
import DiscoverySearch from "./DiscoverySearch";
import {
  targetBounds,
  type BrowseContext,
  type SearchResult,
} from "@/domain/discovery-search";
import type { MvpViewMode } from "@/domain/mvp";
const PromotionMap = dynamic(() => import("./map/PromotionMap"), {
  ssr: false,
  loading: () => (
    <div className="map-loading">Preparing your neighbourhood…</div>
  ),
});
const defaultBounds: [number, number, number, number] = [
  103.813, 1.265, 103.872, 1.315,
];
const categories = ["All", "Meals", "Cafés", "Drinks", "Desserts"];
type Place = { name: string; lat: number; lng: number };
export default function Explorer({
  mvp = false,
  viewMode = "live",
  showSourceText = false,
}: {
  mvp?: boolean;
  viewMode?: MvpViewMode;
  showSourceText?: boolean;
}) {
  const previewQuery = new URLSearchParams();
  if (viewMode === "corpus") previewQuery.set("view", "corpus");
  if (viewMode === "live_with_expired")
    previewQuery.set("includeExpired", "true");
  if (showSourceText) previewQuery.set("showSourceText", "true");
  const preview = previewQuery.toString();
  const [locationKey, setLocationKey] = useState<string | null>(null);
  const endpoint = mvp ? "/api/mvp/promotions" : "/api/promotions";
  const [items, setItems] = useState<Listing[]>([]),
    [sources, setSources] = useState<SourceHealth[]>([]),
    [demo, setDemo] = useState(false),
    [category, setCategory] = useState("All"),
    [bounds, setBounds] = useState(defaultBounds),
    [selected, setSelected] = useState<string | null>(null),
    [detail, setDetail] = useState<Listing | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [browseContext, setBrowseContext] = useState<BrowseContext>({
      kind: "map",
    }),
    [merchantTarget, setMerchantTarget] = useState<SearchResult | null>(null),
    [locationMessage, setLocationMessage] = useState(""),
    [mobileView, setMobileView] = useState("list"),
    [nowOnly, setNowOnly] = useState(false),
    [sort, setSort] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null),
    returnFocus = useRef<HTMLElement | null>(null),
    returnLocationKey = useRef<string | null>(null);
  const summary = items.find((p) => p.id === selected),
    current = summary
      ? detail?.id === selected
        ? detail
        : summary
      : detail?.id === selected
        ? detail
        : undefined;
  const visible = useMemo(
    () =>
      items
        .filter(
          (p) =>
            (!nowOnly || p.redeemableNow) &&
            (!merchantTarget || merchantTarget.promotionIds.includes(p.id)),
        )
        .sort((a, b) =>
          sort
            ? (a.endDate ?? "9999").localeCompare(b.endDate ?? "9999")
            : a.id.localeCompare(b.id),
        ),
    [items, nowOnly, sort, merchantTarget],
  );
  const groups = useMemo(() => groupMapLocations(visible), [visible]);
  const location = groups.find((group) => group.key === locationKey);
  useEffect(() => {
    let alive = true,
      controller: AbortController;
    async function refresh() {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      setLoading(true);
      try {
        let cursor: string | null = null;
        const collected: Listing[] = [];
        let response: PromotionResponse;
        do {
          const q = new URLSearchParams({ bbox: bounds.join(","), category });
          if (cursor) q.set("cursor", cursor);
          new URLSearchParams(preview).forEach((value, key) =>
            q.set(key, value),
          );
          const r = await fetch(`${endpoint}?${q}`, {
            signal: request.signal,
            cache: "no-store",
          });
          if (!r.ok)
            throw new Error("Offers could not be refreshed. Please try again.");
          response = await r.json();
          collected.push(...response.items);
          cursor = response.nextCursor;
        } while (cursor);
        if (alive && !request.signal.aborted) {
          setItems(collected);
          setSources(response.sources);
          setDemo(response.demo);
          setError("");
        }
      } catch (e) {
        if (alive && !(e instanceof DOMException && e.name === "AbortError")) {
          setError(e instanceof Error ? e.message : "Could not load offers.");
          setItems([]);
        }
      } finally {
        if (alive && !request.signal.aborted) setLoading(false);
      }
    }
    void refresh();
    const timer = setInterval(refresh, 60000);
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    return () => {
      alive = false;
      controller?.abort();
      clearInterval(timer);
      window.removeEventListener("focus", focus);
    };
  }, [bounds, category, endpoint, preview]);
  useEffect(() => {
    if (location || (selected && current)) {
      if (!dialog.current?.open) {
        returnFocus.current = document.activeElement as HTMLElement;
        dialog.current?.showModal();
      } else if (!dialog.current.contains(document.activeElement)) {
        dialog.current
          .querySelector<HTMLButtonElement>(".close-detail")
          ?.focus();
      }
    } else if (dialog.current?.open) {
      dialog.current.close();
    }
  }, [selected, current, location]);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    fetch(`${endpoint}/${selected}${preview ? `?${preview}` : ""}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            "This offer is no longer available. Please refresh the list.",
          );
        const result = await response.json();
        if (!controller.signal.aborted) setDetail(result);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setSelected(null);
          setLocationMessage(error.message);
        }
      });
    return () => controller.abort();
  }, [selected, items, endpoint, preview]);
  const choose = useCallback((id: string) => {
    if (!dialog.current?.open) returnLocationKey.current = null;
    setLocationKey(null);
    setDetail(null);
    setSelected(id);
  }, []);
  const chooseLocation = useCallback((group: MapLocationGroup) => {
    returnLocationKey.current = group.key;
    setSelected(null);
    setDetail(null);
    setLocationKey(group.key);
  }, []);
  function closeDetails() {
    setSelected(null);
    setLocationKey(null);
  }
  function goTo(p: Place) {
    setBrowseContext({ kind: "place", label: p.name });
    setMerchantTarget(null);
    closeDetails();
    setBounds(
      p.name === "All Singapore"
        ? [103.6, 1.15, 104.1, 1.5]
        : [
            Math.max(103.6, p.lng - 0.018),
            Math.max(1.15, p.lat - 0.014),
            Math.min(104.1, p.lng + 0.018),
            Math.min(1.5, p.lat + 0.014),
          ],
    );
  }
  function locate() {
    if (!navigator.geolocation) {
      setLocationMessage(
        "Location is unavailable. Search a neighbourhood instead.",
      );
      return;
    }
    setLocationMessage("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (
          coords.latitude < 1.15 ||
          coords.latitude > 1.5 ||
          coords.longitude < 103.6 ||
          coords.longitude > 104.1
        ) {
          setLocationMessage(
            "You appear to be outside Singapore. Browse an area instead.",
          );
          return;
        }
        goTo({ name: "Near you", lat: coords.latitude, lng: coords.longitude });
        setBrowseContext({ kind: "nearby" });
        setLocationMessage("Showing your area. Your location is not saved.");
      },
      () =>
        setLocationMessage(
          "Location was not shared. You can still search any neighbourhood.",
        ),
      { timeout: 8000, maximumAge: 60000 },
    );
  }
  return (
    <main className="explorer">
      <header className="topbar">
        <Link href="/" className="brand" aria-label="Around home">
          <span className="brand-symbol">
            <MapPin size={23} strokeWidth={2.5} />
          </span>
          around<span className="brand-dot">.</span>
        </Link>
        <span className="brand-tagline">Good deals. Close by.</span>
        <nav>
          <span className="country">
            <span /> Singapore
          </span>
          <Link href="/admin" className="admin-link">
            For curators <ArrowUpRight size={15} />
          </Link>
        </nav>
      </header>
      <div className="workspace">
        <section
          className={`sidebar ${mobileView === "map" ? "mobile-hidden" : ""}`}
          aria-label="Promotion discovery"
        >
          <div className="intro">
            <div className="eyebrow">
              <span className="tiny-line" /> YOUR NEIGHBOURHOOD, FOR LESS
            </div>
            <h1>
              A good deal is
              <br />
              just around.
            </h1>
            <p>
              Your next coffee, lunch or little treat.
              <br />
              Find something worth stepping out for.
            </p>
          </div>
          <div className="discovery-controls">
            <DiscoverySearch
              mvp={mvp}
              preview={preview}
              onLocate={locate}
              onSelect={(result) => {
                if (result.kind === "place") {
                  goTo({ name: result.label, ...result.points[0] });
                  return;
                }
                closeDetails();
                setMerchantTarget(result.kind === "merchant" ? result : null);
                setBrowseContext(
                  result.kind === "location"
                    ? { kind: "place", label: result.label }
                    : { kind: "map" },
                );
                const next = targetBounds(result.points);
                if (next) setBounds(next);
                if (result.kind === "deal") choose(result.id);
              }}
            />
            {locationMessage && (
              <p className="inline-message" role="status">
                {locationMessage}
              </p>
            )}
            {!mvp && (
              <div className="categories" aria-label="Filter by category">
                {categories.map((c) => (
                  <button
                    key={c}
                    aria-pressed={category === c}
                    className={category === c ? "active" : ""}
                    onClick={() => setCategory(c)}
                  >
                    {c === "All" && <SlidersHorizontal size={14} />}{" "}
                    {c === "All" ? "All deals" : c}
                  </button>
                ))}
              </div>
            )}
            <div className="filter-row">
              <label>
                <input
                  type="checkbox"
                  checked={nowOnly}
                  onChange={(e) => setNowOnly(e.target.checked)}
                />{" "}
                Available now
              </label>
              <button onClick={() => setSort(!sort)} aria-pressed={sort}>
                <ArrowDownUp size={14} />
                {sort ? "Ending soon" : "Default order"}
              </button>
            </div>
          </div>
          <div className="results-heading">
            <div>
              <h2>
                {browseContext.kind === "place"
                  ? browseContext.label
                  : browseContext.kind === "nearby"
                    ? "Near you"
                    : "Map area"}
              </h2>
              <span aria-live="polite">
                {loading
                  ? "Finding deals…"
                  : `${visible.length} ${demo ? "example " : ""}deal${visible.length === 1 ? "" : "s"}${browseContext.kind === "map" ? "" : " in this area"}`}
              </span>
            </div>
            {mvp && (
              <details className="location-info">
                <summary>ⓘ Location info</summary>
                <p>
                  Pins may show merchant or source-stated locations. Promotion
                  participation is not independently confirmed. Check each
                  offer’s terms before visiting.
                </p>
                {viewMode === "corpus" && (
                  <p>
                    Curated corpus preview includes all records, including
                    incomplete, online-only, expired and upcoming offers.
                  </p>
                )}
              </details>
            )}
          </div>
          {merchantTarget && (
            <div className="merchant-target" role="status">
              Showing {merchantTarget.label}
              <button
                onClick={() => setMerchantTarget(null)}
                aria-label="Clear merchant filter"
              >
                Clear <X size={12} />
              </button>
            </div>
          )}
          {demo && (
            <div className="demo-banner">
              <span>DEMO</span> Fictional offers. Not redeemable.
            </div>
          )}
          {error && (
            <div role="alert" className="empty-state">
              <h3>We couldn’t load the deals</h3>
              <p>{error}</p>
              <button onClick={() => setBounds([...bounds])}>Try again</button>
            </div>
          )}
          <div className="offer-list">
            {visible.map((p, i) => (
              <button
                key={p.id}
                className="offer-card"
                onClick={() => choose(p.id)}
              >
                <div
                  className={`offer-art art-${(p.category ?? "Meals").toLowerCase().replace("é", "e")}`}
                >
                  <span className="card-number">
                    {i + 1 < 10 ? "0" : ""}
                    {i + 1}
                  </span>
                  {p.category === "Meals" ? (
                    <UtensilsCrossed size={34} strokeWidth={1.3} />
                  ) : p.category === "Cafés" || p.category === "Drinks" ? (
                    <Coffee size={36} strokeWidth={1.3} />
                  ) : (
                    <span className="scoop-art">
                      ●<br />▼
                    </span>
                  )}
                  <span className="art-category">
                    {p.category ?? "Promotion"}
                  </span>
                </div>
                <div className="offer-summary">
                  <div className="card-topline">
                    <span>{p.merchant || "Merchant needs review"}</span>
                    <ArrowUpRight size={16} />
                  </div>
                  <h3>{p.benefit || p.title || "Content needs review"}</h3>
                  <p>{p.title}</p>
                  <div className="card-location">
                    <MapPin size={12} />
                    {p.outlets[0]?.name ??
                      (p.mvpState?.map === "online_only"
                        ? "Online only · No map pins"
                        : "Location unresolved")}
                    {p.outlets.length > 1 ? ` +${p.outlets.length - 1}` : ""}
                  </div>
                  {p.mvpState && (
                    <div className="mvp-badges">
                      {p.mvpState.content !== "resolved" && (
                        <span>Needs content resolution</span>
                      )}
                      {p.mvpState.validity !== "resolved" && (
                        <span>Needs validity</span>
                      )}
                      {p.mvpState.map === "needs_location" && (
                        <span>Needs location</span>
                      )}
                      {p.mvpState.map === "online_only" && (
                        <span>Online only</span>
                      )}
                      {p.mvpState.validity === "resolved" && (
                        <span>{p.mvpState.lifecycle}</span>
                      )}
                    </div>
                  )}
                  <div className="card-validity">
                    <span
                      className={p.redeemableNow ? "available" : "scheduled"}
                    >
                      {p.redeemableNow ? "Available now" : "See schedule"}
                    </span>
                    <span>
                      {p.endDate
                        ? `Until ${new Date(
                            `${p.endDate}T00:00:00+08:00`,
                          ).toLocaleDateString("en-SG", {
                            day: "numeric",
                            month: "short",
                            timeZone: "Asia/Singapore",
                          })}`
                        : "Validity incomplete"}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {!loading && !error && !visible.length && (
            <div className="empty-state">
              <Compass size={30} />
              <h3>A little further afield?</h3>
              <p>
                No matching deals in this area. Try another neighbourhood or
                clear your filters.
              </p>
              <button
                onClick={() => {
                  setCategory("All");
                  setNowOnly(false);
                  setBounds(defaultBounds);
                  setBrowseContext({ kind: "map" });
                  setMerchantTarget(null);
                }}
              >
                Reset discovery
              </button>
            </div>
          )}
          <footer className="list-footer">
            <Check size={14} />
            {demo
              ? "A preview of your next neighbourhood ritual."
              : mvp
                ? "Merchant locations; check promotion terms before visiting."
                : "Only verified ongoing offers appear here."}
          </footer>
        </section>
        <section
          className={`map-panel ${mobileView === "list" ? "mobile-hidden" : ""}`}
          aria-label="Map"
        >
          <PromotionMap
            groups={groups}
            selected={selected}
            highlighted={merchantTarget?.promotionIds}
            onManualMove={() =>
              setBrowseContext((context) =>
                context.kind === "map" ? context : { kind: "map" },
              )
            }
            onSelect={chooseLocation}
            bounds={bounds}
            onBounds={setBounds}
          />
          {mvp && (
            <p className="mvp-map-notice">
              Merchant locations · Participation not confirmed
            </p>
          )}
          <div className="map-top">
            <span>
              <span className="live-dot" />
              {demo ? "Explore the demo" : "Discover Singapore"}
            </span>
            <button
              onClick={() => {
                setBounds(defaultBounds);
                setBrowseContext({ kind: "map" });
                setMerchantTarget(null);
              }}
            >
              Reset map <Compass size={16} />
            </button>
          </div>
          <div className="map-bottom">
            <div className="map-note">
              <span className="note-icon">
                <MapPin size={20} />
              </span>
              <div>
                <strong>Small detours. Good discoveries.</strong>
                <p>Choose a location to explore its promotions.</p>
              </div>
            </div>
            <button
              className="locate-map"
              aria-label="Find deals near me"
              onClick={locate}
            >
              <LocateFixed size={21} />
            </button>
          </div>
        </section>
      </div>
      <div className="mobile-switch">
        <button
          className={mobileView === "list" ? "active" : ""}
          onClick={() => setMobileView("list")}
        >
          List
        </button>
        <button
          className={mobileView === "map" ? "active" : ""}
          onClick={() => setMobileView("map")}
        >
          Map
        </button>
      </div>
      <div className="statusbar">
        <span>
          <span className="live-dot" />
          {demo
            ? "Demo mode · fictional offers"
            : "Offers refresh every minute"}
        </span>
        <span>
          {demo
            ? "Live source status is shown in the curator workspace."
            : sources
                .map(
                  (s) =>
                    `${s.label}: ${s.lastSuccess ? new Date(s.lastSuccess).toLocaleString("en-SG", { timeZone: "Asia/Singapore" }) : "not connected"}`,
                )
                .join(" · ")}
        </span>
      </div>
      <dialog
        ref={dialog}
        className="detail-dialog"
        aria-labelledby="detail-title"
        onCancel={closeDetails}
        onClose={() => {
          closeDetails();
          const anchor = returnLocationKey.current
            ? Array.from(
                document.querySelectorAll<HTMLElement>("[data-location-key]"),
              ).find(
                (el) => el.dataset.locationKey === returnLocationKey.current,
              )
            : null;
          (anchor ?? returnFocus.current)?.focus();
        }}
      >
        {location && (
          <>
            <button
              className="close-detail"
              aria-label="Close location details"
              onClick={closeDetails}
            >
              <X />
            </button>
            <div className="detail-kicker">LOCATION</div>
            <h2 id="detail-title">{location.name}</h2>
            <p>{location.address}</p>
            <h3>
              {location.promotions.length} promotion
              {location.promotions.length === 1 ? "" : "s"}
            </h3>
            <div className="location-promotions">
              {location.promotions.map(({ promotion, outlets }) => (
                <button
                  className="location-promotion"
                  key={promotion.id}
                  onClick={() => choose(promotion.id)}
                >
                  <strong>{promotion.merchant}</strong>
                  <span>{promotion.title || promotion.benefit}</span>
                  {promotion.benefit &&
                    promotion.benefit !== promotion.title && (
                      <small>{promotion.benefit}</small>
                    )}
                  <span>
                    {promotion.mvpState?.lifecycle ??
                      (promotion.ongoing ? "active" : "See schedule")}{" "}
                    ·{" "}
                    {promotion.mvpState?.lifecycle === "expired"
                      ? "Ended"
                      : "Until"}{" "}
                    {promotion.endDate ?? "unknown"}
                  </span>
                  {Array.from(
                    new Set(outlets.map((o) => o.sourceLocation ?? o.address)),
                  ).map((label) => (
                    <small key={label}>{label}</small>
                  ))}
                </button>
              ))}
            </div>
          </>
        )}
        {!location && current && (
          <>
            <button
              className="close-detail"
              aria-label="Close offer details"
              onClick={closeDetails}
            >
              <X />
            </button>
            <div className="detail-kicker">
              {demo
                ? "FICTIONAL EXAMPLE"
                : (current.category ?? "Promotion").toUpperCase()}
            </div>
            <p className="detail-merchant">{current.merchant}</p>
            <h2 id="detail-title">
              {current.benefit || current.title || "Content needs review"}
            </h2>
            <h3>{current.title}</h3>
            {(!current.mvpState || showSourceText) && current.description && (
              <section className="source-text">
                {current.mvpState && (
                  <h4>Raw Telegram source · Development debug</h4>
                )}
                <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  {current.description
                    .split(/(https?:\/\/[^\s<>\)]+)/g)
                    .map((part, index) =>
                      /^https?:\/\//.test(part) ? (
                        <a
                          key={index}
                          href={part}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {part}
                        </a>
                      ) : (
                        part
                      ),
                    )}
                </p>
              </section>
            )}
            <div className="detail-schedule">
              <strong>{current.scheduleLabel}</strong>
              <span>
                {current.startDate ?? "Start unknown"} –{" "}
                {current.endDate ?? "End unknown"} · Singapore time
              </span>
              <span>
                {current.scheduleState}
                {current.excludePublicHolidays
                  ? " · Excludes public holidays"
                  : ""}
              </span>
            </div>
            {current.mvpState && (
              <p className="inline-message">
                {current.mvpState.lifecycle} · Content:{" "}
                {current.mvpState.content.replaceAll("_", " ")} · Validity:{" "}
                {current.mvpState.validity.replaceAll("_", " ")} · Map:{" "}
                {current.mvpState.map.replaceAll("_", " ")}
                {current.mvpState.reasons.length > 0 &&
                  ` · ${current.mvpState.reasons.join("; ").replaceAll("_", " ")}`}
              </p>
            )}
            {current.terms.filter(
              (t) => !current.mvpState || t !== current.description,
            ).length > 0 && (
              <>
                <h4>Before you go</h4>
                <ul>
                  {current.terms
                    .filter(
                      (t) => !current.mvpState || t !== current.description,
                    )
                    .map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                </ul>
              </>
            )}
            <h4>{mvp ? "Merchant locations" : "Participating outlets"}</h4>
            {mvp && (
              <p>
                {current.mvpState?.map === "online_only"
                  ? "Online-only promotion. No physical map pins."
                  : !current.outlets.length
                    ? "Location unresolved. No physical map pins."
                    : current.mapCoverageBasis === "source_named_outlets"
                      ? "Locations named in the source. Check the source terms before visiting."
                      : "Observed Google merchant locations. Participation and complete chain coverage are not verified."}
              </p>
            )}
            {current.outlets.map((o) => (
              <div className="outlet-detail" key={o.id}>
                <div>
                  <strong>{o.name}</strong>
                  <p>{o.address}</p>
                  {o.sourceLocation && o.sourceLocation !== o.address && (
                    <p>Source location: {o.sourceLocation}</p>
                  )}
                  {o.coordinateBasis === "google_source_location" && (
                    <p>
                      Pin marks the source-stated location. Google supplied
                      venue/address coordinates; merchant operation, unit and
                      promotion participation are not verified.
                    </p>
                  )}
                  {o.coordinateBasis === "google_source_location" &&
                    o.googlePlaceId && (
                      <p>
                        Google anchor:{" "}
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.googleFormattedAddress ?? o.name)}&query_place_id=${encodeURIComponent(o.googlePlaceId)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {o.googleFormattedAddress}
                        </a>
                      </p>
                    )}
                </div>
                {!demo && (
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`https://www.google.com/maps/dir/?api=1&destination=${o.lat},${o.lng}`}
                  >
                    Directions <ArrowUpRight size={16} />
                  </a>
                )}
              </div>
            ))}
            <div className="detail-source">
              {demo ? (
                <p>
                  These merchants and promotions are fictional. Addresses are
                  illustrative; no participation is claimed.
                </p>
              ) : (
                <>
                  {current.sources.map((s) => (
                    <a
                      key={s.url}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View source · {s.label} <ArrowUpRight size={15} />
                    </a>
                  ))}
                  {!mvp && (
                    <p>
                      Offer verified{" "}
                      {new Date(current.verifiedAt!).toLocaleString("en-SG", {
                        timeZone: "Asia/Singapore",
                      })}{" "}
                      SGT
                    </p>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </dialog>
    </main>
  );
}
