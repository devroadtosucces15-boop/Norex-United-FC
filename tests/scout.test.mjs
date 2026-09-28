// PB.5 part b: scout report visuals (radar vs squad average, session trend, where they play, form calendar) and
// "your build vs how you play" advice.
import { t, done } from './lib.mjs';
import '../web/scout.js';

const S = globalThis.NXScout;
const row = (ts, o) => ({ ts, res: 'W', g: 0, a: 0, r: 7, motm: 0, grp: 'FWD', pass: 8, passAtt: 10, tkl: 1, tklAtt: 2, shots: 2, saves: 0, ga: 1, dri: null, match: ts, ...o });
const games = { x: [], y: [], z: [], w: [], k: [] };
const DAY = 86400, base = Math.floor(Date.now() / 1000) - 20 * DAY;
for (let s = 0; s < 5; s++) for (let i = 0; i < 2; i++) {
  const ts = base + s * DAY * 3 + i * 900;
  games.x.push(row(ts, { g: 2, shots: 3, pass: 9 - s * 2, r: 8 - s * 0.2, grp: s === 4 ? 'MID' : 'FWD', res: s === 2 ? 'L' : 'W' }));
  for (const k of ['y', 'z', 'w']) games[k].push(row(ts, { g: 0, pass: 9 }));
  games.k.push(row(ts, { grp: 'GK', saves: 4 + s, ga: s % 2, g: 0, shots: 0 }));
}
const R = S.report('x', games, { names: { x: 'Xavi' } });
t('radar: 6 axes scaled 0–1 with the squad average', R.radar.length === 6 && R.radar.every((a) => a.me >= 0 && a.me <= 1 && a.avg != null && a.avg <= 1) && R.radar.find((a) => a.k === 'gpg').me === 1);
const K = S.report('k', games, {});
t('goalkeepers get keeper axes; fewer goals conceded scores higher', K.grp === 'GK' && K.radar.some((a) => a.k === 'saves') && K.radar.find((a) => a.k === 'conceded').me >= K.radar.find((a) => a.k === 'conceded').avg);
t('trend: one point per session with wins', R.trend.length === 5 && R.trend[0].r === 8 && R.trend[2].wins === 0 && R.trend.every((p) => p.games === 2));
t('where they play: game counts per position group', R.where.FWD === 8 && R.where.MID === 2);
t('form calendar: one entry per day with W/D/L', R.calendar.length === 5 && R.calendar.reduce((s, d) => s + d.games, 0) === 10 && R.calendar.some((d) => d.l === 2));
t('radar SVG draws both shapes with labels', /class="me"/.test(S.radarSvg(R.radar)) && /class="avg"/.test(S.radarSvg(R.radar)) && /Goals/.test(S.radarSvg(R.radar)));
const miss = S.buildAdvice(R, { arch: 'cb-arch', position: 'CB', code: 'a=x' });
t('build set up for another position → says so with the share', /set up as a defender \(CB\), but 80% of your games are as a forward/.test(miss[0].text));
t('weak metrics → attributes to add (pass accuracy → Short Passing / Vision)', miss.some((a) => a.tweak && /Short Passing \/ Vision/.test(a.text)));
t('archetype group used when the build has no position', /matches where you play/.test(S.buildAdvice(R, { arch: 'poacher' }, (id) => (id === 'poacher' ? 'FWD' : null))[0].text));
t('no build or no report → no advice', !S.buildAdvice(R, null).length && !S.buildAdvice({ enough: false }, { position: 'ST' }).length);
done();
