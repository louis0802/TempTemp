import { load } from "cheerio";
import type {
  DirectorySnapshot,
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

export const gourmetVenueUrl = "https://www.royalplaza.com.sg/dine/barista";
export const gourmetVenueName = "Gourmet Carousel - Barista Experience";
export const gourmetVenueAddress =
  "Level 1 (Lobby), Royal Plaza on Scotts, 25 Scotts Road, 228220";

/** Proves this named physical counter only; does not enumerate every Carousel service/venue. */
export function parseGourmetVenue(page: FetchedPage): DirectorySnapshot {
  const $ = load(page.body.toString()),
    issues: string[] = [];
  const paragraphs = $(".blocks-about-dining .better-rich-text > p")
    .map((_i, e) => whitespace($(e).text()))
    .get();
  const address = paragraphs
    .filter((line) => /^📍/.test(line))
    .map((line) => line.replace(/^📍\s*/, ""));
  if (
    canonicalUrl(page.evidence.url) !== gourmetVenueUrl ||
    canonicalUrl(page.evidence.requestedUrl) !== gourmetVenueUrl ||
    page.evidence.httpStatus !== 200 ||
    page.evidence.contentType !== "text/html" ||
    whitespace($(".blocks-hero h1").text()) !== gourmetVenueName ||
    address.length !== 1 ||
    address[0] !== gourmetVenueAddress ||
    !paragraphs.some((line) =>
      /^Part of Carousel, Royal Plaza on Scotts['’] award-winning restaurant\. Halal-certified\.$/.test(
        line,
      ),
    ) ||
    !/^Daily, 7\.30am to 6\.00pm$/.test(
      whitespace($(".blocks-about-dining .timing").text()),
    ) ||
    !page.body.toString().includes("</html>")
  )
    issues.push("gourmet_venue_identity_unverified");
  const evidence = {
    url: page.evidence.url,
    sourceHash: page.evidence.contentHash,
    checkedAt: page.evidence.fetchedAt,
    summary:
      "Official named Gourmet Carousel Barista counter, explicit Royal Plaza/Carousel relationship, fixed lobby address and operating timing; coordinates not inferred.",
  };
  return {
    authoritative: !issues.length,
    fullyTraversed: !issues.length,
    officialCount: null,
    issues,
    pages: [evidence],
    branches: issues.length
      ? []
      : [
          {
            name: gourmetVenueName,
            address: address[0],
            postalCode: "228220",
            unit: "",
            status: "operating",
            existenceEvidence: [evidence],
          },
        ],
  };
}
export class GourmetCarouselVenueProvider implements MerchantOutletProvider {
  private snapshot: Promise<DirectorySnapshot> | undefined;
  constructor(private transport?: DirectTransport) {}
  supports(merchant: string) {
    return merchant === "Gourmet Carousel";
  }
  async getSingaporeBranches(merchant: string) {
    if (!this.supports(merchant))
      throw new Error("unsupported_directory_merchant");
    return (this.snapshot ??= (async () => {
      const http = new BoundedDirectFetch(
        {
          ...sourceDefinition("gourmet_carousel_sg"),
          listingUrls: [gourmetVenueUrl],
        },
        this.transport,
      );
      const snapshot = parseGourmetVenue(
        await http.fetch(gourmetVenueUrl, "listing"),
      );
      if (!snapshot.authoritative)
        throw new Error("gourmet_venue_identity_unverified");
      return snapshot;
    })());
  }
}
