import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { load } from "cheerio";
import { normalizeSourceText } from "../../src/ingestion/promotion-nlp/schema";

export interface CaptureRecipe {
  file: string;
  sha256: string;
  url: string;
  relation: "listing" | "detail";
  fetchedAt: string;
  selectors: string[];
  mode: "dom" | "instagram-caption";
  exclude: string[];
}
export const hashCapture = (body: Uint8Array | string) =>
  createHash("sha256").update(body).digest("hex");
/** Local capture verification only. No adapter enumeration, transport or network calls. */
export async function readCapturedText(
  recipe: CaptureRecipe,
  root = process.cwd(),
) {
  if (
    !recipe.file.startsWith("tests/fixtures/") ||
    recipe.file.split(/[\\/]/).includes("..")
  )
    throw new Error("nlp_capture_path_invalid");
  const body = await readFile(path.join(root, recipe.file));
  if (hashCapture(body) !== recipe.sha256)
    throw new Error("nlp_capture_hash_mismatch");
  return { body, text: isolateCapturedText(body.toString("utf8"), recipe) };
}
export function isolateCapturedText(
  html: string,
  recipe: Pick<CaptureRecipe, "selectors" | "mode" | "exclude">,
) {
  const $ = load(html);
  if (recipe.mode === "instagram-caption") {
    const title = $("meta[property='og:title']").attr("content") ?? "";
    const caption = title.match(/ on Instagram: "([\s\S]*)"$/)?.[1];
    if (!caption) throw new Error("nlp_captured_caption_missing");
    return normalizeSourceText(caption);
  }
  return normalizeSourceText(
    recipe.selectors
      .map((selector) => {
        const elements = $(selector);
        if (!elements.length) throw new Error("nlp_capture_selector_missing");
        const clone = elements.clone();
        clone
          .find(["script", "style", "noscript", ...recipe.exclude].join(","))
          .remove();
        clone.find("br").replaceWith(" ");
        clone.find("p,li,div,h1,h2,h3,h4").append(" ");
        return clone.text();
      })
      .join(" "),
  );
}
