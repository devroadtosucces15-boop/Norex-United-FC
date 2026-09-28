// Used by the "Add a club" issue form: finds the club on EA and adds it to config.extraClubIds.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadConfig } from './lib.mjs';

const MAX_EXTRA = 50;
const out = (k, v) => process.env.GITHUB_OUTPUT && fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}<<EOF\n${v}\nEOF\n`);
const finish = (message, extra = {}) => {
  console.log(message);
  out('message', message);
  for (const [k, v] of Object.entries(extra)) out(k, v);
};

const body = process.env.ISSUE_BODY ?? process.argv.slice(2).join(' ');
const name = (body.match(/### Club name\s+([^\n]+)/)?.[1] ?? body).trim();
const config = loadConfig();

if (!name || name === '_No response_') {
  finish('I couldn’t read a club name from this issue.');
  process.exit(0);
}
if ((config.extraClubIds ?? []).length >= MAX_EXTRA) {
  finish(`The site already tracks ${MAX_EXTRA} extra clubs – ask a club admin to make room.`);
  process.exit(0);
}

const url = `https://proclubs.ea.com/api/fc/allTimeLeaderboard/search?${new URLSearchParams({ platform: config.platform, clubName: name })}`;
const res = await fetch(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    Referer: 'https://www.ea.com/',
    Accept: 'application/json',
  },
});
if (!res.ok) {
  finish(`EA's servers didn't answer (HTTP ${res.status}). Please try again later.`);
  process.exit(1);
}
const hits = (await res.json()) || [];
const exact = hits.filter((h) => h.clubName?.toLowerCase() === name.toLowerCase());
const pick = exact.length === 1 ? exact[0] : hits.length === 1 ? hits[0] : null;

if (!pick) {
  const list = hits.slice(0, 10).map((h) => `- ${h.clubName} (${h.wins}W ${h.ties}D ${h.losses}L)`).join('\n');
  finish(hits.length
    ? `Found several clubs matching **${name}** – please open a new issue with the exact name:\n${list}`
    : `No club called **${name}** was found on ${config.platform}. Check the spelling and try again.`, { done: 'true' });
  process.exit(0);
}

const id = Number(pick.clubId);
if (id === config.homeClubId || (config.extraClubIds ?? []).includes(id)) {
  finish(`**${pick.clubName}** is already tracked 👍`, { done: 'true' });
  process.exit(0);
}
config.extraClubIds = [...(config.extraClubIds ?? []), id];
fs.writeFileSync(path.join(ROOT, 'config.json'), JSON.stringify(config, null, 2) + '\n');
finish(`Added **${pick.clubName}** (club ${id}). It will appear on the site within a few minutes.`, { added: 'true', name: pick.clubName });
