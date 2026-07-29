import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { daysBefore, localDay, menuBack, readData } from "../habit-core.js";
registerMainMenuItem({ label: "Weekly recap", data: "recap:weekly", order: 30 });
const composer = new Composer<Ctx>();
function days(dataTimezone: string): string[] { const result: string[] = []; for (let i = 6; i >= 0; i--) result.push(localDay(dataTimezone, daysBefore(i))); return result; }
composer.callbackQuery("recap:weekly", async (ctx) => {
  await ctx.answerCallbackQuery(); const data = await readData(ctx);
  if (!data.habits.length) { await ctx.reply("No habits to recap yet — tap ➕ Create habit and I’ll track your wins.", { reply_markup: menuBack() }); return; }
  const period = new Set(days(data.timezone)); const active = data.habits.filter((h) => h.active); const total = active.length * 7;
  const done = data.checkins.filter((c) => period.has(c.day) && c.status === "done").length; const skipped = data.checkins.filter((c) => period.has(c.day) && c.status === "skip").length; const missed = data.checkins.filter((c) => period.has(c.day) && c.status === "miss").length;
  const rate = total ? Math.round(done / total * 100) : 0; const lines = active.map((h) => { const entries = data.checkins.filter((c) => c.habitId === h.id && period.has(c.day)); return `${h.title}: ${entries.filter((c) => c.status === "done").length}/7 done`; });
  const encouragement = missed ? "Missed days happen — pick one small win for tomorrow." : "You showed up for yourself this week. Keep it going!";
  await ctx.reply(`Your week at a glance\n${lines.join("\n")}\n\nCompletion: ${rate}% (${done} done, ${skipped} skipped, ${missed} missed)\n${encouragement}`, { reply_markup: inlineKeyboard([[inlineButton("View my habits", "habits:dashboard")], [inlineButton("⬅️ Back to menu", "menu:main")]]) });
});
export default composer;
