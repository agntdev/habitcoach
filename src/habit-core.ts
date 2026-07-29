import type { Ctx } from "./bot.js";

export type ScheduleType = "daily" | "weekdays" | "times";
export type CheckinStatus = "done" | "skip" | "miss";
export interface Habit { id: string; title: string; scheduleType: ScheduleType; reminderTime: string; active: boolean; createdAt: string; }
export interface Checkin { habitId: string; day: string; timestamp: string; status: CheckinStatus; locked: boolean; }
export interface HabitData { timezone: string; nextId: number; habits: Habit[]; checkins: Checkin[]; milestones: string[]; }

let clock: () => Date = () => new Date();
/** The only time seam used by habit schedules and summaries. */
export const now = (): Date => clock();
export function setClockForTest(next: (() => Date) | undefined): void { clock = next ?? (() => new Date()); }
export const daysBefore = (days: number): Date => new Date(now().getTime() - days * 86400000);
export function localDay(timezone: string, date = now()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const take = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${take("year")}-${take("month")}-${take("day")}`;
}
export function validTimezone(value: string): boolean {
  try { new Intl.DateTimeFormat("en-US", { timeZone: value }); return true; } catch { return false; }
}
function blank(): HabitData { return { timezone: "UTC", nextId: 1, habits: [], checkins: [], milestones: [] }; }

/**
 * The Worker durable binding is the production store. The session branch is
 * deliberately limited to the tokenless harness, which has no Worker binding.
 * Collections are stored under one owner record, so no keyspace enumeration is used.
 */
export async function readData(ctx: Ctx): Promise<HabitData> {
  const env = (ctx as unknown as { env?: { CHAT_DO?: { idFromName(s: string): unknown; get(id: unknown): { fetch(url: string, init?: RequestInit): Promise<Response> } } } }).env;
  if (env?.CHAT_DO && ctx.chat) {
    const res = await env.CHAT_DO.get(env.CHAT_DO.idFromName(`chat:${ctx.chat.id}`)).fetch("https://do/habits", { method: "GET" });
    return res.status === 204 ? blank() : await res.json() as HabitData;
  }
  return ctx.session.habitReplayData ?? (ctx.session.habitReplayData = blank());
}
export async function writeData(ctx: Ctx, data: HabitData): Promise<void> {
  const env = (ctx as unknown as { env?: { CHAT_DO?: { idFromName(s: string): unknown; get(id: unknown): { fetch(url: string, init?: RequestInit): Promise<Response> } } } }).env;
  if (env?.CHAT_DO && ctx.chat) {
    await env.CHAT_DO.get(env.CHAT_DO.idFromName(`chat:${ctx.chat.id}`)).fetch("https://do/habits", { method: "PUT", body: JSON.stringify(data) });
    return;
  }
  ctx.session.habitReplayData = data;
}
export function menuBack() { return { inline_keyboard: [[{ text: "⬅️ Back to menu", callback_data: "menu:main" }]] }; }
export function statusText(habit: Habit, data: HabitData): string {
  const day = localDay(data.timezone);
  const checkin = data.checkins.find((entry) => entry.habitId === habit.id && entry.day === day);
  return checkin ? ({ done: "Done", skip: "Skipped", miss: "Missed" }[checkin.status]) : "Waiting for today";
}
export function streak(habitId: string, data: HabitData): { current: number; longest: number } {
  const days = data.checkins.filter((c) => c.habitId === habitId && (c.status === "done" || c.status === "skip")).map((c) => c.day).sort().reverse();
  let current = 0; let longest = 0; let run = 0; let previous: Date | undefined;
  for (const day of days) {
    const parsed = new Date(`${day}T00:00:00Z`);
    if (previous && (previous.getTime() - parsed.getTime()) / 86400000 > 2) run = 0;
    run++; longest = Math.max(longest, run); previous = parsed;
  }
  current = run;
  return { current, longest };
}
export function escapeText(value: string): string { return value.replace(/[<>]/g, ""); }
