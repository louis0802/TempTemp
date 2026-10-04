import { it, expect } from "vitest";
import {
  capturedPepperRun,
  capturedOutletResolver,
} from "./helpers/direct-source-fixtures";
import { fingerprint } from "@/server/db/publication";
import { evaluateDirectPublication } from "@/ingestion/direct-sources/publication";
import { assessSocialCaption } from "../scripts/research/social-sources/assessment";

it("origin-agnostic fingerprint ignores website/social provenance and detects conflicting facts", async () => {
  const run = await capturedPepperRun({ complete: true }),
    candidate = run.candidates[0];
  const decision = evaluateDirectPublication(candidate, {
    ...(await capturedOutletResolver()(candidate)),
    acquisitionReady: true,
    verifiedAt: run.observedAt,
    asOf: "2026-09-30",
  });
  const web = decision.promotion!;
  expect(web).toBeDefined();
  const social = {
    ...web,
    sources: [
      {
        kind: "direct" as const,
        sourceKind: "merchant_social" as const,
        platform: "instagram" as const,
        sourceId: "synthetic_social_reference",
        label: "Synthetic verified-source compatibility fixture",
        url: "https://www.instagram.com/research_fixture/p/ABC/",
      },
    ],
  };
  expect(fingerprint(social)).toBe(fingerprint(web));
  expect(fingerprint({ ...social, benefit: "Different benefit" })).not.toBe(
    fingerprint(web),
  );
});
it("exact caption all-outlets scope can reuse an existing authoritative web provider; unnamed selected scope stays review", async () => {
  const run = await capturedPepperRun({ complete: true }),
    candidate = run.candidates[0];
  const facts = assessSocialCaption({
    caption: "20% off. Available at all Singapore outlets. 1–31 Oct 2026.",
    publishedAt: null,
    kind: "post",
    accountAssociationVerified: true,
  });
  expect(facts.locationScope).toBe("all_outlets");
  const all = {
    ...candidate,
    locationScope: "all_outlets" as const,
    locationWording: "Available at all Singapore outlets",
    locationNames: [],
    canonicalUrl: "https://www.instagram.com/research_fixture/p/ABC/",
  };
  const resolved = await capturedOutletResolver()(all);
  expect(resolved.outletsVerified).toBe(true);
  expect(resolved.outlets.length).toBeGreaterThan(1);
  const selected = await capturedOutletResolver()({
    ...all,
    locationScope: "selected_outlets",
    locationWording: "Available at selected outlets",
  });
  expect(selected).toMatchObject({
    outletsVerified: false,
    outlets: [],
    outletIssues: ["outlet_scope_unresolved"],
  });
});
