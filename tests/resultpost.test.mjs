// Auto-posted results: the panel carries the score card and field view as attachments, the icons, and falls back to a plain post.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { postResults } from '../scripts/lib/resultpost.mjs';
import { plainText, images } from '../bot/ui.js';
import { t, done } from './lib.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nx-post-'));
fs.writeFileSync(path.join(dir, 'score-1.png'), 'x'); fs.writeFileSync(path.join(dir, 'field-1.png'), 'y');
const m = { matchId: '1', timestamp: 1791600000, matchType: 'leagueMatch',
  clubs: { 100: { wins: '1', losses: '0', goals: '3', details: { name: 'NOREX UNITED' } }, 200: { wins: '0', losses: '1', goals: '1', details: { name: 'Poundin P.' } } },
  players: { 100: { a: { playername: 'Mike', goals: '2', assists: '0', rating: '9.8', mom: '1' }, b: { playername: 'Jez', goals: '1', assists: '1', rating: '7.1' } } } };
const config = { siteUrl: 'https://x.test/', features: { discordMatch: 'members' }, hiddenPlayers: [] };

const calls = [];
let routedSettings = {};
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  calls.push({ url: String(url), init });
  if (String(url).includes('api.test/api/bot/settings/public')) return new Response(JSON.stringify(routedSettings), { status: 200 });
  if (String(url).includes('/webhooks/')) return new Response(JSON.stringify({ channel_id: 'chan-1' }), { status: 200 });
  return new Response('{}', { status: 200 });
};
process.env.DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1/abc';
process.env.DISCORD_BOT_TOKEN = 'tok';
const manifest = { match: { 1: { score: 'score-1.png', field: 'field-1.png' } } };

await postResults([m], { config, homeId: '100', drawn: { dir, manifest } });
const post = calls.find((c) => c.url.endsWith('/channels/chan-1/messages'));
t('the result is posted by the bot into the webhook channel', !!post);
t('with the pictures it goes up as a multipart form', post?.init.body instanceof FormData);
const payload = JSON.parse(post?.init.body.get('payload_json') ?? '{}');
t('the score card and field view are attached', post?.init.body.get('files[0]') && post?.init.body.get('files[1]'));
t('both pictures sit in the panel', images(payload).filter((u) => u.startsWith('attachment://')).join() === 'attachment://score-1.png,attachment://field-1.png');
t('score card comes before the facts, field view after', (() => { const s = JSON.stringify(payload); return s.indexOf('score-1.png') < s.indexOf('Goals') && s.indexOf('Goals') < s.indexOf('field-1.png'); })());
t('goals and man of the match are there', /Goals/.test(plainText(payload)) && /Man of the match/.test(plainText(payload)) && /Mike/.test(plainText(payload)));
t('the "Show my match" menu is still on it', JSON.stringify(payload).includes('norex:mm:1'));

calls.length = 0;
await postResults([m], { config, homeId: '100', drawn: null });
const plain = calls.find((c) => c.url.endsWith('/channels/chan-1/messages'));
t('without cards it is a plain JSON post with no pictures', typeof plain?.init.body === 'string' && !plain.init.body.includes('attachment://'));

// ----- owner's routing rules for results (Control Center → Match result posted) -----
process.env.DISCORD_CLIENT_SECRET = 'secret';
const routedCfg = { ...config, members: { api: 'https://api.test' } };
const base = { ok: true, autoPosts: { results: true }, flags: {}, resultChannel: '', pingRole: '', guildId: '9' };
routedSettings = { ...base, resultRoutes: { managed: true, targets: [{ method: 'everyone', channel: '777', role: '' }, { method: 'tag', channel: '', role: '555' }, { method: 'channel', channel: '888', role: '' }] } };
calls.length = 0;
await postResults([m], { config: routedCfg, homeId: '100', drawn: null });
const sent = calls.filter((c) => /\/channels\/[^/]+\/messages$/.test(c.url)).map((c) => ({ ch: c.url.match(/channels\/([^/]+)\//)[1], body: JSON.parse(c.init.body) }));
t('routed: one post per rule, in each rule’s channel (a blank channel = the default one)', sent.map((x) => x.ch).join() === '777,chan-1,888');
t('routed: @everyone on the first, the role tag on the second, no ping on the third', JSON.stringify(sent[0].body).includes('@everyone') && sent[0].body.allowed_mentions.parse.includes('everyone')
  && sent[1].body.allowed_mentions.roles?.[0] === '555' && JSON.stringify(sent[1].body).includes('<@&555>') && !JSON.stringify(sent[2].body).includes('@everyone') && !JSON.stringify(sent[2].body).includes('<@&'));
t('routed: the old webhook post is not also sent', !calls.some((c) => c.url.includes('/webhooks/1/abc') && c.init.method === 'POST'));
routedSettings = { ...base, resultRoutes: { managed: true, targets: [] } };
calls.length = 0;
await postResults([m], { config: routedCfg, homeId: '100', drawn: null });
t('routed: every rule switched off = nothing is posted at all', !calls.some((c) => /\/messages$/.test(c.url) || (c.url.includes('/webhooks/') && c.init.method === 'POST')));
routedSettings = { ...base, resultRoutes: { managed: false, targets: [] } };
calls.length = 0;
await postResults([m], { config: routedCfg, homeId: '100', drawn: null });
t('no rules: the old behaviour (webhook channel)', calls.some((c) => c.url.endsWith('/channels/chan-1/messages')));

globalThis.fetch = realFetch;
done();
