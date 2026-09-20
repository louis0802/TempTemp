import { load } from "cheerio";
import { ResolutionCache } from "./cache";
import { auditedDirectory, officialDirectoryPage } from "./official-directory";
import { normalizeIdentity } from "./outlets";
import type { Evidence, MerchantBranch, MerchantOutletProvider } from "./types";

export const papisUrl = "https://www.papis-tacos.com/";
const countWords = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];
export function parsePapisDirectory(html: string, evidence: Evidence) {
  const $ = load(html);
  const issues: string[] = [];
  const headings = $("main h1")
    .toArray()
    .map((el) => $(el).text().trim())
    .filter((text) => /^Visit us at our /i.test(text));
  const countToken =
    headings.length === 1
      ? headings[0]
          .match(/^Visit us at our (\w+) convenient locations\b/i)?.[1]
          .toLowerCase()
      : undefined;
  const parsedCount = countToken
    ? /^\d+$/.test(countToken)
      ? Number(countToken)
      : countWords.indexOf(countToken)
    : 0;
  const officialCount = parsedCount > 0 ? parsedCount : null;
  if (officialCount === null) issues.push("missing_official_count");
  if (!/<\/body>\s*<\/html>\s*$/i.test(html))
    issues.push("incomplete_directory_document");
  if (!/heart of Singapore/i.test($("main").text()))
    issues.push("singapore_directory_scope_unproven");
  if (
    $('[rel="next"], main .pagination, main .load-more, main [data-next-page]')
      .length ||
    /load more|next page/i.test($("main").text())
  )
    issues.push("unconsumed_directory_pagination");
  const branches: MerchantBranch[] = [];
  const cards = $("main .image-card");
  cards.each((_, el) => {
    const card = $(el);
    const title = card.find(".image-title").text().trim();
    const name = title.match(/^Papi[’']s tacos\s*-\s*(.+)$/i)?.[1].trim() ?? "";
    const lines = card
      .find(".image-subtitle p")
      .toArray()
      .map((p) => $(p).text().replace(/\s+/g, " ").trim());
    const addresses = lines.filter(
      (line) => /^\d+\s/.test(line) && /\b\d{6}$/.test(line),
    );
    const address = addresses.length === 1 ? addresses[0] : "";
    const text = [title, ...lines].join("\n");
    const status: MerchantBranch["status"] =
      /temporar(?:ily|y).*clos|temporar(?:ily|y).*unavailable/i.test(text)
        ? "temporarily_unavailable"
        : /permanently closed|closed down/i.test(text)
          ? "closed"
          : /coming soon|opening soon/i.test(text)
            ? "coming_soon"
            : "operating";
    const days = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const nonSchedule = lines
      .filter(
        (line) => !days.some((day) => new RegExp(`^${day}\\b`, "i").test(line)),
      )
      .join("\n");
    if (
      status === "operating" &&
      /closed|closure|renovat|relocat|suspend|unavailable/i.test(nonSchedule)
    )
      issues.push(`unproven_branch_status:${name}`);
    // A weekly day marked Closed is not a permanent branch closure.
    if (
      status === "operating" &&
      (days.some(
        (day) => !new RegExp(`\\b${day}\\s+(?:\\d|closed)`, "i").test(text),
      ) ||
        !days.some((day) => new RegExp(`\\b${day}\\s+\\d`, "i").test(text)) ||
        /(?:temporar|permanent|coming soon|opening soon)/i.test(text))
    )
      issues.push(`unproven_branch_status:${name}`);
    if (
      !name ||
      addresses.length !== 1 ||
      /\b(?:Malaysia|Indonesia|Thailand|Australia|United States)\b/i.test(
        address,
      )
    )
      issues.push(`invalid_directory_card:${name}`);
    branches.push({
      name,
      address,
      postalCode: address.match(/\b\d{6}$/)?.[0] ?? "",
      unit: address.match(/#[\w/-]+/)?.[0] ?? "",
      status,
      existenceEvidence: [evidence],
    });
  });
  // Header lists all locations independently of the content cards (desktop/mobile copies deduplicated).
  const navigation = new Set(
    $("header a[href$='-home']")
      .toArray()
      .map((el) => normalizeIdentity($(el).text())),
  );
  const names = new Set(branches.map((b) => normalizeIdentity(b.name)));
  if (
    !navigation.size ||
    navigation.size !== names.size ||
    [...navigation].some((name) => !names.has(name))
  )
    issues.push("directory_navigation_mismatch");
  return auditedDirectory({
    html,
    evidence,
    officialUrl: papisUrl,
    branches,
    officialCount,
    traversalEstablished: !issues.length,
    issues,
  });
}

export class PapisOutletProvider implements MerchantOutletProvider {
  constructor(
    private cache: ResolutionCache,
    private fetcher: typeof fetch = fetch,
  ) {}
  supports(merchant: string) {
    return normalizeIdentity(merchant) === "papistacos";
  }
  async getSingaporeBranches(merchant: string) {
    if (!this.supports(merchant)) throw new Error("Unsupported merchant");
    const { html, evidence } = await officialDirectoryPage(
      this.cache,
      papisUrl,
      this.fetcher,
    );
    const snapshot = parsePapisDirectory(html, evidence);
    // Never expose malformed or partial cards as usable named-branch evidence.
    if (!snapshot.authoritative || !snapshot.fullyTraversed)
      throw new Error(
        "papis_directory_unverified:" + snapshot.issues.join(","),
      );
    return snapshot;
  }
}
