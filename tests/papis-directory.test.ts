import { readFileSync } from "node:fs";
import { describe, it, expect, vi } from "vitest";
import { load } from "cheerio";
import { DateTime } from "luxon";
import { digest, ResolutionCache } from "@/ingestion/resolution/cache";
import {
  parsePapisDirectory,
  PapisOutletProvider,
  papisUrl,
} from "@/ingestion/resolution/papis-directory";
import { PromotionParticipationResolver } from "@/ingestion/resolution/outlets";
import { PromotionPipeline } from "@/ingestion/resolution/pipeline";
import { ApiPlaceResolver } from "@/ingestion/resolution/places";
import { promotionSchema, publicationIssues } from "@/domain/promotion";
import type {
  DirectorySnapshot,
  MerchantBranch,
  OutletAudit,
} from "@/ingestion/resolution/types";
import { source } from "./helpers/resolution-fixtures";
const html = readFileSync("tests/fixtures/resolution/papis-home.html", "utf8");
const checkedAt = "2026-09-20T12:00:00Z";
const parse = (body = html) =>
  parsePapisDirectory(body, {
    url: papisUrl,
    checkedAt,
    sourceHash: digest(body),
    summary: "Captured official source",
  });
const edit = (mutate: (dom: ReturnType<typeof load>) => void) => {
  const dom = load(html);
  mutate(dom);
  return dom.html();
};
const places = {
  resolve: async (_merchant: string, branch: MerchantBranch) => ({
    address: branch.address,
    lat: 1.3,
    lng: 103.85,
    coordinatePrecision: "building" as const,
    coordinateEvidence: [
      {
        url: "https://fixture.example.test/coordinates",
        checkedAt,
        summary: "Controlled coordinates, not production verification",
      },
    ],
  }),
};
function pipeline(snapshot: DirectorySnapshot) {
  return new PromotionPipeline(
    new PromotionParticipationResolver(
      [{ supports: () => true, getSingaporeBranches: async () => snapshot }],
      places,
    ),
  );
}
const post = {
  text: "Papi’s Tacos: 50% off tacos\n📅 20 - 30 Sep 2026\n📍 All outlets",
  url: "https://t.me/tastesoulsg/99998",
  publishedAt: checkedAt,
  channel: "test",
  label: "Synthetic provider control",
};
const now = DateTime.fromISO(checkedAt);

describe("captured official Papi directory", () => {
  it("proves count and navigation coverage, preserving source addresses and units", () => {
    const result = parse();
    expect(result.issues).toEqual([]);
    expect(result.authoritative).toBe(true);
    expect(result.fullyTraversed).toBe(true);
    expect(result.officialCount).toBe(4);
    expect(
      result.branches.map(({ name, address, postalCode, unit, status }) => ({
        name,
        address,
        postalCode,
        unit,
        status,
      })),
    ).toEqual([
      {
        name: "Tanjong Pagar",
        address: "33 Tanjong Pagar Road, #01-01, Singapore 088456",
        postalCode: "088456",
        unit: "#01-01",
        status: "operating",
      },
      {
        name: "Seah Street",
        address: "39 Seah Street #01-00, Singapore 188395",
        postalCode: "188395",
        unit: "#01-00",
        status: "operating",
      },
      {
        name: "Katong",
        address: "450 Joo Chiat Road, Singapore 427663",
        postalCode: "427663",
        unit: "",
        status: "operating",
      },
      {
        name: "Jalan Besar",
        address: "149 Tyrwhitt Roard, 207562",
        postalCode: "207562",
        unit: "",
        status: "operating",
      },
    ]);
    expect(result.pages[0].sourceHash).toBe(digest(html));
  });
  it.each([
    [
      "truncation",
      () => html.replace(/<\/html>\s*$/i, ""),
      "incomplete_directory_document",
    ],
    [
      "missing card",
      () =>
        edit(($) => {
          $("main .image-card").last().remove();
        }),
      "official_count_mismatch",
    ],
    [
      "count drift",
      () =>
        html.replace("four convenient locations", "five convenient locations"),
      "official_count_mismatch",
    ],
    [
      "missing count",
      () =>
        html.replace("four convenient locations", "many convenient locations"),
      "missing_official_count",
    ],
    [
      "pagination",
      () =>
        edit(($) => {
          $("main").append('<a rel="next">Next</a>');
        }),
      "unconsumed_directory_pagination",
    ],
    [
      "navigation mismatch",
      () =>
        edit(($) => {
          $("header a[href='/katong-home']").remove();
        }),
      "directory_navigation_mismatch",
    ],
    [
      "address missing",
      () =>
        html.replace(
          "33 Tanjong Pagar Road, #01-01, Singapore 088456",
          "Address to be confirmed",
        ),
      "invalid_directory_card:Tanjong Pagar",
    ],
    [
      "duplicate address",
      () =>
        html.replace(
          "450 Joo Chiat Road, Singapore 427663",
          "33 Tanjong Pagar Road, #01-01, Singapore 088456",
        ),
      "duplicate_directory_address",
    ],
    [
      "duplicate name",
      () => html.replace(/>Katong<\/a>/g, ">Seah Street</a>"),
      "duplicate_directory_name",
    ],
    [
      "status unknown",
      () => html.replaceAll("Monday 12", "Monday TBD"),
      "unproven_branch_status:Tanjong Pagar",
    ],
    [
      "foreign address",
      () => html.replace("Singapore 088456", "Malaysia 088456"),
      "invalid_directory_card:Tanjong Pagar",
    ],
  ])("blocks %s", (_name, mutate, issue) => {
    const snapshot = parse((mutate as () => string)());
    expect(snapshot.authoritative).toBe(false);
    expect(snapshot.fullyTraversed).toBe(false);
    expect(snapshot.issues).toContain(issue);
  });
  it("blocks an unexplained closure even when old hours remain", () => {
    const body = edit(($) => {
      $("main .image-card .image-subtitle")
        .first()
        .append("<p>Closed until further notice</p>");
    });
    expect(parse(body).issues).toContain(
      "unproven_branch_status:Tanjong Pagar",
    );
  });
  it("does not interpret a weekly closed day as permanent closure", () => {
    const body = html.replace("Monday 12 - 2:30pm / 5 - 11pm", "Monday Closed");
    expect(parse(body).issues).toEqual([]);
    expect(parse(body).branches[0].status).toBe("operating");
  });
  it("rejects unaudited or substituted source evidence", () => {
    const evidence = {
      url: "https://untrusted.example/",
      checkedAt,
      sourceHash: digest(html),
      summary: "test",
    };
    expect(parsePapisDirectory(html, evidence).issues).toContain(
      "invalid_official_source_provenance",
    );
    expect(
      parsePapisDirectory(html, {
        ...evidence,
        url: papisUrl,
        sourceHash: "wrong",
      }).authoritative,
    ).toBe(false);
  });
  it("fetches official source with bounded cache and no redirects", async () => {
    const fetcher = vi.fn(async () => new Response(html));
    const provider = new PapisOutletProvider(
      new ResolutionCache(() => Date.parse(checkedAt)),
      fetcher,
    );
    expect(provider.supports("Papi's Tacos")).toBe(true);
    expect(provider.supports("Papi’s Tacos")).toBe(true);
    expect(provider.supports("Other tacos")).toBe(false);
    const first = await provider.getSingaporeBranches("Papi’s Tacos");
    first.branches.pop();
    expect(
      (await provider.getSingaporeBranches("Papi’s Tacos")).branches,
    ).toHaveLength(4);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(
      papisUrl,
      expect.objectContaining({
        redirect: "error",
        signal: expect.any(AbortSignal),
      }),
    );
  });
  it("rejects runtime malformed snapshots and does not cache transport failures", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("fail", { status: 503 }))
      .mockResolvedValueOnce(new Response("<html>partial</html>"));
    const provider = new PapisOutletProvider(new ResolutionCache(), fetcher);
    await expect(provider.getSingaporeBranches("Papi’s Tacos")).rejects.toThrow(
      "503",
    );
    await expect(provider.getSingaporeBranches("Papi’s Tacos")).rejects.toThrow(
      "papis_directory_unverified",
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
describe("provider pipeline safety", () => {
  it("allows a complete synthetic promotion only with independent coordinate evidence", async () => {
    const [result] = await pipeline(parse()).process(post, now);
    expect(result.action).toBe("approve");
    expect(publicationIssues(promotionSchema.parse(result.promotion))).toEqual(
      [],
    );
    const audit = result.audit.outletResolution as OutletAudit;
    expect(audit.complete).toBe(true);
    expect(audit.included).toHaveLength(4);
    expect(
      audit.included.every(
        (b) =>
          b.existenceEvidence.length &&
          b.participationEvidence.length &&
          b.coordinateEvidence.length,
      ),
    ).toBe(true);
  });
  it.each([
    "incomplete traversal",
    "count mismatch",
    "missing existence",
    "missing coordinates",
  ])("blocks %s", async (mode) => {
    const snapshot = parse();
    if (mode === "incomplete traversal") snapshot.fullyTraversed = false;
    if (mode === "count mismatch") snapshot.officialCount = 5;
    if (mode === "missing existence")
      snapshot.branches[0].existenceEvidence = [];
    if (mode === "missing coordinates")
      snapshot.branches[0].resolvedPlace = {
        address: snapshot.branches[0].address,
        lat: 1.3,
        lng: 103.85,
        coordinatePrecision: "building",
        coordinateEvidence: [],
      };
    const [result] = await pipeline(snapshot).process(post, now);
    expect(result.action).toBe("unresolved");
  });
  it.each(["temporarily closed", "permanently closed", "coming soon"])(
    "preserves %s and handles it conservatively",
    async (status) => {
      const body = edit(($) => {
        $("main .image-card .image-subtitle")
          .first()
          .append(`<p>${status}</p>`);
      });
      const snapshot = parse(body);
      expect(snapshot.issues).toEqual([]);
      const [result] = await pipeline(snapshot).process(post, now);
      if (status === "temporarily closed") {
        expect(snapshot.branches[0].status).toBe("temporarily_unavailable");
        expect(result.action).toBe("unresolved");
      } else {
        expect(snapshot.branches[0].status).toBe(
          status === "coming soon" ? "coming_soon" : "closed",
        );
        expect(result.action).toBe("approve");
        expect(result.promotion!.outlets).toHaveLength(3);
      }
    },
  );
  it("never uses the complete directory as selected-outlet participation", async () => {
    const [result] = await pipeline(parse()).process(
      { ...post, text: post.text.replace("All outlets", "Selected outlets") },
      now,
    );
    expect(result.action).toBe("unresolved");
    expect(result.reasons.join(" ")).toContain(
      "participating-outlet list could not be verified",
    );
  });
  it("real Papi source stays blocked by missing validity even with controlled coordinates", async () => {
    const [result] = await pipeline(parse()).process(
      source("https://t.me/tastesoulsg/4478"),
      DateTime.fromISO("2026-09-17T00:00:00Z"),
    );
    expect(result.action).toBe("unresolved");
    expect(result.reasons).toContain("unknown_expiry_or_start");
    expect(
      (result.audit.outletResolution as OutletAudit).included,
    ).toHaveLength(1);
    expect(result.reasons).toContain(
      "ambiguous_or_missing_participating_branch:149 Tyrwhitt Road",
    );
  });
});

describe("official branch coordinate safeguards", () => {
  const branch = parse().branches[0];
  const googlePlace = {
    id: "controlled-place",
    displayName: { text: "Papi’s Tacos Tanjong Pagar" },
    formattedAddress: branch.address,
    location: { latitude: 1.3, longitude: 103.85 },
    businessStatus: "OPERATIONAL",
  };
  it("rejects ambiguous Google identity matches without a fallback", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            places: [googlePlace, { ...googlePlace, id: "other-place" }],
          }),
        ),
    );
    await expect(
      new ApiPlaceResolver(
        new ResolutionCache(),
        { googleKey: "test" },
        fetcher,
      ).resolve("Papi’s Tacos", branch),
    ).rejects.toThrow("ambiguous_google_place");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("rejects an explicit business-status conflict without a fallback", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            places: [{ ...googlePlace, businessStatus: "CLOSED_TEMPORARILY" }],
          }),
        ),
    );
    await expect(
      new ApiPlaceResolver(
        new ResolutionCache(),
        { googleKey: "test" },
        fetcher,
      ).resolve("Papi’s Tacos", branch),
    ).rejects.toThrow("place_business_status_conflict");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("preserves full official address/unit and building precision with exact OneMap postal evidence", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            totalNumPages: 1,
            results: [
              {
                ADDRESS: "33 TANJONG PAGAR ROAD",
                POSTAL: branch.postalCode,
                LATITUDE: "1.3",
                LONGITUDE: "103.85",
              },
            ],
          }),
        ),
    );
    const place = await new ApiPlaceResolver(
      new ResolutionCache(),
      {},
      fetcher,
    ).resolve("Papi’s Tacos", branch);
    expect(place.address).toBe(branch.address);
    expect(place.coordinatePrecision).toBe("building");
    expect(place.coordinateEvidence[0].sourceHash).toBeTruthy();
  });
  it("rejects ambiguous OneMap coordinates", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            totalNumPages: 1,
            results: [1.3, 1.31].map((lat) => ({
              ADDRESS: "33 TANJONG PAGAR ROAD",
              POSTAL: branch.postalCode,
              LATITUDE: String(lat),
              LONGITUDE: "103.85",
            })),
          }),
        ),
    );
    await expect(
      new ApiPlaceResolver(new ResolutionCache(), {}, fetcher).resolve(
        "Papi’s Tacos",
        branch,
      ),
    ).rejects.toThrow("ambiguous_onemap_coordinates");
  });
});
