export type AutomationProgress =
  | "auto_enabled"
  | "shadow_only"
  | "blocked"
  | "source_candidate"
  | "not_assessed";
export type ProgressStage =
  | "discovered"
  | "ownership_verified"
  | "source_boundary_known"
  | "adapter_shadow"
  | "acquisition_complete"
  | "production_enabled"
  | "blocked";
export interface SourceTrack {
  kind: "merchant_web" | "merchant_social" | "issuer_platform";
  platform: "instagram" | "facebook" | "tiktok" | null;
  source_id: string | null;
  account: string | null;
  operator: string | null;
  urls: string[];
  ownership: string;
  enumeration: string;
  extraction: string;
  adapter: string | null;
  adapter_status: "enabled" | "shadow" | "none";
  activation_status: "enabled" | "shadow" | "candidate" | "blocked";
  stage: ProgressStage;
  publication_enabled: boolean;
  auto_publish: boolean;
  autonomous_acquisition_enabled: boolean;
  review_incomplete_candidates: boolean;
  blockers: string[];
  evidence_refs: string[];
}
export function deriveProgress(tracks: readonly SourceTrack[]) {
  const autonomous_acquisition_enabled = tracks.some(
    (t) => t.autonomous_acquisition_enabled,
  );
  const automation_progress: AutomationProgress = autonomous_acquisition_enabled
    ? "auto_enabled"
    : tracks.some((t) => t.adapter_status === "shadow")
      ? "shadow_only"
      : tracks.some((t) => t.activation_status === "candidate")
        ? "source_candidate"
        : tracks.length
          ? "blocked"
          : "not_assessed";
  const stages: ProgressStage[] = [
    "discovered",
    "ownership_verified",
    "source_boundary_known",
    "adapter_shadow",
    "acquisition_complete",
    "production_enabled",
  ];
  const furthest_verified_stage: ProgressStage =
    automation_progress === "blocked"
      ? "blocked"
      : stages[
          Math.max(
            0,
            ...tracks
              .filter((t) => t.stage !== "blocked")
              .map((t) => stages.indexOf(t.stage)),
          )
        ];
  let next_action = "assess_direct_source";
  if (autonomous_acquisition_enabled)
    next_action = "none_monitor_enabled_source";
  else if (
    tracks.some(
      (t) => t.kind === "issuer_platform" && t.adapter_status === "shadow",
    )
  )
    next_action = "issuer_platform_model_required";
  else if (
    tracks.some(
      (t) =>
        t.kind !== "merchant_social" &&
        t.adapter_status === "shadow" &&
        t.enumeration !== "complete",
    )
  )
    next_action = "resolve_web_enumeration";
  else if (
    tracks.some(
      (t) =>
        t.kind === "merchant_social" &&
        t.ownership === "verified" &&
        t.activation_status !== "blocked",
    )
  )
    next_action = "resolve_instagram_enumeration";
  else if (
    tracks.some(
      (t) =>
        t.kind === "merchant_social" &&
        t.ownership !== "verified" &&
        t.activation_status === "candidate",
    )
  ) {
    const platform = tracks.find(
      (t) =>
        t.kind === "merchant_social" &&
        t.ownership !== "verified" &&
        t.activation_status === "candidate",
    )!.platform;
    next_action = `verify_${platform}_ownership`;
  } else if (automation_progress === "blocked")
    next_action = "blocked_no_safe_public_source";
  else if (
    tracks.some((t) => t.blockers.some((b) => /outlet|participation/.test(b)))
  )
    next_action = "resolve_outlet_authority";
  else if (
    tracks.some(
      (t) =>
        t.enumeration === "complete" &&
        t.ownership === "verified" &&
        !t.adapter,
    )
  )
    next_action = "implement_shadow_adapter";
  const remaining_path = autonomous_acquisition_enabled
    ? null
    : automation_progress === "blocked"
      ? "blocked"
      : next_action.startsWith("verify_") && next_action.endsWith("_ownership")
        ? next_action.slice(7, -10)
        : next_action === "resolve_instagram_enumeration"
          ? "instagram"
          : next_action === "issuer_platform_model_required"
            ? "platform"
            : automation_progress === "not_assessed"
              ? "manual_research"
              : "website";
  return {
    automation_progress,
    furthest_verified_stage,
    autonomous_acquisition_enabled,
    remaining_path,
    auto_publish_complete_candidates: tracks.some(
      (t) => t.autonomous_acquisition_enabled && t.auto_publish,
    ),
    review_incomplete_candidates: tracks.some(
      (t) => t.review_incomplete_candidates,
    ),
    next_action,
  };
}
export function trackLabel(track: SourceTrack): string {
  if (track.autonomous_acquisition_enabled) return "enabled";
  if (track.adapter_status === "shadow") return "shadow";
  if (track.activation_status === "blocked")
    return track.blockers.includes("blocked_public_access")
      ? "blocked_public_access"
      : "blocked";
  if (track.ownership === "verified") return "ownership_verified";
  return "candidate_unverified";
}
