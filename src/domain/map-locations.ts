import type { Listing } from "./promotion";
export type ListingOutlet = Listing["outlets"][number];
export type MapLocationGroup = {
  key: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  promotions: {
    promotion: Listing;
    outlet: ListingOutlet;
    outlets: ListingOutlet[];
  }[];
};
// Six decimal places ≈ 0.11 m: overlapping anchors, not spatial clustering.
export const anchorCoordinates = (o: ListingOutlet) =>
  `${o.lat.toFixed(6)},${o.lng.toFixed(6)}`;
export function groupMapLocations(items: Listing[]): MapLocationGroup[] {
  const rows = items
    .flatMap((promotion) =>
      promotion.outlets
        .filter((o) => Number.isFinite(o.lat) && Number.isFinite(o.lng))
        .map((outlet) => ({ promotion, outlet })),
    )
    .sort((a, b) =>
      `${a.promotion.id}:${a.outlet.id}`.localeCompare(
        `${b.promotion.id}:${b.outlet.id}`,
      ),
    );
  const parents = rows.map((_, i) => i);
  const root = (i: number): number =>
    parents[i] === i ? i : (parents[i] = root(parents[i]));
  const identities = new Map<string, number>();
  rows.forEach(({ outlet }, i) => {
    const keys = [`coord:${anchorCoordinates(outlet)}`];
    if (outlet.googlePlaceId) keys.push(`place:${outlet.googlePlaceId}`);
    for (const key of keys) {
      const previous = identities.get(key);
      if (previous !== undefined) parents[root(i)] = root(previous);
      identities.set(key, i);
    }
  });
  const buckets = new Map<number, typeof rows>();
  rows.forEach((row, i) => {
    const key = root(i);
    buckets.set(key, [...(buckets.get(key) ?? []), row]);
  });
  return [...buckets.values()]
    .map((members) => {
      const anchor = members[0].outlet;
      const ids = members
        .map(({ outlet }) =>
          outlet.googlePlaceId
            ? `place:${outlet.googlePlaceId}`
            : `coord:${anchorCoordinates(outlet)}`,
        )
        .sort();
      const promotions = new Map<
        string,
        MapLocationGroup["promotions"][number]
      >();
      for (const { promotion, outlet } of members) {
        const existing = promotions.get(promotion.id);
        if (existing) {
          if (
            !existing.outlets.some(
              (o) =>
                o.id === outlet.id &&
                o.sourceLocation === outlet.sourceLocation &&
                o.address === outlet.address,
            )
          )
            existing.outlets.push(outlet);
        } else
          promotions.set(promotion.id, {
            promotion,
            outlet,
            outlets: [outlet],
          });
      }
      return {
        key: ids[0],
        name: anchor.name,
        address: anchor.googleFormattedAddress ?? anchor.address,
        lat: anchor.lat,
        lng: anchor.lng,
        promotions: [...promotions.values()],
      };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
}
export const locationLabel = (g: MapLocationGroup) =>
  `${g.name}, ${g.promotions.length} promotion${g.promotions.length === 1 ? "" : "s"}`;
export const locationSelected = (g: MapLocationGroup, id: string | null) =>
  g.promotions.some(({ promotion }) => promotion.id === id);
export const locationPinText = (g: MapLocationGroup) =>
  g.promotions.length === 1 ? "●" : `● ${g.promotions.length}`;
