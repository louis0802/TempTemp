import { load } from "cheerio";
import { z } from "zod";
import type { DirectSourceAdapter, DirectSourceContext } from "../adapter";
import { cite, finalizeCandidate, newCandidate } from "../candidate";
import { acquisitionIssue, whitespace } from "../html";
import type {
  DetailResult,
  EnumerationResult,
  FetchedPage,
  ListingEntry,
} from "../types";

export const dianXiaoErPromoUrl = "https://www.dianxiaoer.com.sg/promo";
const galleryId = "comp-m593fqa4";
const gallery = `#${galleryId}[data-testid="slide-show-gallery"]`;
const imageSchema = z.object({
  imageData: z.object({
    uri: z.string().regex(/^acbb52_[a-f0-9]{32}~mv2\.(?:jpg|png|jpeg|webp)$/),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
});

function renderedCards(page: FetchedPage) {
  const $ = load(page.body.toString()),
    root = $(gallery);
  if (page.evidence.url !== dianXiaoErPromoUrl || root.length !== 1)
    throw new Error("dian_gallery_structure_changed");
  function card(element: Parameters<typeof $>[0]) {
    const node = $(element),
      titleNode = node.find('[data-testid="gallery-item-title"]');
    const captionNode = node.find('[data-testid="gallery-item-description"]');
    const image = node.find("wow-image[data-image-info]"),
      img = image.find("img");
    const identity = node.find(
      '[data-testid="gallery-item-click-action-image-zoom"]',
    );
    if (
      titleNode.length !== 1 ||
      captionNode.length !== 1 ||
      image.length !== 1 ||
      img.length !== 1 ||
      identity.length !== 1
    )
      throw new Error("dian_card_identity_unresolved");
    const title = whitespace(titleNode.text()),
      caption = whitespace(captionNode.text());
    if (
      !title ||
      whitespace(identity.attr("aria-label") ?? "") !== title ||
      whitespace(img.attr("alt") ?? "") !== title
    )
      throw new Error("dian_card_text_association_unresolved");
    const { imageData } = imageSchema.parse(
      JSON.parse(image.attr("data-image-info")!),
    );
    const imageUrl = new URL(img.attr("src")!);
    if (
      imageUrl.origin !== "https://static.wixstatic.com" ||
      !imageUrl.pathname.startsWith(`/media/${imageData.uri}/`)
    )
      throw new Error("dian_image_identity_unresolved");
    return {
      nativeId: `${galleryId}:${imageData.uri}`,
      title,
      caption,
      image: { ...imageData, url: imageUrl.href },
    };
  }
  const ghosts = root
    .find('[data-testid="gallery-item-ghost"]')
    .toArray()
    .map(card);
  const current = root
    .find('[data-testid="gallery-item-item"]')
    .toArray()
    .map(card);
  if (
    !ghosts.length ||
    current.length !== 1 ||
    new Set(ghosts.map((c) => c.nativeId)).size !== ghosts.length
  )
    throw new Error("duplicate_gallery_identity");
  const mirror = ghosts.find((c) => c.nativeId === current[0].nativeId);
  if (!mirror || JSON.stringify(mirror) !== JSON.stringify(current[0]))
    throw new Error("gallery_current_identity_conflict");
  const counter = root.find('[data-testid="gallery-counter"]');
  const match = whitespace(counter.text()).match(/^(\d+)\/(\d+)$/);
  if (
    counter.length !== 1 ||
    !match ||
    Number(match[1]) < 1 ||
    Number(match[1]) > Number(match[2]) ||
    ghosts.length > Number(match[2])
  )
    throw new Error("gallery_counter_unresolved");
  return { cards: ghosts, total: Number(match[2]), $ };
}

export class DianXiaoErAdapter implements DirectSourceAdapter {
  readonly sourceId = "dian_xiao_er_sg" as const;
  async enumerate(ctx: DirectSourceContext): Promise<EnumerationResult> {
    const result: EnumerationResult = {
      entries: [],
      evidence: [],
      complete: false,
      issues: [],
      pagination: {
        requested: [dianXiaoErPromoUrl],
        discovered: [],
        unresolved: [],
      },
      observedAt: ctx.observedAt,
    };
    try {
      const page = await ctx.http.fetch(dianXiaoErPromoUrl, "listing");
      result.evidence.push(page.evidence);
      const parsed = renderedCards(page);
      result.entries = parsed.cards.map((c) => ({
        canonicalUrl: dianXiaoErPromoUrl,
        listingUrl: dianXiaoErPromoUrl,
        nativeId: c.nativeId,
        title: c.title,
        evidenceId: page.evidence.id,
        relation: "detail",
        metadata: {
          merchant: null,
          description: c.caption,
          selector: `${gallery} card[imageData.uri=${c.image.uri}]`,
        },
      }));
      if (
        parsed.cards.length !== parsed.total ||
        parsed.$(
          `${gallery} [data-testid="gallery-nextButton"],${gallery} [data-infinite-scroll],${gallery} [class*="load-more"]`,
        ).length
      ) {
        result.pagination.unresolved.push(dianXiaoErPromoUrl);
        result.issues.push({
          code: "pagination_unresolved",
          url: dianXiaoErPromoUrl,
          relation: "listing",
        });
      }
    } catch (error) {
      result.issues.push(
        acquisitionIssue(error, dianXiaoErPromoUrl, "listing"),
      );
    }
    result.issues.push(
      ...["partial_enumeration", "lightbox_mapping_unresolved"].map((code) => ({
        code,
        url: dianXiaoErPromoUrl,
        relation: "listing" as const,
      })),
    );
    return result;
  }
  async extract(
    entry: ListingEntry,
    _detail: DetailResult | null,
    ctx: DirectSourceContext,
  ) {
    const page = ctx.http.capturedPages.find(
      (p) => p.evidence.id === entry.evidenceId,
    );
    if (!page) throw new Error("missing_listing_evidence");
    const card = renderedCards(page).cards.find(
      (c) => c.nativeId === entry.nativeId,
    );
    if (!card) throw new Error("dian_card_identity_unresolved");
    const candidate = newCandidate(entry, ctx, []),
      selector = entry.metadata.selector;
    candidate.merchant = "Dian Xiao Er";
    cite(
      candidate,
      "merchant",
      page.evidence.id,
      "official promo collection (ownership remains probable)",
      "Dian Xiao Er",
    );
    candidate.title = card.title;
    cite(
      candidate,
      "title",
      page.evidence.id,
      `${selector} gallery-item-title`,
      card.title,
    );
    candidate.description = [card.title, card.caption]
      .filter(Boolean)
      .join("\n");
    cite(
      candidate,
      "description",
      page.evidence.id,
      `${selector} own title/caption`,
      candidate.description,
    );
    const selected = card.caption.match(/^Selected outlets:\s*(.+)$/i);
    if (selected) {
      candidate.locationScope = "selected_outlets";
      candidate.locationWording = card.caption;
      candidate.locationNames = selected[1]
        .split(/,\s*|\s*&\s*/)
        .map(whitespace)
        .filter(Boolean);
      cite(
        candidate,
        "locations",
        page.evidence.id,
        `${selector} gallery-item-description`,
        card.caption,
      );
      candidate.issues.push("official_outlet_resolution_unavailable");
    }
    candidate.evidence = candidate.evidence.map((e) => ({
      ...e,
      notes: [
        ...e.notes,
        `image_metadata:${JSON.stringify(card.image)}`,
        "No image fetch/OCR; native card identity is not a lightbox identity.",
      ],
    }));
    candidate.issues.push(
      "image_only_campaign_facts",
      "lightbox_mapping_unresolved",
    );
    return [finalizeCandidate(candidate)];
  }
}
