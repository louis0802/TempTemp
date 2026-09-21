import type { ParsedOffer } from "../resolution/parser";
import { plain } from "../resolution/patterns";
/** Source-only enrichment; historical benchmark labels are never read here. */
export function mvpContent(offer: ParsedOffer): ParsedOffer {
  const p = { ...offer };
  p.merchant = p.merchant.replace(/^\[GIVEAWAY\]\s*/i, "");
  const heading = plain(p.text.split("\n")[0])
    .replace(/\s*\(https?:\/\/[^)]+\)/g, "")
    .trim();
  if (p.merchant.includes("(https")) {
    p.merchant = "";
    p.title = heading;
  }
  const freeEntry = heading.match(/^Free entry to (.+?)[’']s .+$/i);
  if (freeEntry) {
    p.merchant = freeEntry[1];
    p.title = heading;
  }
  const voucher = heading.match(/^Free \$\d+ (.+?) Voucher with /i);
  if (voucher) {
    p.merchant = voucher[1];
    p.title = heading;
  }
  const editorial = p.text.includes("Read more:") && !/^➡/mu.test(p.text);
  const dash = heading.match(/^(.+)\s+[–—]\s+([^–—]+)$/);
  if (editorial && dash) {
    p.merchant = dash[2].trim();
    p.title = dash[1].trim();
  }
  if (/https?:|^\$|\[Unsupported/.test(p.merchant)) p.merchant = "";
  if (!p.title || /^\s*—/.test(p.title)) p.title = heading;
  const possessiveCampaign = p.merchant.match(
    /^(.+?)[’']s\s+(.+(?:Bundle|Set).*)$/i,
  );
  if (possessiveCampaign) {
    p.merchant = possessiveCampaign[1];
    p.title = heading;
  }
  if (/\[Unsupported/i.test(p.text)) {
    p.merchant = "";
    p.title = "";
    p.benefit = "";
  }
  // A link alone is not an extracted offer proposition.
  if (/^(?:https?:\/\/|(?:tco\.sg|bit\.ly)\/)/i.test(p.title)) p.title = "";
  // Inclusion comes from the curated corpus, not strict savings heuristics.
  // A source-owned title is a display proposition; never synthesize savings.
  p.benefit = p.benefit || p.title;
  p.genuine = true;
  p.nonPromotion = false;
  return p;
}
