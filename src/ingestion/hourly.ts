import { setTimeout as delay } from "node:timers/promises";
export async function hourlyLoop(
  run: () => Promise<unknown>,
  signal: AbortSignal,
  options: {
    intervalMs?: number;
    wait?: (ms: number, signal: AbortSignal) => Promise<void>;
    report?: (value: unknown) => void;
  } = {},
) {
  const interval = options.intervalMs ?? 3_600_000,
    wait =
      options.wait ??
      (async (ms, s) => {
        await delay(ms, undefined, { signal: s });
      });
  while (!signal.aborted) {
    const started = Date.now();
    try {
      const result = await run();
      options.report?.({ event: "hourly_run", result });
    } catch (e) {
      options.report?.({
        event: "hourly_run_failed",
        error: e instanceof Error ? e.message : "Unknown failure",
      });
    }
    if (signal.aborted) break;
    try {
      await wait(Math.max(1000, interval - (Date.now() - started)), signal);
    } catch (e) {
      if (!signal.aborted) throw e;
    }
  }
}
