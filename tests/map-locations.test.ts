import { describe, it, expect } from "vitest";
import {
  groupMapLocations,
  locationSelected,
  locationPinText,
} from "@/domain/map-locations";
import { mvpListing, readMvpData } from "@/server/mvp";
import type { Listing } from "@/domain/promotion";
const base = mvpListing((await readMvpData()).find((p) => p.outlets.length)!);
const outlet = {
  ...base.outlets[0],
  id: "one",
  googlePlaceId: "one",
  name: "Suntec",
  lat: 1.2950324,
  lng: 103.8583015,
};
const listing = (id: string, outlets = [outlet]): Listing => ({
  ...base,
  id,
  outlets,
});
describe("location grouping", () => {
  it("normalizes six decimals and counts unique promotions at identical anchors", () => {
    const groups = groupMapLocations([
      listing("a"),
      listing("b", [{ ...outlet, googlePlaceId: "two", lat: 1.29503241 }]),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].promotions).toHaveLength(2);
    expect(locationPinText(groups[0])).toBe("● 2");
  });
  it("uses place identity even when coordinates differ", () => {
    expect(
      groupMapLocations([
        listing("a"),
        listing("b", [{ ...outlet, lat: 1.296 }]),
      ]),
    ).toHaveLength(1);
  });
  it("does not group nearby distinct coordinates or names", () => {
    expect(
      groupMapLocations([
        listing("a"),
        listing("b", [{ ...outlet, googlePlaceId: "two", lat: 1.295034 }]),
      ]),
    ).toHaveLength(2);
  });
  it("counts duplicate outlet/source rows once while preserving source wording", () => {
    const groups = groupMapLocations([
      listing("a", [
        outlet,
        { ...outlet, id: "unit", sourceLocation: "Suntec, #01-645" },
      ]),
      listing("a"),
    ]);
    expect(groups[0].promotions).toHaveLength(1);
    expect(groups[0].promotions[0].outlets).toHaveLength(2);
    expect(locationPinText(groups[0])).toBe("●");
  });
  it("highlights every location for a multi-outlet promotion", () => {
    const groups = groupMapLocations([
      listing("a", [
        outlet,
        { ...outlet, id: "two", googlePlaceId: "two", lat: 1.31 },
      ]),
      listing("b", [
        { ...outlet, id: "three", googlePlaceId: "three", lat: 1.32 },
      ]),
    ]);
    expect(groups).toHaveLength(3);
    expect(groups.filter((g) => locationSelected(g, "a"))).toHaveLength(2);
  });
  it("unions bridging identities consistently regardless of input order", () => {
    const records = [
      listing("a"),
      listing("b", [{ ...outlet, googlePlaceId: "two", lat: 1.31 }]),
      listing("c", [{ ...outlet, googlePlaceId: "two" }]),
    ];
    expect(groupMapLocations(records)).toEqual(
      groupMapLocations([...records].reverse()),
    );
    expect(groupMapLocations(records)).toHaveLength(1);
  });
  it("ignores unusable coordinates", () => {
    expect(
      groupMapLocations([listing("a", [{ ...outlet, lat: NaN }])]),
    ).toEqual([]);
  });
});
