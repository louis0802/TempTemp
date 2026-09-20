"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownUp,
  ArrowUpRight,
  Check,
  ChevronRight,
  Coffee,
  Compass,
  LocateFixed,
  MapPin,
  Search,
  SlidersHorizontal,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { Listing, PromotionResponse, SourceHealth } from "@/domain/promotion";
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
export default function Explorer() {
  const [items, setItems] = useState<Listing[]>([]),
    [sources, setSources] = useState<SourceHealth[]>([]),
    [demo, setDemo] = useState(false),
    [category, setCategory] = useState("All"),
    [bounds, setBounds] = useState(defaultBounds),
    [selected, setSelected] = useState<string | null>(null),
    [detail, setDetail] = useState<Listing | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState(""),
    [places, setPlaces] = useState<Place[]>([]),
    [searchMessage, setSearchMessage] = useState(""),
    [area, setArea] = useState("Central Singapore"),
    [locationMessage, setLocationMessage] = useState(""),
    [mobileView, setMobileView] = useState("list"),
    [nowOnly, setNowOnly] = useState(false),
    [sort, setSort] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null),
    returnFocus = useRef<HTMLElement | null>(null);
  const summary = items.find((p) => p.id === selected),
    current = summary
      ? detail?.id === selected
        ? detail
        : summary
      : undefined,
    visible = items
      .filter((p) => !nowOnly || p.redeemableNow)
      .sort((a, b) =>
        sort ? a.endDate!.localeCompare(b.endDate!) : a.id.localeCompare(b.id),
      );
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
          const r = await fetch(`/api/promotions?${q}`, {
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
  }, [bounds, category]);
  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/places?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        setPlaces(data.items);
        setSearchMessage(
          data.message ||
            (!data.items.length
              ? "No places found. Try a nearby neighbourhood."
              : ""),
        );
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError"))
          setSearchMessage("Search unavailable. Try again.");
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  useEffect(() => {
    if (selected && current) {
      if (!dialog.current?.open) {
        returnFocus.current = document.activeElement as HTMLElement;
        dialog.current?.showModal();
      }
    } else if (dialog.current?.open) {
      dialog.current.close();
      returnFocus.current?.focus();
    }
  }, [selected, current]);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    fetch(`/api/promotions/${selected}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            "This offer is no longer available. Please refresh the list.",
          );
        setDetail(await response.json());
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setSelected(null);
          setLocationMessage(error.message);
        }
      });
    return () => controller.abort();
  }, [selected, items]);
  const choose = useCallback((id: string) => {
    setDetail(null);
    setSelected(id);
  }, []);
  function goTo(p: Place) {
    setArea(p.name);
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
    setQuery("");
    setPlaces([]);
    setSearchMessage("");
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
            <form
              className="search"
              onSubmit={(e) => {
                e.preventDefault();
                if (places[0]) goTo(places[0]);
              }}
            >
              <Search size={19} />
              <input
                aria-label="Search neighbourhood"
                placeholder="Where are you exploring?"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPlaces([]);
                  setSearchMessage("");
                }}
                autoComplete="off"
              />
              <button
                type="button"
                aria-label="Use my location"
                onClick={locate}
              >
                <LocateFixed size={20} />
              </button>
            </form>
            {query.length >= 2 && (places.length > 0 || searchMessage) && (
              <div className="search-results">
                {places.map((p) => (
                  <button key={p.name} onClick={() => goTo(p)}>
                    <MapPin size={16} />
                    {p.name}
                    <ChevronRight size={15} />
                  </button>
                ))}
                {searchMessage && <p role="status">{searchMessage}</p>}
              </div>
            )}
            {locationMessage && (
              <p className="inline-message" role="status">
                {locationMessage}
              </p>
            )}
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
              <h2>{area}</h2>
              <span aria-live="polite">
                {loading
                  ? "Finding deals…"
                  : `${visible.length} ${demo ? "example " : ""}deals to explore`}
              </span>
            </div>
            <Compass size={23} />
          </div>
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
                  className={`offer-art art-${p.category.toLowerCase().replace("é", "e")}`}
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
                  <span className="art-category">{p.category}</span>
                </div>
                <div className="offer-summary">
                  <div className="card-topline">
                    <span>{p.merchant}</span>
                    <ArrowUpRight size={16} />
                  </div>
                  <h3>{p.benefit}</h3>
                  <p>{p.title}</p>
                  <div className="card-location">
                    <MapPin size={12} />
                    {p.outlets[0].name}
                    {p.outlets.length > 1 ? ` +${p.outlets.length - 1}` : ""}
                  </div>
                  <div className="card-validity">
                    <span
                      className={p.redeemableNow ? "available" : "scheduled"}
                    >
                      {p.redeemableNow ? "Available now" : "See schedule"}
                    </span>
                    <span>
                      Until{" "}
                      {new Date(
                        `${p.endDate}T00:00:00+08:00`,
                      ).toLocaleDateString("en-SG", {
                        day: "numeric",
                        month: "short",
                        timeZone: "Asia/Singapore",
                      })}
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
                  setArea("Central Singapore");
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
              : "Only verified ongoing offers appear here."}
          </footer>
        </section>
        <section
          className={`map-panel ${mobileView === "list" ? "mobile-hidden" : ""}`}
          aria-label="Map"
        >
          <PromotionMap
            items={visible}
            selected={selected}
            onSelect={choose}
            bounds={bounds}
            onBounds={setBounds}
          />
          <div className="map-top">
            <span>
              <span className="live-dot" />
              {demo ? "Explore the demo" : "Discover Singapore"}
            </span>
            <button
              onClick={() => {
                setBounds(defaultBounds);
                setArea("Central Singapore");
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
                <p>Choose a pin to see the deal and its details.</p>
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
        onCancel={() => setSelected(null)}
        onClose={() => setSelected(null)}
      >
        {current && (
          <>
            <button
              className="close-detail"
              aria-label="Close offer details"
              onClick={() => setSelected(null)}
            >
              <X />
            </button>
            <div className="detail-kicker">
              {demo ? "FICTIONAL EXAMPLE" : current.category.toUpperCase()}
            </div>
            <p className="detail-merchant">{current.merchant}</p>
            <h2>{current.benefit}</h2>
            <h3>{current.title}</h3>
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
            <div className="detail-schedule">
              <strong>{current.scheduleLabel}</strong>
              <span>
                {current.startDate} – {current.endDate} · Singapore time
              </span>
              <span>
                {current.scheduleState}
                {current.excludePublicHolidays
                  ? " · Excludes public holidays"
                  : ""}
              </span>
            </div>
            <h4>Before you go</h4>
            <ul>
              {current.terms.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <h4>Participating outlets</h4>
            {current.outlets.map((o) => (
              <div className="outlet-detail" key={o.id}>
                <div>
                  <strong>{o.name}</strong>
                  <p>{o.address}</p>
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
                  <p>
                    Offer verified{" "}
                    {new Date(current.verifiedAt!).toLocaleString("en-SG", {
                      timeZone: "Asia/Singapore",
                    })}{" "}
                    SGT
                  </p>
                </>
              )}
            </div>
          </>
        )}
      </dialog>
    </main>
  );
}
