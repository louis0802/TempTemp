import type { SourceLink } from "./types";

export function normalizeUrl(value: string): string {
  const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("unsupported_scheme");
  url.hash = "";
  return url.href;
}

/** Bare URLs are accepted only as stand-alone domain/path tokens, never inside another scheme. */
export function extractLinks(text: string, sourceUrl: string): SourceLink[] {
  const tokens = [
    ...text.matchAll(
      /(?:[a-z][a-z0-9+.-]*:\/\/[^\s<>"\[\]()]+|(?<![\w@/:.-])(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}\/[^\s<>"\[\]()]*)/gi,
    ),
  ];
  const source = new URL(sourceUrl);
  const links = new Map<string, SourceLink>();
  // Bare printed labels may accompany an explicit HTTP URL: prefer the explicit scheme.
  const cleaned = tokens.map((m) =>
    m[0].replace(/[.,;!?]+$/, "").replace(/\)+$/, ""),
  );
  const explicit = new Map<string, string>();
  for (const raw of cleaned)
    if (/^https?:\/\//i.test(raw)) {
      try {
        const url = normalizeUrl(raw);
        explicit.set(url.replace(/^https?:/, ""), url);
      } catch {
        /* Not a URL. */
      }
    }
  for (const raw of cleaned) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^https?:\/\//i.test(raw))
      continue;
    try {
      let normalized = normalizeUrl(raw);
      if (!/^https?:\/\//i.test(raw))
        normalized =
          explicit.get(normalized.replace(/^https?:/, "")) ?? normalized;
      const url = new URL(normalized);
      const path = url.pathname.replace(/\/$/, "");
      if (
        url.hostname === source.hostname &&
        (path === source.pathname.replace(/\/$/, "") ||
          path === `/${source.pathname.split("/")[1]}`)
      )
        continue;
      const found = links.get(normalized);
      if (found) {
        if (!found.originalRepresentations.includes(raw))
          found.originalRepresentations.push(raw);
      } else
        links.set(normalized, {
          originalUrl: raw,
          originalRepresentations: [raw],
          normalizedUrl: normalized,
          association: "source_post",
        });
    } catch {
      /* Invalid text is not a network target. */
    }
  }
  return [...links.values()].sort((a, b) =>
    a.normalizedUrl.localeCompare(b.normalizedUrl),
  );
}
