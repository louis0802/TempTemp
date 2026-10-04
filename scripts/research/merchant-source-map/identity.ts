import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { load } from "cheerio";
import { z } from "zod";
import { normalizeIdentity } from "../../../src/ingestion/resolution/outlets";

export const identityReviewPath = "docs/research/merchant-identity-review.json";
export const aliasSchema = z.object({
  alias: z.string().min(1),
  canonical: z.string().min(1),
  basis: z.literal("merchant_self_identification"),
  reason: z.string().min(1),
  url: z.url(),
  capture_file: z.string().startsWith("tests/fixtures/"),
  capture_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  assertions: z
    .array(
      z.object({
        selector: z.string().min(1),
        attribute: z.string().optional(),
        quote: z.string().min(1),
      }),
    )
    .min(2),
});
export type CanonicalAlias = z.infer<typeof aliasSchema>;
export function canonicalIdentity(
  label: string,
  aliases: readonly CanonicalAlias[] = [],
) {
  const key = normalizeIdentity(label);
  return normalizeIdentity(
    aliases.find((a) => normalizeIdentity(a.alias) === key)?.canonical ?? label,
  );
}
export function validateAliases(
  values: unknown,
  captures: ReadonlyMap<string, string>,
) {
  const aliases = z.array(aliasSchema).parse(values);
  const keys = new Set<string>();
  for (const a of aliases) {
    const key = normalizeIdentity(a.alias);
    if (
      keys.has(key) ||
      key === normalizeIdentity(a.canonical) ||
      aliases.some(
        (b) => normalizeIdentity(b.alias) === normalizeIdentity(a.canonical),
      )
    )
      throw new Error("alias_duplicate_or_cycle");
    keys.add(key);
    const body = captures.get(a.capture_file),
      url = new URL(a.url);
    if (
      !body ||
      url.protocol !== "https:" ||
      /instagram|facebook|t\.me|google/.test(url.hostname) ||
      createHash("sha256").update(body).digest("hex") !== a.capture_sha256
    )
      throw new Error("alias_evidence_invalid");
    const $ = load(body);
    for (const assertion of a.assertions) {
      const node = $(assertion.selector);
      const text = assertion.attribute
        ? node.attr(assertion.attribute)
        : node.text();
      if (node.length !== 1 || !text?.includes(assertion.quote))
        throw new Error("alias_assertion_missing");
    }
    if (
      !a.assertions.some((v) => v.quote.includes(a.alias)) ||
      !a.assertions.some((v) => v.quote.includes(a.canonical))
    )
      throw new Error("alias_labels_not_independently_identified");
  }
  return aliases;
}
export async function readIdentityReview(root: string) {
  const raw = await readFile(path.join(root, identityReviewPath), "utf8");
  const input = z
    .object({ version: z.literal(1), aliases: z.array(aliasSchema) })
    .parse(JSON.parse(raw));
  const captures = new Map<string, string>();
  for (const a of input.aliases) {
    const file = path.resolve(root, a.capture_file);
    if (!file.startsWith(path.join(root, "tests/fixtures") + path.sep))
      throw new Error("alias_capture_path_escape");
    captures.set(a.capture_file, await readFile(file, "utf8"));
  }
  return {
    aliases: validateAliases(input.aliases, captures),
    provenance: {
      file: identityReviewPath,
      sha256: createHash("sha256").update(raw).digest("hex"),
    },
  };
}
