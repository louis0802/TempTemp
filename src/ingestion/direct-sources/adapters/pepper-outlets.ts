import { load } from "cheerio";
import { normalizeIdentity } from "../../resolution/outlets";
import type {
  DirectorySnapshot,
  MerchantBranch,
  MerchantOutletProvider,
} from "../../resolution/types";
import { BoundedDirectFetch, type DirectTransport } from "../fetch";
import { sourceDefinition } from "../registry";
import type { FetchedPage } from "../types";

export const pepperOutletUrl = "https://www.pepperlunch.com.sg/location/";
const whitespace = (s: string) => s.replace(/\s+/g, " ").trim();
/** Source-specific static cards and map-list agreement. Never execute source JavaScript. */
export function parsePepperOutlets(
  page: FetchedPage,
  wording: string | null,
): DirectorySnapshot {
  const html = page.body.toString("utf8"),
    $ = load(html),
    issues: string[] = [];
  const evidence = {
    url: page.evidence.url,
    sourceHash: page.evidence.contentHash,
    checkedAt: page.evidence.fetchedAt,
    summary:
      "Official Pepper Lunch Singapore static directory; card IDs, marker records, addresses and branch types checked.",
  };
  const cards = $(
    'main .branchlist__container .branch__item[data-region="Singapore"]',
  );
  const markerText = html.match(/var markersOnMap\s*=\s*\[([\s\S]*?)\];/)?.[1];
  const markers = [
    ...(markerText ?? "").matchAll(
      /\{placeName:\s*'([^'\\]*)',placeDetails:\s*'([^'\\]*)',placeRegion:\s*'Singapore',placeBranch:\s*'(PLR|PLE)',placeAddress:\s*'([^'\\]*)',placeTel:\s*'[^'\\]*',LatLng:\s*\[\{\s*lat:[\d.-]+,\s*lng:[\d.-]+\}\]\}/g,
    ),
  ];
  const ids: string[] = [],
    branches: MerchantBranch[] = [];
  const types = new Set<string>();
  cards.each((_index, el) => {
    const card = $(el),
      id = card.attr("data-marker") ?? "",
      type = card.attr("data-btype") ?? "";
    ids.push(id);
    types.add(type);
    const name = whitespace(card.find("h3.openmap").text());
    const text = whitespace(card.find("td.openmap").last().text());
    const address = text.match(/^(.*?Singapore\s+\d{6})/)?.[1] ?? "";
    const marker = markers[Number(id)];
    if (
      !/^\d+$/.test(id) ||
      !marker ||
      normalizeIdentity(marker[1]) !== normalizeIdentity(name) ||
      marker[3] !== type ||
      whitespace(marker[4]).match(/^(.*?Singapore\s+\d{6})/)?.[1] !== address
    )
      issues.push(`directory_card_marker_conflict:${name}`);
    if (!address || !/\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/.test(text))
      issues.push(`directory_branch_unverified:${name}`);
    if (/coming soon|temporar|permanently closed/i.test(text))
      issues.push(`directory_branch_status_unresolved:${name}`);
    // A type filter is permitted only by explicit promotion scope wording, never a decorative tag.
    const restaurantOnly = /\ball Pepper Lunch restaurants\b/i.test(
      wording ?? "",
    );
    const expressOnly = /\ball Pepper Lunch Express (?:outlets|stores)\b/i.test(
      wording ?? "",
    );
    if ((restaurantOnly && type !== "PLR") || (expressOnly && type !== "PLE"))
      return;
    branches.push({
      name,
      address,
      postalCode: address.match(/\d{6}$/)?.[0] ?? "",
      unit: address.match(/#[\w/-]+/)?.[0] ?? "",
      status: "operating",
      existenceEvidence: [evidence],
    });
  });
  const navTypes = new Set(
    $('.branch__container-swipe .Singapore select[name="branch"] option')
      .map((_i, el) => $(el).attr("value"))
      .get()
      .filter((v) => v !== "all"),
  );
  if (
    !html.includes("</html>") ||
    !cards.length ||
    !markerText ||
    cards.length !== markers.length ||
    new Set(ids).size !== cards.length ||
    ids.some((id, i) => id !== String(i)) ||
    [...types].some((type) => !navTypes.has(type)) ||
    [...navTypes].some((type) => !types.has(type))
  )
    issues.push("incomplete_pepper_directory_enumeration");
  if (
    $(
      'main .branchlist__container a[rel="next"], main .branchlist__container [class*="load-more"], main .branchlist__container button',
    ).length
  )
    issues.push("unresolved_pepper_directory_pagination");
  if (new Set(branches.map((b) => b.address)).size !== branches.length)
    issues.push("duplicate_pepper_branch_address");
  const complete = issues.length === 0;
  return {
    branches,
    authoritative: complete,
    fullyTraversed: complete,
    pages: [evidence],
    officialCount: null,
    issues: [...new Set(issues)],
  };
}
export class PepperOutletProvider implements MerchantOutletProvider {
  private snapshot: Promise<DirectorySnapshot> | undefined;
  constructor(
    private wording: string | null,
    private transport?: DirectTransport,
  ) {}
  supports(merchant: string) {
    return merchant === "Pepper Lunch";
  }
  async getSingaporeBranches(merchant: string) {
    if (!this.supports(merchant))
      throw new Error("unsupported_directory_merchant");
    return (this.snapshot ??= (async () => {
      // Fixed linked official directory, using the same bounded DNS-pinned transport.
      const source = sourceDefinition("pepper_lunch_sg");
      const http = new BoundedDirectFetch(
        { ...source, listingUrls: [pepperOutletUrl] },
        this.transport,
        undefined,
        { maxRequests: 4, maxListingPages: 1 },
      );
      const page = await http.fetch(pepperOutletUrl, "listing");
      const directory = parsePepperOutlets(page, this.wording);
      if (!directory.authoritative)
        throw new Error("unverified_pepper_directory");
      return directory;
    })());
  }
}
