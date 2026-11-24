import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { makeStore, sqliteExecutor, SCHEMA } from '../core/store.js';
import { normalizeMatch, searchHits } from '../core/ea.js';
import { render, VIEWS } from '../core/views.js';
import * as S from '../core/stats.js';
import { commands } from '../core/commands.js';

const db = new DatabaseSync(':memory:'); SCHEMA.forEach((s) => db.exec(s));
const st = makeStore(sqliteExecutor(db));
const pl = (name, rating, goals, assists) => ({ playername: name, pos: 'midfielder', rating: String(rating), goals: String(goals), assists: String(assists), shots: '2', passesmade: '18', passattempts: '20', tacklesmade: '3', tackleattempts: '5', saves: '0', mom: goals > 1 ? '1' : '0' });
const mk = (id, ts, gf, ga, opp) => ({ matchId: id, timestamp: ts, clubs: { 100: { goals: String(gf), details: { name: 'Alpha FC', customKit: { crestAssetId: '1' } } }, 200: { goals: String(ga), details: { name: opp } } },
  players: { 100: { a: pl('Ana', 8 + gf / 10, gf, 0), b: pl('Ben', 7, 0, gf) }, 200: { c: pl('Zed', 6, ga, 0) } } });
const club = { id: '100', name: 'Alpha FC', crest: null };
const text = (e) => JSON.stringify(e.toJSON());

test('normalize: asked club is home; crest url built', () => {
  const m = normalizeMatch(mk('1', 1000, 3, 1, 'Beta'), '200');
  assert.equal(m.home.name, 'Beta'); assert.equal(m.res, 'L');
  assert.match(normalizeMatch(mk('1', 1000, 3, 1, 'Beta'), '100').home.crest, /l1\.png$/);
});
test('searchHits shapes EA leaderboard search rows', () => {
  assert.deepEqual(searchHits([{ clubId: '5', clubInfo: { name: 'X', customKit: { crestAssetId: '9' } } }, { clubId: 'bad', clubInfo: { name: 'Y' } }]), [{ id: '5', name: 'X', crest: '9' }]);
});
test('store saves once and totals', async () => {
  for (const r of [mk('1', 1000, 3, 1, 'Beta'), mk('2', 2000, 0, 2, 'Beta'), mk('3', 3000, 2, 2, 'Gamma'), mk('4', 4000, 4, 0, 'Beta')]) {
    assert.equal(await st.saveMatch('100', normalizeMatch(r, '100')), true);
  }
  assert.equal(await st.saveMatch('100', normalizeMatch(mk('4', 4000, 4, 0, 'Beta'), '100')), false);
  assert.equal((await st.clubTotals('100')).w, 2);
});
test('all three views: crest, title, 3 buttons, one disabled', async () => {
  const m = normalizeMatch(mk('4', 4000, 4, 0, 'Beta'), '100');
  for (const v of VIEWS) {
    const { embeds, components } = await render(st, m, v);
    assert.match(embeds[0].title, /Alpha FC\s+4 – 0\s+Beta/); assert.ok(embeds[0].thumbnail.url.includes('l1.png'));
    assert.equal(components[0].components.length, 3); assert.equal(components[0].components.filter((b) => b.disabled).length, 1);
  }
});
test('stats commands', async () => {
  assert.match(text(await S.clubEmbed(st, club)), /\*\*4\*\* played/);
  assert.match((await S.resultsEmbed(st, club, 2)).toJSON().description, /^🟢 \*\*4–0\*\* vs Beta/);
  assert.match(text(await S.playerEmbed(st, club, 'ana')), /Ana/);
  assert.match((await S.compareEmbed(st, club, 'Ana', 'Ben')).toJSON().description, /Goals\/g/);
  assert.match((await S.leaderboardEmbed(st, club, 'goals')).toJSON().description, /🥇 \*\*Ana\*\*/);
  assert.match((await S.historyEmbed(st, club, 'bet')).toJSON().description, /\*\*3\*\* played/);
  for (const k of ['form', 'last5', 'streaks']) assert.ok((await S.insightEmbed(st, club, k)).toJSON().description);
});
test('pending relay rows round-trip', async () => {
  await st.addPending({ ref: 'r1', token: 't', guild: 'g', channel: 'c', user: 'u', kind: 'stats', game: 2, opponents: false });
  assert.equal((await st.getPending('r1')).game, 2); await st.delPending('r1'); assert.equal(await st.getPending('r1'), null);
});
test('10 generic commands', () => assert.equal(commands.length, 10));
