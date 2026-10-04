import { load } from "cheerio";
import { normalizeIdentity } from "../../resolution/outlets";
import type {
  DirectorySnapshot,
  MerchantBranch,
  MerchantOutletProvider,
} from "../../resolution/types";
import {
  BoundedDirectFetch,
  canonicalUrl,
  type DirectTransport,
} from "../fetch";
import { whitespace } from "../html";
import { sourceDefinition } from "../registry";
import type { FetchedPage } from "../types";
export const shakeOutletUrl = "https://www.shakeshack.com.sg/locations/";
const mapLinks = "main .pp-info-box a[href]";
export function parseShakeOutlets(
  page: FetchedPage,
  details: FetchedPage[] = [],
): DirectorySnapshot {
  const $ = load(page.body.toString()),
    issues: string[] = [];
  const evidence = (p: FetchedPage) => ({
    url: p.evidence.url,
    sourceHash: p.evidence.contentHash,
    checkedAt: p.evidence.fetchedAt,
    summary:
      "Official Shake Shack Singapore count/map/card/detail agreement; no Google branch enumeration.",
  });
  const count = whitespace($("main .showing-post-count").text()).match(
    /^Showing all (\d+) results$/,
  )?.[1];
  const names = new Map<string, string>();
  $(mapLinks).each((_i, el) => {
    const link = $(el),
      href = link.attr("href");
    if (!href) return;
    const url = new URL(href, page.evidence.url);
    if (
      !/^\/shake-restaurants\/[a-z0-9-]+\/$/.test(url.pathname) ||
      url.search ||
      url.origin !== new URL(shakeOutletUrl).origin
    ) {
      issues.push("unresolved_shake_directory_link");
      return;
    }
    const name = whitespace(
      link.find(".pp-info-box-title").text() || link.text(),
    );
    const key = canonicalUrl(url.href);
    if (names.has(key)) issues.push("duplicate_shake_map_branch");
    names.set(key, name);
  });
  const branches: MerchantBranch[] = [],
    seen = new Set<string>();
  const add = (
    name: string,
    address: string,
    p: FetchedPage,
    url: string,
    hours: boolean,
  ) => {
    if (names.get(url) !== name || seen.has(url))
      issues.push(`shake_branch_identity_conflict:${name}`);
    if (
      !/\bSingapore\s+\d{6}\b/.test(address) ||
      !hours ||
      /coming soon|closed|temporar/i.test(address)
    )
      issues.push(`shake_branch_unverified:${name}`);
    seen.add(url);
    branches.push({
      name,
      address,
      postalCode: address.match(/\b\d{6}\b/)?.[0] ?? "",
      unit: address.match(/#[\w/-]+/)?.[0] ?? "",
      status: "operating",
      existenceEvidence: [evidence(page), ...(p === page ? [] : [evidence(p)])],
    });
  };
  $("main .shake-location-wrap").each((_i, el) => {
    const card = $(el),
      href = card.find(".name a.view-button").attr("href");
    if (!href) {
      issues.push("shake_branch_link_missing");
      return;
    }
    add(
      whitespace(card.find(".name span").text()),
      whitespace(card.find(".location").text()),
      page,
      canonicalUrl(href, page.evidence.url),
      !!card.find(".hours li").length,
    );
  });
  for (const p of details) {
    const doc = load(p.body.toString());
    const root = '[data-elementor-type="single-post"]';
    const name = whitespace(doc(`${root} h1`).first().text());
    const address = whitespace(
      doc(`${root} .elementor-widget-text-editor`).first().text(),
    );
    add(
      name,
      address,
      p,
      canonicalUrl(p.evidence.requestedUrl),
      /Opening Hours:/i.test(doc(root).text()),
    );
  }
  if (
    !count ||
    Number(count) !== names.size ||
    names.size !== branches.length ||
    [...names.keys()].some((url) => !seen.has(url)) ||
    new Set([...names.values()].map(normalizeIdentity)).size !== names.size ||
    !page.body.toString().includes("</html>")
  )
    issues.push("incomplete_shake_directory_enumeration");
  if (
    $(
      'main .pagination a, main [class*="load-more"], main [class*="load_more"]',
    ).length
  )
    issues.push("unresolved_shake_directory_pagination");
  if (new Set(branches.map((b) => b.address)).size !== branches.length)
    issues.push("duplicate_shake_branch_address");
  return {
    branches,
    authoritative: !issues.length,
    fullyTraversed: !issues.length,
    pages: [evidence(page), ...details.map(evidence)],
    officialCount: count ? Number(count) : null,
    issues: [...new Set(issues)],
  };
}
export class ShakeShackOutletProvider implements MerchantOutletProvider {
  private snapshot: Promise<DirectorySnapshot> | undefined;
  constructor(private transport?: DirectTransport) {}
  supports(merchant: string) {
    return merchant === "Shake Shack";
  }
  async getSingaporeBranches(merchant: string) {
    if (!this.supports(merchant))
      throw new Error("unsupported_directory_merchant");
    return (this.snapshot ??= (async () => {
      const http = new BoundedDirectFetch(
        {
          ...sourceDefinition("shake_shack_sg"),
          listingUrls: [shakeOutletUrl],
        },
        this.transport,
      );
      const page = await http.fetch(shakeOutletUrl, "listing"),
        $ = load(page.body.toString());
      const cards = new Set(
        $("main .shake-location-wrap .name a.view-button")
          .map((_i, e) => canonicalUrl($(e).attr("href")!, page.evidence.url))
          .get(),
      );
      const linked = http.discover(
        page,
        mapLinks,
        "detail",
        (url) =>
          url.origin === new URL(shakeOutletUrl).origin &&
          /^\/shake-restaurants\/[a-z0-9-]+\/$/.test(url.pathname) &&
          !url.search,
      );
      const details: FetchedPage[] = [];
      for (const url of linked)
        if (!cards.has(url)) details.push(await http.fetch(url, "detail"));
      const snapshot = parseShakeOutlets(page, details);
      if (!snapshot.authoritative)
        throw new Error(
          `unverified_shake_directory:${snapshot.issues.join(",")}`,
        );
      return snapshot;
    })());
  }
}
