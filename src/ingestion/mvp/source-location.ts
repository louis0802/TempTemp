/** Query normalization only: the full Telegram label remains the display location. */
export function sourceLocationQuery(source: string) {
  return source
    .replace(/,?\s*#?\b(?:B\d|\d{1,2})-[\w/-]+\s*$/i, "")
    .replace(
      /,\s*(?:(?:[^,]+\s+)?(?:Level\s*\d+|L\d|B\d)(?:\s*&\s*L\d)?)\s*$/i,
      "",
    )
    .replace(/\s+outlet\s*$/i, "")
    .replace(/\bT(\d)\b/gi, "Terminal $1")
    .replace(/[–—]/g, "-")
    .replace(/\s*-\s*/g, "-")
    .trim();
}

/** Preserve comma-attached units and venue/floor descriptors; split explicit venue separators. */
export function mvpSourceLocations(raw: string) {
  return raw
    .split(/\s*[;|]\s*|\s*&\s*(?!\s*L\d\b)/i)
    .flatMap((part) =>
      part.split(/,\s*(?!\s|#?\d|#?B\d|L\d|.*\b(?:Level\s*\d|L\d)\s*$)/i),
    )
    .map((s) => s.trim())
    .filter(Boolean);
}
const normalize = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[–—]/g, "-")
    .replace(
      /\b(rd|st|ave|blvd)\b/g,
      (s) =>
        ({ rd: "road", st: "street", ave: "avenue", blvd: "boulevard" })[s]!,
    )
    .replace(/\bt(\d)\b/g, "terminal $1")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
function numberIdentity(value: string) {
  const range = value.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
  if (range) {
    const [start, end] = [Number(range[1]), Number(range[2])];
    if (end >= start && end - start <= 20)
      return Array.from({ length: end - start + 1 }, (_, i) => start + i).join(
        ",",
      );
  }
  return value.toLowerCase().replace(/\s/g, "");
}
export function streetIdentity(s: string) {
  // The address must start at the street number, not a unit or a postal code.
  const m = s
    .trim()
    .match(
      /^(\d+[A-Za-z]?(?:(?:\s*[-–—]\s*\d+[A-Za-z]?)|(?:\s*,\s*\d+[A-Za-z]?)+)?)\s*,?\s+([^,#]+?)(?=,|\s+Singapore\b|$)/i,
    );
  return m ? `${numberIdentity(m[1])}|${normalize(m[2])}` : null;
}
export function sameSourceLocation(
  query: string,
  name: string,
  address: string,
  components: { longText: string; types: string[] }[] = [],
  types: string[] = [],
) {
  const street = streetIdentity(query);
  if (street) {
    const number = components.find((c) =>
      c.types.includes("street_number"),
    )?.longText;
    const route = components.find((c) => c.types.includes("route"))?.longText;
    // Structured full route names avoid guessing shortened directional/Malay names.
    if (number && route) return street === streetIdentity(`${number} ${route}`);
    const addressIdentity = streetIdentity(address);
    return street === (addressIdentity ?? streetIdentity(name));
  }
  const venue = (s: string) =>
    normalize(s).replace(/\s+shopping (?:centre|center)$/, "");
  if (venue(query) === venue(name)) return true;
  // A named store whose provider category explicitly includes supermarket
  // can anchor a source label ending in that same category, never a nearby store.
  return (
    types.includes("supermarket") &&
    / supermarket$/.test(venue(query)) &&
    venue(query).replace(/ supermarket$/, "") === venue(name)
  );
}
export function usableSourceLocation(query: string) {
  return (
    !!query &&
    !/^(?:L\d|B\d|level\s*\d+|selected outlets?|all outlets?|singapore|tbc|unknown|nearby|islandwide)$/i.test(
      query,
    ) &&
    !/^(?:near|around|various)\b/i.test(query)
  );
}
