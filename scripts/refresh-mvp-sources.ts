import { sourceDefinition } from "../src/ingestion/direct-sources/registry";
import { runDirectSource } from "../src/ingestion/direct-sources/runner";
import { fixtureTransport } from "../src/ingestion/direct-sources/fixtures";
import { persistMvpSourceRun } from "../src/ingestion/mvp/source-refresh";

const args = process.argv.slice(2);
const value = (flag: string) =>
  args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
const id = value("--source");
if (id !== "pepper_lunch_sg" && id !== "shake_shack_sg")
  throw new Error(
    "Specify one reviewed --source pepper_lunch_sg|shake_shack_sg; no --all",
  );
for (let i = 0; i < args.length; i++) {
  if (["--source", "--fixture", "--output"].includes(args[i])) {
    if (!args[++i] || args[i].startsWith("--"))
      throw new Error("Missing option value");
  } else if (args[i] !== "--live") throw new Error(`Unknown option ${args[i]}`);
}
const live = args.includes("--live");
if (live && value("--fixture"))
  throw new Error("Choose live or fixture transport");
const manifest =
  value("--fixture") ??
  (id === "pepper_lunch_sg"
    ? "tests/fixtures/direct-sources/pepper-captured-seven/manifest.json"
    : "tests/fixtures/direct-sources/shake-shack/complete-2026-10-01-network-enabled/manifest.json");
const run = await runDirectSource(
  sourceDefinition(id),
  live
    ? { mode: "live" }
    : { ...(await fixtureTransport(manifest)), mode: "fixture" },
);
const state = await persistMvpSourceRun(
  value("--output") ?? ".local/mvp-source-observations",
  run,
);
console.log(
  JSON.stringify(
    {
      source: id,
      mode: run.mode,
      observedAt: run.observedAt,
      complete: state.lastSnapshot.complete,
      candidates: Object.keys(state.candidates).length,
      capability:
        Object.values(state.observations)[0]?.capability ??
        "historical_archive",
    },
    null,
    2,
  ),
);
