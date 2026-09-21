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
  const price = /\$\d+(?:\.\d{1,2})?/.test(p.title);
  const campaign =
    /[📅📆]\s*(?:Now\s*(?:-|till)|Today|Every|\d)/iu.test(p.text) &&
    !/end date unspecified|while stocks last/iu.test(
      p.text.split("\n").find((l) => /[📅📆]/u.test(l)) ?? "",
    );
  const special =
    /anniversary|celebrate|limited to first|usual|U\.?P\.?\s*\$|save\b|promo|deal|\bfor \d+\b/i.test(
      p.text,
    );
  if (
    !p.genuine &&
    price &&
    (campaign || special) &&
    !/^NEW\b/i.test(p.title)
  ) {
    p.benefit = p.title;
    p.genuine = true;
  }
  if (
    !p.genuine &&
    /\bcomplimentary\s+(?:plate|drink|dessert)/i.test(p.title)
  ) {
    p.benefit = p.title;
    p.genuine = true;
  }
  if (!p.genuine && /half (?:price|off)/i.test(p.title)) {
    p.benefit = "Half off";
    p.genuine = true;
  }
  const launch = /^NEW\b|\bRETURNS\b|pop-up (?:lands|in)|brand pop-up/i.test(
    p.title,
  );
  const nonoffer =
    /Personality Quiz|Introducing .*Telegram Channel|Dine for Good/i.test(
      heading,
    );
  if (
    !p.genuine &&
    /Food (?:Fair|Festival|Bazaar)|Night Bazaar|GrillFest|F&B Expo|\s-\s/.test(
      heading,
    ) &&
    !p.text.includes("\n")
  )
    p.nonPromotion = true;
  if (
    !p.genuine &&
    ((editorial && !/\bpromos?\b/i.test(p.title)) ||
      launch ||
      nonoffer ||
      /#shoutout\b/.test(p.text) ||
      (/\$\d/.test(p.title) && !campaign && !special))
  )
    p.nonPromotion = true;
  return p;
}
