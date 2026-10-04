/** Frozen research-only protocol assets. Historical ignored runs retain their own copies. */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PROTOCOL_DIR = path.join(HERE, "protocol");
export const PROTOCOL_FILE = path.join(
  PROTOCOL_DIR,
  "protocol-revision-6.json",
);
export const REGISTRY_FILE = path.join(
  PROTOCOL_DIR,
  "source-registry-revision-6.json",
);
export const EXPECTED_PROTOCOL_SHA256 =
  "259096b914efbd1bf8258b290679964dbb2da3bbf362638eb717de83999820fb";
export const EXPECTED_REGISTRY_SHA256 =
  "76a1bdd8bbbc53157ed53b6ec88d94e7eacf751d0a27756c9f1d41d0a232e086";

export type CadenceClass = "fresh_publisher" | "directory" | "static_campaign";
export type SourceRegistryEntry = {
  research_role?: "core_replacement" | "supplemental";
  cadence_class?: CadenceClass;
  source_id: string;
  source_type: string;
  origin_url: string;
  enumerable: boolean;
  ordering: string;
  pagination: string;
  freshness_visibility: string;
  reasonable_per_run_cap: { max_pages: number; max_entries: number };
  [key: string]: unknown;
};
export type SourceRegistry = {
  schema_version: string;
  protocol_revision: number;
  sources: SourceRegistryEntry[];
};
export type ResearchProtocol = {
  revision: number;
  timezone: string;
  source_registry_revision: number;
  observation_contract: {
    channels: string[];
    telegram_max_poll_gap_minutes?: number;
    telegram_late_tolerance_minutes?: number;
  };
  service_contract: {
    schema_version: number;
    telegram_cadence_minutes: number;
  };
  [key: string]: unknown;
};

const digest = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
export async function loadPinnedResearchAssets(revision: 3 | 4 | 5 | 6 = 6) {
  const [protocolBytes, registryBytes] = await Promise.all([
    readFile(
      revision === 3
        ? path.join(PROTOCOL_DIR, "protocol-revision-3.json")
        : path.join(PROTOCOL_DIR, `protocol-revision-${revision}.json`),
    ),
    readFile(
      revision === 3
        ? path.join(PROTOCOL_DIR, "source-registry.json")
        : path.join(PROTOCOL_DIR, `source-registry-revision-${revision}.json`),
    ),
  ]);
  const protocolSha256 = digest(protocolBytes),
    registrySha256 = digest(registryBytes);
  if (
    protocolSha256 !==
    (revision === 3
      ? "0ba848c3a55123d3a12e6d4d4425c1f46f7084a12d894f7552ba868c832a32db"
      : revision === 4
        ? "7843360048f335be579bef859396d0c9390a133097e3f6e1a02d9c19c4164791"
        : revision === 5
          ? "0720d14d4213f592fde4b8da7eae273f2fcf75c26a33a482581d0cca9b19114c"
          : EXPECTED_PROTOCOL_SHA256)
  )
    throw new Error("Research protocol SHA-256 mismatch");
  if (
    registrySha256 !==
    (revision === 3
      ? "0f8de1c9e590d10f4c4709ec526f2587d478f4623230fa227a3d7de1edc6f4c9"
      : revision === 4
        ? "ffa84b3be3d5db779ac6ca7ceb56370f7338aacd6538ae6bf01bde0834f6b6b1"
        : revision === 5
          ? "3cc285b4e3192eb52f5d54405876270e87bf1e4b3e03ced5a5268f22c2fa57aa"
          : EXPECTED_REGISTRY_SHA256)
  )
    throw new Error("Research source registry SHA-256 mismatch");
  const protocol = JSON.parse(
    protocolBytes.toString("utf8"),
  ) as ResearchProtocol;
  const registry = JSON.parse(registryBytes.toString("utf8")) as SourceRegistry;
  if (
    protocol.revision !== revision ||
    protocol.timezone !== "Asia/Singapore" ||
    protocol.source_registry_revision !== (revision === 3 ? 1 : revision) ||
    protocol.service_contract?.schema_version !== 1 ||
    registry.protocol_revision !== (revision === 3 ? 1 : revision) ||
    !Array.isArray(registry.sources) ||
    registry.sources.length !== 19 ||
    new Set(registry.sources.map((s) => s.source_id)).size !==
      registry.sources.length ||
    protocol.observation_contract?.channels?.join(",") !==
      "sgfooddeals,tastesoulsg"
  ) {
    throw new Error("Research protocol or registry schema invalid");
  }
  if (
    revision === 6 &&
    registry.sources.some(
      (s) =>
        s.research_role !==
        (CORE_SOURCE_IDS.includes(s.source_id)
          ? "core_replacement"
          : "supplemental"),
    )
  )
    throw new Error("Invalid frozen rev6 cohort");
  for (const source of registry.sources) {
    if (
      (revision >= 4 &&
        !["fresh_publisher", "directory", "static_campaign"].includes(
          source.cadence_class ?? "",
        )) ||
      !source.source_id ||
      !source.origin_url.startsWith("https://") ||
      !Number.isInteger(source.reasonable_per_run_cap?.max_pages) ||
      source.reasonable_per_run_cap.max_pages < 1 ||
      !Number.isInteger(source.reasonable_per_run_cap?.max_entries) ||
      source.reasonable_per_run_cap.max_entries < 1
    ) {
      throw new Error(
        `Invalid registered research source: ${source.source_id}`,
      );
    }
  }
  return { protocol, registry, protocolSha256, registrySha256 };
}

export const CORE_SOURCE_IDS: readonly string[] = [
  "confirmgood_deals",
  "eatbook_deals",
  "everydayonsales_food",
];
