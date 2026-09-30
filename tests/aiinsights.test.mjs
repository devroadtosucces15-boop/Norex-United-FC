// P11.14 AI player insights engine: rule-based fallback (no AI binding in the mock server – see CLAUDE.md),
// the flag gate, and the style-tag/best-position logic pure functions.
import { env, siteJson, W } from './mock.mjs';
import { t, done } from './lib.mjs';
import { insightsFor } from '../bot/aiinsights.js';
import '../web/scout.js';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
const squad = siteJson('squad'), players = siteJson('players');
const pl = players.filter((p) => p.home).find((p) => (squad.players[p.k] ?? []).length >= 5);

setFlags({ aiInsights: 'owner' });
t('flag: 404 for a guest while owner-only', (await W(`/api/insights/player?k=${pl.k}`)).status === 404);

setFlags({ aiInsights: 'public' });
const r404 = await W('/api/insights/player');
t('missing k → 400', r404.status === 400);
const notEnough = await W('/api/insights/player?k=nobody-played');
const jNotEnough = await notEnough.json();
t('unknown/no-games player → not enough, no crash', notEnough.status === 200 && jNotEnough.enough === false);

const r = await W(`/api/insights/player?k=${pl.k}`);
const j = await r.json();
t('no AI binding in the mock → falls back to the rule-based read, never empty', r.status === 200 && j.enough === true && typeof j.summary === 'string' && j.summary.length > 0 && typeof j.recommendation === 'string' && j.recommendation.length > 0);
t('a playing-style tag is always assigned', ['poacher', 'playmaker', 'ball-winner', 'wall', 'all-rounder'].includes(j.style));
t('cached in KV keyed by game count – second call returns the same read', JSON.stringify(await (await W(`/api/insights/player?k=${pl.k}`)).json()) === JSON.stringify(j));

// ---------- pure helpers on a synthetic report ----------
const S = globalThis.NXScout;
const row = (ts, o) => ({ ts, res: 'W', g: 0, a: 0, r: 7, motm: 0, grp: 'FWD', pass: 9, passAtt: 10, tkl: 1, tklAtt: 2, shots: 3, saves: 0, ga: 1, dri: null, match: ts, ...o });
const games = { x: [], y: [], z: [] };
for (let s = 0; s < 5; s++) { const ts = 1.8e9 + s * 3 * 86400; games.x.push(row(ts, { g: 2, r: 7.5 })); games.y.push(row(ts, { grp: 'DEF' })); games.z.push(row(ts, { grp: 'DEF' })); }
const RFwd = S.report('x', games, { names: { x: 'Xavi' } });
const { style, best } = insightsFor(RFwd);
t('attacking forward with a clean scoring record → poacher tag', style === 'poacher');
t('best position by stats matches where the log rates them highest', best.grp === 'FWD' && best.isMain === true);

const gk = { x: [], y: [], z: [] };
for (let s = 0; s < 5; s++) { const ts = 1.8e9 + s * 3 * 86400; gk.x.push(row(ts, { grp: 'GK', saves: 4, g: 0, shots: 0, r: 7.2 })); gk.y.push(row(ts, { grp: 'DEF' })); gk.z.push(row(ts, { grp: 'DEF' })); }
t('goalkeeper always tags as a wall', insightsFor(S.report('x', gk, { names: { x: 'Gio' } })).style === 'wall');

done();
