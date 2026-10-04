import { setTimeout as delay } from "node:timers/promises";

export const HOUR_MS = 60 * 60 * 1000;
const SINGAPORE_OFFSET_MS = 8 * HOUR_MS;

export type Clock = () => Date;
export type TimeInput = Date | string;

function instant(value: TimeInput): Date {
  const parsed = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(parsed.getTime()))
    throw new Error("Invalid schedule time");
  return parsed;
}

/** Singapore currently has a fixed UTC+08:00 civil-day boundary. */
export function singaporeCalendarDate(at: TimeInput): string {
  return new Date(instant(at).getTime() + SINGAPORE_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
}

export function singaporeDayBounds(date: string): {
  date: string;
  start: Date;
  end: Date;
} {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new Error("Expected a Singapore calendar date (YYYY-MM-DD)");
  const utcMidnight = new Date(`${date}T00:00:00.000Z`);
  if (
    !Number.isFinite(utcMidnight.getTime()) ||
    utcMidnight.toISOString().slice(0, 10) !== date
  )
    throw new Error("Invalid Singapore calendar date");
  const start = new Date(utcMidnight.getTime() - SINGAPORE_OFFSET_MS);
  return { date, start, end: new Date(start.getTime() + 24 * HOUR_MS) };
}

export function nextSingaporeDayBoundary(at: TimeInput): Date {
  return singaporeDayBounds(singaporeCalendarDate(at)).end;
}

/** The UTC hourly slot also represents the Singapore wall-clock hour. */
export function hourlySlot(at: TimeInput): string {
  const ms = instant(at).getTime();
  return new Date(Math.floor(ms / HOUR_MS) * HOUR_MS).toISOString();
}

export function nextHourlyBoundary(at: TimeInput): Date {
  return new Date(Date.parse(hourlySlot(at)) + HOUR_MS);
}

/** One attempt is due per wall-clock hour, including after missed hours. */
export function isHourlyDue(
  lastAttemptAt: string | null,
  now: TimeInput,
): boolean {
  if (lastAttemptAt === null) return true;
  return Date.parse(hourlySlot(lastAttemptAt)) < Date.parse(hourlySlot(now));
}

/** The caller supplies the persisted date or timestamp of its last daily attempt. */
export function isSingaporeDailyDue(
  lastAttemptDateOrAt: string | null,
  now: TimeInput,
): boolean {
  if (lastAttemptDateOrAt === null) return true;
  const today = singaporeCalendarDate(now);
  const lastDate = /^\d{4}-\d{2}-\d{2}$/.test(lastAttemptDateOrAt)
    ? singaporeDayBounds(lastAttemptDateOrAt).date
    : singaporeCalendarDate(lastAttemptDateOrAt);
  return lastDate < today;
}

export function nextScheduleBoundary(at: TimeInput): Date {
  const hour = nextHourlyBoundary(at);
  const day = nextSingaporeDayBoundary(at);
  return hour < day ? hour : day;
}

export interface ResearchScheduleCallbacks {
  now?: Clock;
  telegramDue: (at: Date) => boolean;
  discoveryDue: (date: string, at: Date) => boolean;
  pollTelegram: (at: Date) => Promise<void>;
  runDiscovery: (date: string, at: Date) => Promise<void>;
  report?: (event: {
    event: "telegram_poll_failed" | "discovery_failed";
    at: string;
    error: string;
  }) => void;
}

export interface ScheduleTickResult {
  at: string;
  telegram: "skipped" | "completed" | "failed";
  discovery: "skipped" | "completed" | "failed";
}

/** Serializes same-process ticks; durable attempt timestamps prevent repeat work after restart. */
export class ResearchScheduler {
  private inFlight: Promise<ScheduleTickResult> | null = null;
  private claimedTelegramSlots = new Set<string>();
  private claimedDiscoveryDates = new Set<string>();

  constructor(private readonly callbacks: ResearchScheduleCallbacks) {}

  tick(): Promise<ScheduleTickResult> {
    if (this.inFlight) return this.inFlight;
    const task = this.runTick();
    this.inFlight = task;
    const clear = () => {
      if (this.inFlight === task) this.inFlight = null;
    };
    void task.then(clear, clear);
    return task;
  }

  private async runTick(): Promise<ScheduleTickResult> {
    const at = (this.callbacks.now ?? (() => new Date()))();
    const slot = hourlySlot(at);
    const date = singaporeCalendarDate(at);
    const result: ScheduleTickResult = {
      at: at.toISOString(),
      telegram: "skipped",
      discovery: "skipped",
    };
    if (
      !this.claimedTelegramSlots.has(slot) &&
      this.callbacks.telegramDue(at)
    ) {
      this.claimedTelegramSlots.add(slot);
      try {
        await this.callbacks.pollTelegram(at);
        result.telegram = "completed";
      } catch (error) {
        result.telegram = "failed";
        this.callbacks.report?.({
          event: "telegram_poll_failed",
          at: at.toISOString(),
          error: error instanceof Error ? error.message : "Unknown failure",
        });
      }
    }
    if (
      !this.claimedDiscoveryDates.has(date) &&
      this.callbacks.discoveryDue(date, at)
    ) {
      this.claimedDiscoveryDates.add(date);
      try {
        await this.callbacks.runDiscovery(date, at);
        result.discovery = "completed";
      } catch (error) {
        result.discovery = "failed";
        this.callbacks.report?.({
          event: "discovery_failed",
          at: at.toISOString(),
          error: error instanceof Error ? error.message : "Unknown failure",
        });
      }
    }
    return result;
  }
}

export async function runResearchScheduler(
  scheduler: ResearchScheduler,
  signal: AbortSignal,
  options: {
    now?: Clock;
    wait?: (ms: number, signal: AbortSignal) => Promise<void>;
  } = {},
): Promise<void> {
  const now = options.now ?? (() => new Date());
  const wait =
    options.wait ??
    (async (ms: number, abort: AbortSignal) => {
      await delay(ms, undefined, { signal: abort });
    });
  while (!signal.aborted) {
    await scheduler.tick();
    if (signal.aborted) break;
    const current = now();
    const ms = Math.max(
      1,
      nextScheduleBoundary(current).getTime() - current.getTime(),
    );
    try {
      await wait(ms, signal);
    } catch (error) {
      if (!signal.aborted) throw error;
    }
  }
}
