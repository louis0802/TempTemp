import { PromotionParticipationResolver } from "../resolution/outlets";
import { ApiPlaceResolver } from "../resolution/places";
import { ResolutionCache } from "../resolution/cache";
import type {
  MerchantOutletProvider,
  PlaceResolver,
} from "../resolution/types";
import type { DirectPromotionCandidate } from "./types";
import type { DirectResolvedContext } from "./publication";
import { ShakeShackOutletProvider } from "./adapters/shake-shack-outlets";
import { PepperOutletProvider } from "./adapters/pepper-outlets";
import { GourmetCarouselVenueProvider } from "./adapters/gourmet-carousel-outlets";

export type DirectOutletResolver = (
  candidate: DirectPromotionCandidate,
) => Promise<
  Omit<DirectResolvedContext, "acquisitionReady" | "verifiedAt" | "asOf">
>;
export function createDirectOutletResolver(
  options: {
    providers?: MerchantOutletProvider[];
    places?: PlaceResolver;
  } = {},
): DirectOutletResolver {
  const cache = new ResolutionCache();
  const places =
    options.places ??
    new ApiPlaceResolver(cache, {
      googleKey: process.env.GOOGLE_PLACES_API_KEY,
      oneMapToken: process.env.ONEMAP_TOKEN,
    });
  return async (candidate) => {
    if (
      candidate.locationScope !== "all_outlets" &&
      candidate.locationScope !== "named_outlets" &&
      !(
        candidate.locationScope === "selected_outlets" &&
        candidate.locationNames.length
      )
    )
      return {
        outlets: [],
        outletsVerified: false,
        outletIssues: ["outlet_scope_unresolved"],
      };
    const providers = options.providers ?? [
      new PepperOutletProvider(candidate.locationWording),
      new ShakeShackOutletProvider(),
      new GourmetCarouselVenueProvider(),
    ];
    const resolver = new PromotionParticipationResolver(providers, places);
    const audit = await resolver.resolve(
      candidate.merchant ?? "Pepper Lunch",
      {
        scope:
          candidate.locationScope === "selected_outlets"
            ? "named_outlets"
            : candidate.locationScope,
        raw: candidate.locationWording ?? "",
        names: candidate.locationNames,
        exclusions: [],
      },
      {
        url: candidate.canonicalUrl,
        checkedAt: candidate.observedAt,
        summary: candidate.locationWording ?? "No source outlet wording",
      },
    );
    return {
      outlets: audit.included.map((o) => ({
        id: o.id,
        name: o.name,
        address: o.address,
        lat: o.lat,
        lng: o.lng,
        evidence: [
          ...o.existenceEvidence,
          ...o.participationEvidence,
          ...o.coordinateEvidence,
        ]
          .map((e) => `${e.url}: ${e.summary}`)
          .join("\n"),
        verifiedAt: o.verifiedAt,
      })),
      outletsVerified: audit.complete,
      outletIssues: audit.issues,
    };
  };
}
