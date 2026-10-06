import { describe, expect, it, vi } from "vitest";
import { mvpOutletSchema } from "@/domain/mvp";
import { resolveMvpOutlets } from "@/ingestion/mvp/outlets";
import type {
  DirectorySnapshot,
  MerchantBranch,
  MerchantOutletProvider,
  OutletDiscovery,
  PlaceResolver,
  ScopeResolution,
} from "@/ingestion/resolution/types";

const evidence = {
  url: "https://merchant.example/locations",
  summary: "Captured official directory",
  checkedAt: "2026-10-01T00:00:00Z",
};
const branch = (name: string, address: string, unit = ""): MerchantBranch => ({
  name,
  address,
  postalCode: "123456",
  unit,
  status: "operating",
  existenceEvidence: [evidence],
  resolvedPlace: {
    address,
    lat: 1.3,
    lng: 103.8,
    placeId: `place-${name}`,
    coordinatePrecision: "building",
    coordinateEvidence: [evidence],
  },
});
const directory = (
  branches: MerchantBranch[],
  full = true,
): DirectorySnapshot => ({
  branches,
  authoritative: true,
  fullyTraversed: full,
  pages: [evidence],
  officialCount: branches.length,
  issues: [],
});
const provider = (snapshot: DirectorySnapshot): MerchantOutletProvider => ({
  supports: (merchant) => merchant === "Example",
  getSingaporeBranches: vi.fn(async () => snapshot),
});
const discovery: OutletDiscovery = {
  discover: vi.fn(async () => directory([])),
  discoverMvp: vi.fn(async () => directory([], false)),
};
const places: PlaceResolver = {
  resolve: async (_merchant, item) => item.resolvedPlace!,
};
const scope = (s: Partial<ScopeResolution>): ScopeResolution => ({
  scope: "all_outlets",
  raw: "all outlets",
  names: [],
  exclusions: [],
  ...s,
});
const options = (p: MerchantOutletProvider[] = [], d = discovery) => ({
  providers: p,
  discovery: d,
  places,
});

describe("MVP outlet policy bridge", () => {
  it("uses the injected official directory and emits schema-valid pins with real coordinates", async () => {
    const snapshot = directory([
      branch("Central", "1 Example Road #01-02 Singapore 123456"),
    ]);
    const result = await resolveMvpOutlets(
      "Example",
      scope({}),
      options([provider(snapshot)]),
    );
    expect(result.directoryBasis).toBe("official");
    expect(result.directoryComplete).toBe(true);
    expect(result.outlets).toHaveLength(1);
    expect(mvpOutletSchema.array().safeParse(result.outlets).success).toBe(
      true,
    );
    expect(discovery.discoverMvp).not.toHaveBeenCalled();
  });

  it("matches selected locations by exact normalized identity and preserves units", async () => {
    const selected = branch(
      "Central",
      "1 Example Road #01-02 Singapore 123456",
      "#01-02",
    );
    const result = await resolveMvpOutlets(
      "Example",
      scope({ scope: "selected_outlets", names: [" central "] }),
      options([provider(directory([selected]))]),
    );
    expect(result.outlets.map((outlet) => outlet.address)).toEqual([
      selected.address,
    ]);
    expect(result.issues).not.toContain("named_outlet_unresolved: central ");
  });

  it("defaults unclear scope to observed locations and records the default", async () => {
    const result = await resolveMvpOutlets(
      "Example",
      scope({ scope: "unclear" }),
      options([
        provider(directory([branch("Central", "1 Example Road Singapore")])),
      ]),
    );
    expect(result.outlets).toHaveLength(1);
    expect(result.issues).toContain(
      "outlet_scope_unclear_defaulting_to_observed_merchant_locations",
    );
  });

  it("defaults empty selected scope to observed locations with a warning", async () => {
    const result = await resolveMvpOutlets(
      "Example",
      scope({ scope: "selected_outlets", names: [] }),
      options([
        provider(directory([branch("Central", "1 Example Road Singapore")])),
      ]),
    );
    expect(result.outlets).toHaveLength(1);
    expect(result.issues).toContain(
      "selected_outlet_names_missing_defaulting_to_observed_locations",
    );
  });

  it("does not widen named scope when its names are empty", async () => {
    const mockDiscovery: OutletDiscovery = {
      discover: vi.fn(),
      discoverMvp: vi.fn(),
    };
    const result = await resolveMvpOutlets(
      "Example",
      scope({ scope: "named_outlets", names: [] }),
      options([], mockDiscovery),
    );
    expect(result.outlets).toEqual([]);
    expect(mockDiscovery.discoverMvp).not.toHaveBeenCalled();
  });

  it("matches typed source-location labels and preserves source and Google addresses separately", async () => {
    const typed = {
      ...branch("Example Tea Bugis", "1 North Bridge Road Singapore"),
      sourceLocation: "Bugis",
      resolvedPlace: {
        address: "1 North Bridge Road Singapore",
        lat: 1.3,
        lng: 103.8,
        placeId: "typed-place",
        businessStatus: "OPERATIONAL",
        coordinatePrecision: "building" as const,
        coordinateEvidence: [evidence],
      },
    };
    const result = await resolveMvpOutlets(
      "Example",
      scope({ scope: "named_outlets", names: ["Bugis"] }),
      options([provider(directory([typed]))]),
    );
    expect(result.outlets[0]).toMatchObject({
      address: "Bugis",
      sourceLocation: "Bugis",
      googleFormattedAddress: "1 North Bridge Road Singapore",
      businessStatus: null,
      coordinateBasis: "google_source_location",
    });
    expect(mvpOutletSchema.safeParse(result.outlets[0]).success).toBe(true);
  });

  it("does not invent OPERATIONAL status and rejects coordinates outside Singapore", async () => {
    const unverified = branch("Unknown status", "Source label");
    unverified.resolvedPlace = {
      ...unverified.resolvedPlace!,
      businessStatus: undefined,
    };
    const unresolved = branch("Outside Singapore", "Foreign address");
    unresolved.resolvedPlace = { ...unresolved.resolvedPlace!, lat: 0.5 };
    const result = await resolveMvpOutlets(
      "Example",
      scope({}),
      options([provider(directory([unverified, unresolved]))]),
    );
    expect(result.outlets).toHaveLength(1);
    expect(result.outlets[0].businessStatus).toBeNull();
    expect(result.outlets[0].coordinateBasis).toBe("google_source_location");
    expect(result.issues).toContain(
      "branch_coordinates_or_status_unverified:Outside Singapore",
    );
  });

  it("blocks all pins if an exclusion cannot be resolved exactly", async () => {
    const result = await resolveMvpOutlets(
      "Example",
      scope({
        scope: "all_outlets_with_exclusions",
        exclusions: ["1 Example Rd #01-02"],
      }),
      options([
        provider(
          directory([
            branch("Central", "1 Example Road #01-02 Singapore 123456"),
          ]),
        ),
      ]),
    );
    expect(result.outlets).toEqual([]);
    expect(result.issues).toContain("exclusion_unresolved:1 Example Rd #01-02");
  });

  it("does no location lookup for online-only offers", async () => {
    const fetchless = {
      discover: vi.fn(),
      discoverMvp: vi.fn(),
    } as unknown as OutletDiscovery;
    const result = await resolveMvpOutlets(
      "Example",
      scope({ scope: "online_only" }),
      options([], fetchless),
    );
    expect(result.outlets).toEqual([]);
    expect(fetchless.discoverMvp).not.toHaveBeenCalled();
  });

  it("uses Google only when no usable official directory exists and marks coverage incomplete", async () => {
    const google = branch("Central", "Central Mall Singapore");
    const mockDiscovery: OutletDiscovery = {
      discover: vi.fn(),
      discoverMvp: vi.fn(async () => directory([google], false)),
    };
    const result = await resolveMvpOutlets(
      "Example",
      scope({ scope: "named_outlets", names: ["Central"] }),
      options([provider(directory([], false))], mockDiscovery),
    );
    expect(result.directoryBasis).toBe("google");
    expect(result.directoryComplete).toBe(false);
    expect(result.issues).toContain(
      "google_locations_are_not_a_complete_directory_or_participation_proof",
    );
  });

  it("does not replace a complete empty official directory with Google locations", async () => {
    const mockDiscovery: OutletDiscovery = {
      discover: vi.fn(),
      discoverMvp: vi.fn(async () =>
        directory([branch("Unexpected", "9 Elsewhere Road")], false),
      ),
    };
    const result = await resolveMvpOutlets(
      "Example",
      scope({}),
      options([provider(directory([]))], mockDiscovery),
    );
    expect(result).toMatchObject({
      outlets: [],
      directoryBasis: "official",
      directoryComplete: true,
    });
    expect(mockDiscovery.discoverMvp).not.toHaveBeenCalled();
  });

  it("never widens a failed named lookup into merchant-wide discovery", async () => {
    const mockDiscovery: OutletDiscovery = {
      discover: vi.fn(),
      discoverMvp: vi.fn(async () => directory([], false)),
    };
    const result = await resolveMvpOutlets(
      "Example",
      scope({ scope: "named_outlets", names: ["Unknown branch"] }),
      options([], mockDiscovery),
    );
    expect(result.outlets).toEqual([]);
    expect(mockDiscovery.discoverMvp).toHaveBeenCalledWith("Example", [
      "Unknown branch",
    ]);
    expect(mockDiscovery.discover).not.toHaveBeenCalled();
  });
});
