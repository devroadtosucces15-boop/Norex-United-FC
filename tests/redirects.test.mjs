// Swap-over step 2: every old page address resolves – either to a new page or to its copy under classic/.
import { t, done } from './lib.mjs';
import { planRedirects, stubHtml, ROOT_MAP } from '../next/lib/redirects.mjs';

const oldFiles = ['index.html', 'about.html', 'members.html', 'builder.html', 'hub/index.html', 'players/abc.html', 'players/zzz.html', 'matches/1.html', 'matches/2.html', 'clubs/10.html', 'clubs/10-results.html', 'clubs/11.html', 'assets/app.js', 'api/players.json', 'sw.js'];
const newFiles = ['index.html', 'hub.html', 'builds.html', 'player-Mike.html', 'match-1.html', 'opp-10.html'];
const plan = planRedirects({ oldFiles, newFiles, players: [{ id: 'abc', k: 'Mike' }] });
t('same-path pages are left alone (index.html)', !('index.html' in plan));
t('assets, api and non-html files get no stub', !('assets/app.js' in plan) && !('api/players.json' in plan) && !('sw.js' in plan));
t('members.html → hub.html', plan['members.html'] === 'hub.html');
t('builder.html → builds.html', plan['builder.html'] === 'builds.html');
t('hub/index.html → hub.html', plan['hub/index.html'] === 'hub.html');
t('home player page → new player page', plan['players/abc.html'] === 'player-Mike.html');
t('other player page → classic copy', plan['players/zzz.html'] === 'classic/players/zzz.html');
t('match with a new page → new page; without → classic', plan['matches/1.html'] === 'match-1.html' && plan['matches/2.html'] === 'classic/matches/2.html');
t('club + club results → opponent page, unknown club → classic', plan['clubs/10.html'] === 'opp-10.html' && plan['clubs/10-results.html'] === 'opp-10.html' && plan['clubs/11.html'] === 'classic/clubs/11.html');
t('page the new build lacks falls back to classic', plan['about.html'] === 'classic/about.html');
t('every mapped target exists (new page) or lives under classic/', Object.values(plan).every((v) => v.startsWith('classic/') || newFiles.includes(v.split('#')[0])));
t('ROOT_MAP never points at itself', Object.entries(ROOT_MAP).every(([k, v]) => k !== v));
const s = stubHtml('players/abc.html', 'player-Mike.html');
t('stub in a folder goes up one level', s.includes('url=../player-Mike.html'));
t('stub keeps query and fragment', /location\.replace\(base\+location\.search\+f\)/.test(s));
t('members.html stub maps #schedule to the match night page', stubHtml('members.html', 'hub.html').includes('"schedule":"hub-matchnight.html"'));
t('stub is not indexable', s.includes('noindex'));
import { emitRedirects } from '../next/lib/redirects.mjs';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rd-')); const cl = path.join(tmp, 'c'), nw = path.join(tmp, 'n');
for (const f of oldFiles) { fs.mkdirSync(path.dirname(path.join(cl, f)), { recursive: true }); fs.writeFileSync(path.join(cl, f), 'x'); }
for (const f of newFiles) { fs.mkdirSync(path.dirname(path.join(nw, f)), { recursive: true }); fs.writeFileSync(path.join(nw, f), 'x'); }
emitRedirects({ out: nw, classicDir: cl, players: [{ id: 'abc', k: 'Mike' }] });
t('writes stub files into the site folder', fs.existsSync(path.join(nw, 'members.html')) && fs.existsSync(path.join(nw, 'players/abc.html')));
t('does not overwrite a real page', fs.readFileSync(path.join(nw, 'index.html'), 'utf8') === 'x');
t('old /next/ preview links redirect to the main page', fs.readFileSync(path.join(nw, 'next/hub.html'), 'utf8').includes('url=../hub.html'));
fs.rmSync(tmp, { recursive: true, force: true });
done();
