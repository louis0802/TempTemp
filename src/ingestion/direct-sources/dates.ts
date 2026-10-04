const months = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
const month =
  "(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)";
function date(day: string, name: string, year: string): string | null {
  const index = months.findIndex((m) => m.startsWith(name.toLowerCase()));
  const value = `${year}-${String(index + 1).padStart(2, "0")}-${day.padStart(2, "0")}`;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number(year) >= 2000 &&
    Number(year) <= 2100 &&
    !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value
    ? value
    : null;
}
/** Only explicit campaign text; never supplied publication metadata. */
export function campaignDates(lines: string[]): {
  startDate: string | null;
  endDate: string | null;
  quote: string | null;
  issue: string | null;
} {
  const found: {
    startDate: string | null;
    endDate: string | null;
    quote: string;
  }[] = [];
  let unsupported = false;
  for (const line of lines) {
    const range = line.match(
      new RegExp(
        `\\b(\\d{1,2}) ${month}(?: (20\\d{2}))?\\s*(?:to|[–—-])\\s*(\\d{1,2}) ${month} (20\\d{2})\\b`,
        "i",
      ),
    );
    if (range) {
      if (
        !date(range[1], range[2], range[3] ?? range[6]) ||
        !date(range[4], range[5], range[6])
      )
        return {
          startDate: null,
          endDate: null,
          quote: null,
          issue: "validity_unparsed",
        };
      found.push({
        startDate: date(range[1], range[2], range[3] ?? range[6]),
        endDate: date(range[4], range[5], range[6]),
        quote: line,
      });
      continue;
    }
    const start = line.match(
      new RegExp(
        `\\b(?:Available from|Valid from|From) (\\d{1,2}) ${month} (20\\d{2})\\b`,
        "i",
      ),
    );
    const end = line.match(
      new RegExp(
        `\\b(?:Valid till|Valid until|Valid to) (\\d{1,2}) ${month} (20\\d{2})\\b`,
        "i",
      ),
    );
    if (start || end)
      found.push({
        startDate: start ? date(start[1], start[2], start[3]) : null,
        endDate: end ? date(end[1], end[2], end[3]) : null,
        quote: line,
      });
    else if (
      /\b(?:valid (?:from|until|till|to)|available from|promotion period|campaign period|limited time)\b/i.test(
        line,
      )
    )
      unsupported = true;
  }
  const starts = [...new Set(found.map((f) => f.startDate).filter(Boolean))];
  const ends = [...new Set(found.map((f) => f.endDate).filter(Boolean))];
  if (
    starts.length > 1 ||
    ends.length > 1 ||
    (starts[0] && ends[0] && starts[0] > ends[0]) ||
    found.some((f) => !f.startDate && !f.endDate)
  )
    return {
      startDate: null,
      endDate: null,
      quote: null,
      issue: "validity_unparsed",
    };
  return {
    startDate: starts[0] ?? null,
    endDate: ends[0] ?? null,
    quote: found.length ? found.map((f) => f.quote).join("\n") : null,
    issue: !found.length && unsupported ? "validity_unparsed" : null,
  };
}
