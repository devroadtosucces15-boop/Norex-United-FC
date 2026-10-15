// Uploads the icon set (bot/iconset.mjs) as the bot's own application emoji and writes bot/emojis.gen.js for the Worker.
// Run by .github/workflows/bot.yml before the deploy (needs DISCORD_APP_ID + DISCORD_BOT_TOKEN and Chrome, which the runners have – ImageMagick can't draw strokes or gradients).
// Never fails the deploy: anything that goes wrong leaves the unicode fallbacks in place.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { NAMES, svgOf } from './iconset.mjs';
import { findChrome } from '../scripts/lib/chrome.mjs';

const { DISCORD_APP_ID: app, DISCORD_BOT_TOKEN: token } = process.env;
const OUT = new URL('./emojis.gen.js', import.meta.url);
if (!app || !token) { console.log('Icons: no bot token here – using unicode fallbacks'); process.exit(0); }
const api = (p, init = {}) => fetch(`https://discord.com/api/v10/applications/${app}/emojis${p}`, { ...init, headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' } });

try {
  const have = await (await api('')).json();
  const map = {};
  for (const e of have.items ?? []) if (e.name.startsWith('nx_')) map[e.name.slice(3)] = { id: e.id, name: e.name };
  const chrome = findChrome();
  if (!chrome) throw new Error('no Chrome found');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nx-icons-'));
  for (const name of NAMES) {
    if (map[name]) continue;
    const html = path.join(dir, `${name}.html`), png = path.join(dir, `${name}.png`);
    fs.writeFileSync(html, `<!doctype html><body style="margin:0;background:transparent">${svgOf(name).replace('width="24" height="24"', 'width="128" height="128"')}`);
    execFileSync(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--default-background-color=00000000', `--screenshot=${png}`, '--window-size=128,128', `file://${html}`], { stdio: 'ignore', timeout: 40000 });
    const r = await api('', { method: 'POST', body: JSON.stringify({ name: `nx_${name}`, image: `data:image/png;base64,${fs.readFileSync(png).toString('base64')}` }) });
    const e = await r.json();
    if (e.id) map[name] = { id: e.id, name: e.name }; else console.warn(`Icon ${name} not uploaded:`, JSON.stringify(e).slice(0, 160));
  }
  fs.writeFileSync(OUT, `// Written by bot/ensure-emojis.mjs during the bot deploy.\nexport default ${JSON.stringify(map)};\n`);
  console.log(`Icons: ${Object.keys(map).length}/${NAMES.length} ready`);
} catch (e) { console.warn('Icons skipped:', e.message); }
