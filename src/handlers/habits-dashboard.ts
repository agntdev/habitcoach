import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { menuBack, readData, statusText, streak, writeData } from "../habit-core.js";
registerMainMenuItem({ label: "My habits", data: "habits:dashboard", order: 20 });
const composer = new Composer<Ctx>();
async function dashboard(ctx: Ctx, edit = false, index = 0) {
  const data = await readData(ctx); const habits = data.habits;
  if (!habits.length) { const text = "No habits yet — tap ➕ Create habit to build your first one."; if (edit) await ctx.editMessageText(text, { reply_markup: menuBack() }); else await ctx.reply(text, { reply_markup: menuBack() }); return; }
  const habit = habits[Math.max(0, Math.min(index, habits.length - 1))]!; const runs = streak(habit.id, data);
  const text = `${habit.title}\n${habit.active ? "Active" : "Paused"} • ${habit.scheduleType} at ${habit.reminderTime}\nToday: ${statusText(habit, data)}\nStreak: ${runs.current} days (best ${runs.longest})`;
  const buttons = [[inlineButton("✅ Done", `check:done:${habit.id}`), inlineButton("Skip", `check:skip:${habit.id}`), inlineButton("Miss", `check:miss:${habit.id}`)], [inlineButton(habit.active ? "Pause" : "Resume", `habit:toggle:${habit.id}`), inlineButton("Edit time", `habit:edit:${habit.id}`)], [inlineButton("History", `habit:history:${habit.id}`), inlineButton("Delete", `habit:delete:${habit.id}`)]];
  if (habits.length > 1) buttons.push([inlineButton("◀️ Previous", `habits:page:${Math.max(0,index-1)}`), inlineButton("Next ▶️", `habits:page:${Math.min(habits.length-1,index+1)}`)]);
  buttons.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  if (edit) await ctx.editMessageText(text, { reply_markup: inlineKeyboard(buttons) }); else await ctx.reply(text, { reply_markup: inlineKeyboard(buttons) });
}
composer.callbackQuery("habits:dashboard", async (ctx) => { await ctx.answerCallbackQuery(); await dashboard(ctx); });
composer.on("callback_query:data", async (ctx, next) => {
  const value = ctx.callbackQuery.data; if (!value.startsWith("habits:page:") && !value.startsWith("habit:toggle:") && !value.startsWith("habit:delete:") && !value.startsWith("habit:history:") && !value.startsWith("habit:edit:")) return next();
  await ctx.answerCallbackQuery(); const [kind, action, id] = value.split(":");
  if (kind === "habits") { await dashboard(ctx, true, Number(id)); return; }
  const data = await readData(ctx); const habit = data.habits.find((h) => h.id === id);
  if (!habit) { await ctx.editMessageText("That habit is no longer here.", { reply_markup: menuBack() }); return; }
  if (action === "toggle") { habit.active = !habit.active; await writeData(ctx, data); await dashboard(ctx, true); return; }
  if (action === "delete") { data.habits = data.habits.filter((h) => h.id !== id); data.checkins = data.checkins.filter((c) => c.habitId !== id); await writeData(ctx, data); await ctx.editMessageText(`${habit.title} has been removed. You can always create a new habit when it feels right.`, { reply_markup: menuBack() }); return; }
  if (action === "history") { const history = data.checkins.filter((c) => c.habitId === id).slice(-14).map((c) => `${c.day}: ${c.status}`).join("\n") || "No check-ins yet — your first reminder is a great place to start."; await ctx.editMessageText(`${habit.title} history\n${history}`, { reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to habit", "habits:dashboard")]]) }); return; }
  ctx.session.wizard = { step: "time", title: habit.title, scheduleType: habit.scheduleType }; ctx.session.editingHabitId = id; await ctx.editMessageText("Send the new reminder time as HH:MM, like 08:30.");
});
export default composer;
