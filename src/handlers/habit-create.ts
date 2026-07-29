import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { escapeText, now, readData, validTimezone, writeData } from "../habit-core.js";

registerMainMenuItem({ label: "➕ Create habit", data: "habit:create", order: 10 });
const composer = new Composer<Ctx>();
const schedules = inlineKeyboard([[inlineButton("Every day", "habit:schedule:daily")], [inlineButton("Weekdays", "habit:schedule:weekdays")], [inlineButton("N times a week", "habit:schedule:times")], [inlineButton("⬅️ Back to menu", "menu:main")]]);

composer.callbackQuery("habit:create", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.wizard = { step: "title" };
  await ctx.reply("What habit would you like to build? Send a short name.");
});
composer.on("message:text", async (ctx, next) => {
  const wizard = ctx.session.wizard;
  if (!wizard) return next();
  const text = ctx.message.text.trim();
  if (wizard.step === "title") {
    if (!text || text.length > 80 || text.startsWith("/")) { await ctx.reply("Use a short habit name, then try again."); return; }
    wizard.title = escapeText(text); wizard.step = "time";
    await ctx.reply("How often should you do it?", { reply_markup: schedules }); return;
  }
  if (wizard.step === "time") {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(text)) { await ctx.reply("Send the reminder time as HH:MM, like 08:30."); return; }
    if (ctx.session.editingHabitId) {
      const data = await readData(ctx); const habit = data.habits.find((h) => h.id === ctx.session.editingHabitId);
      delete ctx.session.wizard; delete ctx.session.editingHabitId;
      if (!habit) { await ctx.reply("That habit is no longer here."); return; }
      habit.reminderTime = text; await writeData(ctx, data);
      await ctx.reply(`Your reminder for ${habit.title} is now ${text}.`); return;
    }
    wizard.reminderTime = text; wizard.step = "timezone";
    await ctx.reply("What time zone should I use? Send an IANA name like Europe/London, or tap UTC.", { reply_markup: inlineKeyboard([[inlineButton("Use UTC", "habit:tz:UTC")], [inlineButton("Cancel", "habit:cancel")]]) }); return;
  }
  if (!validTimezone(text)) { await ctx.reply("I couldn’t use that time zone. Try one like Europe/London or America/New_York."); return; }
  await saveHabit(ctx, text);
});
composer.on("callback_query:data", async (ctx, next) => {
  const data = ctx.callbackQuery.data;
  if (!data.startsWith("habit:schedule:") && !data.startsWith("habit:tz:") && data !== "habit:cancel") return next();
  await ctx.answerCallbackQuery();
  if (data === "habit:cancel") { delete ctx.session.wizard; await ctx.editMessageText("No habit was created. You can start whenever you’re ready."); return; }
  if (data.startsWith("habit:schedule:")) {
    if (!ctx.session.wizard?.title) { await ctx.editMessageText("Start with a habit name, then choose its schedule."); return; }
    ctx.session.wizard.scheduleType = data.slice("habit:schedule:".length) as "daily" | "weekdays" | "times";
    await ctx.editMessageText("What time should I remind you? Send it as HH:MM, like 08:30."); return;
  }
  await saveHabit(ctx, data.slice("habit:tz:".length));
});
async function saveHabit(ctx: Ctx, timezone: string) {
  const wizard = ctx.session.wizard;
  if (!wizard?.title || !wizard.scheduleType || !wizard.reminderTime) { await ctx.reply("That setup slipped away. Tap Create habit to begin again."); return; }
  const data = await readData(ctx); data.timezone = timezone;
  const habit = { id: String(data.nextId++), title: wizard.title, scheduleType: wizard.scheduleType, reminderTime: wizard.reminderTime, active: true, createdAt: now().toISOString() };
  data.habits.push(habit); await writeData(ctx, data); delete ctx.session.wizard;
  await ctx.reply(`You’re all set for ${habit.title} at ${habit.reminderTime} (${timezone}). I’ll be here to cheer you on.`, { reply_markup: inlineKeyboard([[inlineButton("View my habits", "habits:dashboard")], [inlineButton("➕ Create another", "habit:create")]]) });
}
export default composer;
