import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import {
  parsePreview,
  collectPreview,
} from "@/ingestion/sources/telegram-preview";
import { suggestRaw } from "@/ingestion/cleanup/raw";
const message = (
  id: number,
  date: string,
  text = "Merchant: Example Cafe<br>Offer: Up to 30% off<br>Terms: selected outlets only",
) =>
  `<div class="tgme_widget_message" data-post="sgfooddeals/${id}"><div class="tgme_widget_message_text">${text}</div><a class="tgme_widget_message_date"><time datetime="${date}"></time></a></div>`;
const html = (id: number, date: string) =>
  message(id, date) + `<a class="tme_messages_more" data-before="${id}"></a>`;
describe("Public preview adapter", () => {
  it("preserves source identity, timestamps and commercial qualifiers", () => {
    const result = parsePreview(
      html(12, "2026-09-15T01:00:00+00:00"),
      "sgfooddeals",
    );
    expect(result.posts[0].messageId).toBe(12);
    expect(result.posts[0].publishedAt).toBe("2026-09-15T01:00:00.000Z");
    expect(result.posts[0].text).toContain(
      "Up to 30% off\nTerms: selected outlets only",
    );
    expect(result.before).toBe(12);
  });
  it("follows decreasing pages until the requested date is covered", async () => {
    const urls: string[] = [];
    const result = await collectPreview(
      "sgfooddeals",
      DateTime.fromISO("2026-09-01T00:00:00Z"),
      {
        now: DateTime.fromISO("2026-09-16T00:00:00Z"),
        paceMs: 0,
        fetchPage: async (url) => {
          urls.push(url);
          return urls.length === 1
            ? html(12, "2026-09-15T00:00:00Z")
            : html(11, "2026-08-30T00:00:00Z");
        },
      },
    );
    expect(urls[1]).toContain("before=12");
    expect(result.data.posts).toHaveLength(2);
    expect(result.pages).toBe(2);
  });
  it("fails on challenge pages, wrong source, missing dates and pagination loops", async () => {
    expect(() =>
      parsePreview("<html>Please log in</html>", "sgfooddeals"),
    ).toThrow();
    expect(() => parsePreview(message(1, "bad"), "sgfooddeals")).toThrow();
    expect(() =>
      parsePreview(message(1, "2026-09-01"), "tastesoulsg"),
    ).toThrow();
    await expect(
      collectPreview("sgfooddeals", DateTime.fromISO("2026-09-01"), {
        now: DateTime.fromISO("2026-09-16"),
        paceMs: 0,
        fetchPage: async () => html(12, "2026-09-15T00:00:00Z"),
      }),
    ).rejects.toThrow("did not progress");
  });
  it("does not claim complete history after reaching a page limit", async () => {
    await expect(
      collectPreview("sgfooddeals", DateTime.fromISO("2026-09-01"), {
        maxPages: 1,
        paceMs: 0,
        fetchPage: async () => html(12, "2026-09-15T00:00:00Z"),
      }),
    ).rejects.toThrow("page limit");
  });
  it("rechecks older active post references and reports missing posts without claiming deletion", async () => {
    const result = await collectPreview(
      "sgfooddeals",
      DateTime.fromISO("2026-09-01"),
      {
        now: DateTime.fromISO("2026-09-16"),
        activeIds: [5],
        paceMs: 0,
        fetchPage: async (url) =>
          url.includes("before=6")
            ? html(4, "2026-08-01T00:00:00Z")
            : html(12, "2026-08-30T00:00:00Z"),
      },
    );
    expect(result.unavailableActivePosts).toEqual([5]);
  });
});
describe("Raw review suggestions", () => {
  it("extracts only explicit fields while preserving complete terms", () => {
    const text =
      "Merchant: Example Cafe\nOffer: Up to 30% off\n2026-12-30 to 2027-01-02\nFrom $12++ at selected outlets. Terms in image.";
    const suggestion = suggestRaw(text, "2026-12-01T00:00:00Z");
    expect(suggestion.data.merchant).toBe("Example Cafe");
    expect(suggestion.data.startDate).toBe("2026-12-30");
    expect(suggestion.data.terms).toEqual([text]);
    expect(suggestion.issues).toContain("raw_extraction_requires_verification");
    expect(suggestion.issues).toContain("image_dependent_terms");
  });
  it("resolves today from source date and refuses ambiguous years", () => {
    expect(
      suggestRaw("1-for-1 today only", "2026-09-01T17:00:00Z").data.endDate,
    ).toBe("2026-09-02");
    expect(
      suggestRaw("1-for-1 until 2 Jan", "2026-12-31T00:00:00Z").data.endDate,
    ).toBe(null);
  });
  it("flags non-offers, online-only items and possible roundups for review", () => {
    expect(
      suggestRaw("Our restaurant opened today", "2026-09-01T00:00:00Z").issues,
    ).toContain("no_explicit_promotional_benefit");
    expect(
      suggestRaw("1. 30% off online only\n2. free tea", "2026-09-01T00:00:00Z")
        .issues,
    ).toContain("possible_roundup_do_not_share_terms");
  });
});

import { hourlyLoop } from "@/ingestion/hourly";
it("hourly worker continues after failures without overlapping runs and stops cleanly", async () => {
  const controller = new AbortController();
  let calls = 0;
  const waits: number[] = [];
  await hourlyLoop(
    async () => {
      calls++;
      if (calls === 1) throw new Error("temporary");
      if (calls === 3) controller.abort();
    },
    controller.signal,
    {
      wait: async (ms) => {
        waits.push(ms);
        if (waits.length > 5)
          throw new Error("Worker failed to execute or stop");
      },
    },
  );
  expect(calls).toBe(3);
  expect(waits).toHaveLength(2);
  expect(waits.every((ms) => ms > 3_590_000 && ms <= 3_600_000)).toBe(true);
});

import { suggestRawCandidates } from "@/ingestion/cleanup/raw";
it("suggests source-shaped headers and keeps roundup terms separate", () => {
  const sg = suggestRaw(
    "Example Cafe: 1-for-1 Drinks\n📅 Now till 18 Sep\n📍 Example Mall, #01-01",
    "2026-09-15T00:00:00Z",
    "sgfooddeals",
  );
  expect(sg.data.merchant).toBe("Example Cafe");
  expect(sg.data.endDate).toBe("2026-09-18");
  expect(sg.issues).toContain("date_year_or_start_inferred_from_post_verify");
  const taste = suggestRaw(
    "🍵 Example Tea 🍵\n➡️ 30% OFF drinks\n📆 Now - 2 Jan",
    "2026-12-30T00:00:00Z",
    "tastesoulsg",
  );
  expect(taste.data.merchant).toBe("Example Tea");
  expect(taste.data.endDate).toBe(null);
  const sections = suggestRawCandidates(
    "Two offers\n1️⃣ Cafe A: 1-for-1 tea\n2️⃣ Cafe B: 30% off meals",
    "2026-09-01T00:00:00Z",
    "sgfooddeals",
  );
  expect(sections).toHaveLength(2);
  expect(JSON.stringify(sections[0].data.terms)).not.toContain("Cafe B");
  expect(
    suggestRaw("📆 Today, 14, 21 & 28 Sep", "2026-09-07T00:00:00Z").data
      .endDate,
  ).toBe(null);
});
