import { describe, expect, it } from "vitest";
import {
  ResearchScheduler,
  hourlySlot,
  isHourlyDue,
  isSingaporeDailyDue,
  nextHourlyBoundary,
  nextScheduleBoundary,
  nextSingaporeDayBoundary,
  runResearchScheduler,
  singaporeCalendarDate,
  singaporeDayBounds,
} from "../scripts/research/source-monitor/scheduler";

describe("research wall-clock scheduler", () => {
  it("uses Singapore midnight and fixed calendar-day bounds", () => {
    expect(singaporeCalendarDate("2026-09-24T15:59:59Z")).toBe("2026-09-24");
    expect(singaporeCalendarDate("2026-09-24T16:00:00Z")).toBe("2026-09-25");
    const day = singaporeDayBounds("2026-09-25");
    expect(day.start.toISOString()).toBe("2026-09-24T16:00:00.000Z");
    expect(day.end.toISOString()).toBe("2026-09-25T16:00:00.000Z");
    expect(nextSingaporeDayBoundary("2026-09-24T15:59:59Z").toISOString()).toBe(
      "2026-09-24T16:00:00.000Z",
    );
    expect(() => singaporeDayBounds("2026-02-30")).toThrow();
  });

  it("calculates hourly due time from slots, including a missed restart window", () => {
    expect(hourlySlot("2026-09-24T02:59:59Z")).toBe("2026-09-24T02:00:00.000Z");
    expect(nextHourlyBoundary("2026-09-24T02:59:59Z").toISOString()).toBe(
      "2026-09-24T03:00:00.000Z",
    );
    expect(isHourlyDue(null, "2026-09-24T02:59:59Z")).toBe(true);
    expect(isHourlyDue("2026-09-24T02:01:00Z", "2026-09-24T02:59:59Z")).toBe(
      false,
    );
    expect(isHourlyDue("2026-09-24T02:01:00Z", "2026-09-24T05:30:00Z")).toBe(
      true,
    );
    expect(isSingaporeDailyDue("2026-09-24", "2026-09-24T15:59:59Z")).toBe(
      false,
    );
    expect(isSingaporeDailyDue("2026-09-24", "2026-09-24T16:00:00Z")).toBe(
      true,
    );
    expect(nextScheduleBoundary("2026-09-24T15:59:59Z").toISOString()).toBe(
      "2026-09-24T16:00:00.000Z",
    );
  });

  it("serializes ticks and claims one hourly and daily run despite stale callbacks", async () => {
    let now = new Date("2026-09-24T05:30:00Z");
    let polls = 0;
    let discoveries = 0;
    let releasePoll: (() => void) | undefined;
    const held = new Promise<void>((resolve) => {
      releasePoll = resolve;
    });
    const scheduler = new ResearchScheduler({
      now: () => now,
      telegramDue: () => true,
      discoveryDue: () => true,
      pollTelegram: async () => {
        polls++;
        await held;
      },
      runDiscovery: async () => {
        discoveries++;
      },
    });
    const first = scheduler.tick();
    const concurrent = scheduler.tick();
    expect(polls).toBe(1);
    releasePoll!();
    expect(await first).toEqual(await concurrent);
    await scheduler.tick();
    expect([polls, discoveries]).toEqual([1, 1]);
    now = new Date("2026-09-24T06:00:00Z");
    await scheduler.tick();
    expect([polls, discoveries]).toEqual([2, 1]);
    now = new Date("2026-09-24T16:00:00Z");
    await scheduler.tick();
    expect([polls, discoveries]).toEqual([3, 2]);
  });

  it("keeps discovery running after a Telegram failure and exits on abort", async () => {
    const controller = new AbortController();
    const events: string[] = [];
    let waits = 0;
    const now = () => new Date("2026-09-24T05:30:00Z");
    const scheduler = new ResearchScheduler({
      now,
      telegramDue: () => true,
      discoveryDue: () => true,
      pollTelegram: async () => {
        throw new Error("preview unavailable");
      },
      runDiscovery: async () => {
        events.push("discovered");
      },
      report: ({ event }) => events.push(event),
    });
    await runResearchScheduler(scheduler, controller.signal, {
      now,
      wait: async (ms) => {
        waits++;
        expect(ms).toBe(30 * 60 * 1000);
        controller.abort();
      },
    });
    expect(events).toEqual(["telegram_poll_failed", "discovered"]);
    expect(waits).toBe(1);
  });
});
