import type { Listing } from "./promotion";
import { groupMapLocations } from "./map-locations";
export type BrowseContext =
  { kind: "map" } | { kind: "place"; label: string } | { kind: "nearby" };
export type SearchResult = {
  kind: "merchant" | "deal" | "location" | "place";
  id: string;
  label: string;
  context: string;
  promotionIds: string[];
  points: { lat: number; lng: number }[];
  rank: number;
};
export const searchIdentity = (value: string) =>
  value.trim().replace(/[‘’ʼ]/g, "'").toLowerCase();
export function searchListings(
  items: Listing[],
  query: string,
): SearchResult[] {
  const q = searchIdentity(query);
  if (q.length < 2) return [];
  const contains = (s: string | null | undefined) =>
    !!s && searchIdentity(s).includes(q);
  const matches = (p: Listing) =>
    [
      p.merchant,
      p.title,
      p.benefit,
      ...p.outlets.flatMap((o) => [o.name, o.sourceLocation, o.address]),
    ].some(contains);
  const results: SearchResult[] = [];
  const merchants = new Map<string, Listing[]>();
  for (const p of items) {
    const key = searchIdentity(p.merchant);
    if (key) merchants.set(key, [...(merchants.get(key) ?? []), p]);
  }
  for (const [key, promotions] of merchants) {
    if (!promotions.some(matches)) continue;
    const groups = groupMapLocations(promotions);
    results.push({
      kind: "merchant",
      id: key,
      label: promotions[0].merchant,
      context: `${promotions.length} promotion${promotions.length === 1 ? "" : "s"} · ${groups.length === 1 ? groups[0].name : `${groups.length} locations`}`,
      promotionIds: promotions.map((p) => p.id),
      points: groups.map((g) => ({ lat: g.lat, lng: g.lng })),
      rank: key === q ? 0 : key.startsWith(q) ? 1 : 4,
    });
  }
  for (const p of items.filter(matches)) {
    const groups = groupMapLocations([p]);
    results.push({
      kind: "deal",
      id: p.id,
      label: p.title || p.benefit || "Content needs review",
      context: [
        p.merchant,
        groups.length
          ? `${groups
              .slice(0, 2)
              .map((g) => g.name)
              .join(
                ", ",
              )}${groups.length > 2 ? ` +${groups.length - 2} locations` : ""}`
          : "No mapped location",
        p.mvpState?.lifecycle,
        p.endDate
          ? `${p.mvpState?.lifecycle === "expired" ? "Ended" : "Until"} ${p.endDate}`
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
      promotionIds: [p.id],
      points: groups.map((g) => ({ lat: g.lat, lng: g.lng })),
      rank: contains(p.title) || contains(p.benefit) ? 3 : 4,
    });
  }
  for (const g of groupMapLocations(items)) {
    if (
      ![
        g.name,
        g.address,
        ...g.promotions.flatMap((p) =>
          p.outlets.flatMap((o) => [o.name, o.address, o.sourceLocation]),
        ),
      ].some(contains)
    )
      continue;
    results.push({
      kind: "location",
      id: g.key,
      label: g.name,
      context: `${g.promotions.length} promotion${g.promotions.length === 1 ? "" : "s"} · ${g.address}`,
      promotionIds: g.promotions.map((p) => p.promotion.id),
      points: [{ lat: g.lat, lng: g.lng }],
      rank: searchIdentity(g.name) === q ? 2 : 4,
    });
  }
  const counts = new Map<string, number>();
  return results
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.label.localeCompare(b.label) ||
        a.id.localeCompare(b.id),
    )
    .filter((r) => {
      const n = counts.get(r.kind) ?? 0;
      counts.set(r.kind, n + 1);
      return n < 5;
    });
}
export function targetBounds(
  points: SearchResult["points"],
): [number, number, number, number] | null {
  if (!points.length) return null;
  return [
    Math.max(103.6, Math.min(...points.map((p) => p.lng)) - 0.006),
    Math.max(1.15, Math.min(...points.map((p) => p.lat)) - 0.006),
    Math.min(104.1, Math.max(...points.map((p) => p.lng)) + 0.006),
    Math.min(1.5, Math.max(...points.map((p) => p.lat)) + 0.006),
  ];
}
