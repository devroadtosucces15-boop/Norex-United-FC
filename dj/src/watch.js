// Reads data/report.json (written by maintain.sh) and DMs the owner when the YouTube/update status changes.
import fs from "node:fs";
import path from "node:path";
import { EmbedBuilder } from "discord.js";

const DIR = process.env.DATA_DIR || "/app/data";
const REPORT = path.join(DIR, "report.json"), NOTED = path.join(DIR, "notified.json");
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };
const LOOK = { ok: [0x3fa56b, "✅ YouTube is working"], updated: [0x3fa56b, "⬆️ YouTube plugin updated"], rollback: [0xe0a030, "↩️ Update rolled back"], down: [0xc8352c, "⚠️ YouTube is not working"] };

export function startReportWatch(client) {
  const userId = process.env.ALERT_USER_ID;
  if (!userId) return console.log("ALERT_USER_ID not set: update reports stay in data/report.json");
  const check = async () => {
    const rep = read(REPORT); if (!rep) return;
    const last = read(NOTED);
    if (last?.id === rep.id) return;
    const changed = last ? last.status !== rep.status || rep.status === "updated" || rep.status === "rollback" : rep.status !== "ok";
    if (!changed) return fs.writeFileSync(NOTED, JSON.stringify({ id: rep.id, status: rep.status }));
    const [color, title] = LOOK[rep.status] || LOOK.down;
    const extra = rep.status === "down" ? "\n\nNothing is broken in the bot. Songs still play from SoundCloud. I will keep checking every day and tell you when YouTube works again." : "";
    try {
      const u = await client.users.fetch(userId);
      await u.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Norex DJ · ${title}`).setDescription(rep.message + extra).setFooter({ text: `Plugin ${rep.version} · ${rep.time}` })] });
      fs.writeFileSync(NOTED, JSON.stringify({ id: rep.id, status: rep.status }));
    } catch (e) { console.error("report dm", e.message); }
  };
  setInterval(check, 60_000); setTimeout(check, 5_000);
}
