import { load } from "cheerio";
import { ResolutionCache, fetchText } from "./cache";
import type {
  DirectorySnapshot,
  MerchantOutletProvider,
  MerchantBranch,
  Evidence,
} from "./types";
export const genkiUrl = "https://www.genkisushi.com.sg/locate-us/";
export class GenkiOutletProvider implements MerchantOutletProvider {
  constructor(
    private cache: ResolutionCache,
    private fetcher: typeof fetch = fetch,
  ) {}
  supports(merchant: string) {
    return /^genki sushi$/i.test(merchant.trim());
  }
  async getSingaporeBranches(merchant: string): Promise<DirectorySnapshot> {
    if (!this.supports(merchant)) throw new Error("Unsupported merchant");
    return (
      await this.cache.get(
        "directory:genki-sg",
        genkiUrl,
        3600_000,
        async () => {
          const page = await this.cache.get(
            "source-page:" + genkiUrl,
            genkiUrl,
            3600_000,
            () => fetchText(genkiUrl, {}, this.fetcher),
          );
          return parseGenkiDirectory(page.value, {
            url: genkiUrl,
            checkedAt: page.checkedAt,
            sourceHash: page.sourceHash,
            summary:
              "Official Singapore static outlet locator; all outlet cards inspected.",
          });
        },
      )
    ).value;
  }
}
export function parseGenkiDirectory(
  html: string,
  evidence: Evidence,
): DirectorySnapshot {
  const $ = load(html),
    branches: MerchantBranch[] = [],
    issues: string[] = [];
  const cards = $(".locate-us .locations > .list[data-id]");
  const ids: string[] = [];
  cards.each((_, el) => {
    const card = $(el);
    ids.push(card.attr("data-id")!);
    const name = card.find("h4").text().trim();
    const content = card.find("p").html() ?? "";
    const text = load(content.replace(/<br\s*\/?\s*>/gi, "\n")).text();
    const address =
      text
        .match(/^([\s\S]*?Singapore\s+\d{6})/i)?.[1]
        .replace(/\s+/g, " ")
        .trim() ?? "";
    const postalCode = address.match(/\b\d{6}\b/)?.[0] ?? "";
    const status = /temporar(?:ily|y)/i.test(text + name)
      ? "temporarily_unavailable"
      : /coming soon|opening soon/i.test(text + name)
        ? "coming_soon"
        : /permanently closed|closed down/i.test(text + name)
          ? "closed"
          : "operating";
    if (
      !name ||
      !address ||
      (status === "operating" && !/Operating Hours:/i.test(text))
    )
      issues.push(`invalid_directory_card:${name || ids.at(-1)}`);
    branches.push({
      name,
      address,
      postalCode,
      unit: address.match(/#[\w/-]+/)?.[0] ?? "",
      status,
      existenceEvidence: [evidence],
    });
  });
  if (!cards.length || !html.includes("</html>"))
    issues.push("incomplete_directory_document");
  if (new Set(ids).size !== ids.length || ids.some((id, i) => id !== String(i)))
    issues.push("directory_sequence_gap");
  if ($(".locate-us .map-wrap[data-id]").length !== cards.length)
    issues.push("directory_tab_count_mismatch");
  if (
    $('.locate-us [rel="next"], .locate-us .pagination, .locate-us .load-more')
      .length ||
    /load more|next page/i.test($(".locate-us").text())
  )
    issues.push("unconsumed_directory_pagination");
  const count = $(".locate-us")
    .text()
    .match(/\b(\d+)\s+(?:stores|outlets|branches)\b/i);
  const officialCount = count ? +count[1] : null;
  if (officialCount !== null && officialCount !== branches.length)
    issues.push("official_count_mismatch");
  if (
    new Set(branches.map((b) => b.address.toLowerCase())).size !==
    branches.length
  )
    issues.push("duplicate_directory_address");
  return {
    branches,
    authoritative: true,
    fullyTraversed: !issues.length,
    pages: [evidence],
    officialCount,
    issues,
  };
}
