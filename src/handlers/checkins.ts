import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { localDay, now, readData, streak, writeData } from "../habit-core.js";
const composer = new Composer<Ctx>();
const milestones = new Set([7, 14, 30, 90]);
composer.on("callback_query:data", async (ctx, next) => {
  const value = ctx.callbackQuery.data; if (!value.startsWith("check:")) return next();
  await ctx.answerCallbackQuery();
  const [, status, id] = value.split(":");
  if (status !== "done" && status !== "skip" && status !== "miss") return;
  const data = await readData(ctx); const habit = data.habits.find((h) => h.id === id);
  if (!habit) { await ctx.editMessageText("That habit is no longer here."); return; }
  const day = localDay(data.timezone); const existing = data.checkins.find((entry) => entry.habitId === id && entry.day === day);
  if (existing?.locked) { await ctx.answerCallbackQuery({ text: "Today’s check-in is already saved." }); return; }
  if (existing) { existing.status = status; existing.timestamp = now().toISOString(); existing.locked = true; } else data.checkins.push({ habitId: id, day, timestamp: now().toISOString(), status, locked: true });
  const stats = streak(id, data); const milestone = status === "done" && milestones.has(stats.current) && !data.milestones.includes(`${id}:${stats.current}`);
  if (milestone) data.milestones.push(`${id}:${stats.current}`); await writeData(ctx, data);
  const reply = status === "done" ? `Nice work — ${habit.title} is checked off. Your streak is ${stats.current} days.` : status === "skip" ? `Skipped for today. Your streak is protected for the next 48 hours.` : `Marked as missed. Tomorrow is a fresh chance to keep going.`;
  await ctx.editMessageText(reply, { reply_markup: inlineKeyboard([[inlineButton("View my habits", "habits:dashboard")]]) });
  if (milestone) await ctx.reply(`You’ve reached a ${stats.current}-day streak for ${habit.title}. Keep that momentum going!`);
});
export default composer;
