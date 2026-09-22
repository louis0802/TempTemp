"use client";
import { useEffect, useRef, useState } from "react";
import { LocateFixed, Search } from "lucide-react";
import { searchIdentity, type SearchResult } from "@/domain/discovery-search";
const labels = {
  merchant: "Merchants",
  deal: "Deals",
  location: "Promotion locations",
  place: "Places",
};
export default function DiscoverySearch({
  mvp,
  preview,
  onSelect,
  onLocate,
}: {
  mvp: boolean;
  preview: string;
  onSelect: (result: SearchResult) => void;
  onLocate: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<{
    query: string;
    items: SearchResult[];
    message: string;
  } | null>(null);
  const items = response?.query === query ? response.items : [];
  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const request = async (url: string) => {
        const r = await fetch(url, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!r.ok) throw new Error("Search failed");
        return r.json();
      };
      const q = encodeURIComponent(query.trim());
      const [local, places] = await Promise.allSettled([
        mvp
          ? request(`/api/mvp/search?q=${q}&${preview}`)
          : Promise.resolve({ items: [] }),
        request(`/api/places?q=${q}`),
      ]);
      if (controller.signal.aborted) return;
      const found: SearchResult[] =
        local.status === "fulfilled" ? local.value.items : [];
      const known = new Set(
        found
          .filter((r) => r.kind === "location")
          .map((r) => searchIdentity(r.label)),
      );
      if (places.status === "fulfilled")
        found.push(
          ...places.value.items
            .filter((p: { name: string }) => !known.has(searchIdentity(p.name)))
            .slice(0, 5)
            .map((p: { name: string; lat: number; lng: number }) => ({
              kind: "place" as const,
              id: p.name,
              label: p.name,
              context: "Neighbourhood or address",
              points: [{ lat: p.lat, lng: p.lng }],
              promotionIds: [],
              rank: 5,
            })),
        );
      const failed =
        (!mvp || local.status === "rejected") && places.status === "rejected";
      const partial =
        places.status === "rejected" ||
        (places.status === "fulfilled" && places.value.message);
      setResponse({
        query,
        items: found,
        message: failed
          ? "Search unavailable. Try again."
          : [
              !found.length
                ? "No merchants or deals found. Try another name, promotion or place."
                : "",
              local.status === "rejected"
                ? "Merchant and deal search is unavailable; place results are still available."
                : "",
              partial
                ? "Address search is unavailable. Local results are still available."
                : "",
            ]
              .filter(Boolean)
              .join(" "),
      });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, mvp, preview]);
  const choose = (r: SearchResult) => {
    setQuery("");
    setResponse(null);
    input.current?.focus();
    onSelect(r);
  };
  const kinds = [...new Set(items.map((r) => r.kind))];
  return (
    <>
      <form
        className="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (items[0]) choose(items[0]);
        }}
      >
        <Search size={19} />
        <input
          ref={input}
          aria-label="Search merchants, deals or places"
          placeholder="Search merchants, deals or places"
          maxLength={100}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setResponse(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setQuery("");
              setResponse(null);
            }
          }}
          autoComplete="off"
          aria-controls="discovery-search-results"
        />
        <button
          type="button"
          aria-label="Use my location"
          onClick={() => {
            setQuery("");
            setResponse(null);
            onLocate();
          }}
        >
          <LocateFixed size={20} />
        </button>
      </form>
      {query.trim().length >= 2 && (
        <div
          id="discovery-search-results"
          className="search-results"
          aria-label="Search results"
        >
          {kinds.map((kind) => (
            <section key={kind} aria-label={labels[kind]}>
              <h3>{labels[kind]}</h3>
              {items
                .filter((r) => r.kind === kind)
                .map((r) => (
                  <button type="button" key={r.id} onClick={() => choose(r)}>
                    <span>
                      <strong>{r.label}</strong>
                      <small>{r.context}</small>
                    </span>
                  </button>
                ))}
            </section>
          ))}
          <p role="status">
            {response?.query === query ? response.message : "Searching…"}
          </p>
        </div>
      )}
    </>
  );
}
