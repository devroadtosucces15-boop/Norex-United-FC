// New-design preview (/next/): builds with live data, stays hidden from search engines, keeps every formation, no broken markup.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT } from './mock.mjs';
import { t, done } from './lib.mjs';

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'nx-'));
execFileSync(process.execPath, ['next/build.mjs', '--out', out, '--preview'], { cwd: ROOT, stdio: 'pipe' });
const html = fs.readdirSync(out).filter((f) => f.endsWith('.html'));
const read = (f) => fs.readFileSync(path.join(out, f), 'utf8');
const need = ['index', 'watch', 'squad', 'halloffame', 'join', 'results', 'fixtures', 'opponents', 'stats', 'leaders', 'players', 'tactics', 'playstyle', 'studio', 'builds', 'updates', 'hub', 'staff-dugout'];

t('preview: every main page is built', need.every((n) => html.includes(n + '.html')));
t('preview: one profile page per player and a page per match', html.filter((f) => f.startsWith('player-')).length >= 30 && html.filter((f) => f.startsWith('match-')).length >= 30);
t('preview: hidden from search engines', html.every((f) => !/^(index|tactics|hub)\.html$/.test(f) || read(f).includes('noindex,nofollow')));
t('preview: labelled as a preview', read('index.html').includes('prevrib'));
t('preview: no template leftovers or undefined text', html.every((f) => { const s = read(f).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ''); return !/\bundefined\b|\bNaN\b|\[object Object\]|\$\{/.test(s); }));
t('preview: no links to the code repository or localhost', html.every((f) => !/github\.com\/devroadtosucces15|localhost|127\.0\.0\.1/.test(read(f).replace(/<script[\s\S]*?<\/script>/g, ''))));
t('preview: all 29 FC27 formations ship with the tactics pages', (JSON.parse(read('tactics.html').match(/"formations":(\[[\s\S]*?\]),"formationNote"/)?.[1] ?? '[]')).length === 29);
t('preview: static assets present', ['style.css', 'widgets.css', 'fx.css', 'fx.js', 'widgets.js', 'pitch.js', 'cards.js', 'crest.png'].every((f) => fs.existsSync(path.join(out, f))));
t('preview: real card-art API is configured only in preview builds', read('index.html').includes('norex-bot.norexunited.workers.dev'));
// ---- app shell, phone layout and motion guards (the browser overflow sweep is next/tools/overflow-audit.mjs) ----
const pages = html.filter((f) => !/^(lookbook|canvas)\.html$/.test(f)), css = ['style.css', 'motion.css', 'widgets.css'].map((f) => read(f)).join('\n');
t('app: viewport fills the notch (cover) and keeps pinch-zoom for accessibility', pages.every((f) => /name="viewport" content="[^"]*viewport-fit=cover[^"]*"/.test(read(f)) && !/maximum-scale=1|user-scalable=no/.test(read(f))));
t('app: manifest linked and valid', read('index.html').includes('rel="manifest"') && (() => { try { const m = JSON.parse(read('manifest.webmanifest')); return m.display === 'standalone' && m.start_url && m.icons?.length; } catch { return false; } })());
t('app: motion system, app layer and motion settings on every page', pages.every((f) => { const h = read(f); return h.includes('motion.css') && h.includes('pwa.js') && h.includes('data-motion-settings'); }));
t('app: canvas never scrolls sideways and inputs never trigger iOS zoom', /html\{[^}]*overflow-x:clip/.test(css) && /input,select,textarea\{font-size:max\(16px/.test(css));
t('app: every table scrolls inside its own box', pages.every((f) => { const h = read(f).replace(/<script[\s\S]*?<\/script>/g, ''); let i = -1, ok = true; while ((i = h.indexOf('<table', i + 1)) > -1) { const before = h.slice(Math.max(0, i - 400), i); if (!/overflow-x:auto|tscroll|tablewrap|hscroll/.test(before)) { ok = false; break; } } return ok; }));
t('app: no fixed inline widths wider than a small phone', pages.every((f) => !/style="(?![^"]*max-width)[^"]*(?:^|[;"\s])width:\s*(3[3-9]\d|[4-9]\d\d|\d{4,})px/.test(read(f).replace(/<script[\s\S]*?<\/script>/g, ''))));
const mp = html.find((f) => f.startsWith('match-')), mh = mp ? read(mp) : '';
t('match: field view, table view, team comparison and result graphic', ['id="mfield"', 'id="mv-table"', 'class="cmp', 'id="mposter"', 'data-pt="us"'].every((k) => mh.includes(k)));
t('match: comparison uses only fields EA sends (no possession)', !/possession<\/span>|Possession<\/span>/.test(mh));
t('portraits: players carry their EA id (the Card Studio key)', /"players":\[\{"k":"[^"]+","id":"(\d+|n-[^"]+)"/.test(read('index.html')));
t('reel: spotlight reel centres with spacers, not padding', read('index.html').includes('class="spot"') && /\.spot::before,\.wx \.spot::after/.test(read('widgets.css')));
// ---- tactics detail pass: real fielded line-ups, line stats, set pieces, Rush log, archetype usage ----
const th = read('tactics.html');
t('tactics: fielded line-ups and line stats come from the archive', th.includes('tx-fielded') && th.includes('tx-lines') && /win rate with a full 11 \(\d+-\d+-\d+ in \d+\)/.test(th));
t('tactics: set pieces panel in League and Rush, Rush log slot, pane transition', (th.match(/class="panel reveal tx-sp"/g) || []).length === 2 && th.includes('id="rushlogBody"') && (th.match(/class="txpane"/g) || []).length === 3);
t('tactics: play style roles carry real line numbers, builds show archetype use', (read('hub-handbook.html').match(/class="ps-strip"/g) || []).length >= 5 && read('builds.html').includes('class="bld-use"'));
const lh = read('leaders.html');
t('insights: leaders carry goals/assists/rating/motm slots, stats carries club.records, all hidden until filled', ['goals', 'assists', 'rating', 'motm'].every((k) => lh.includes(`data-insight="leaders.${k}" hidden`)) && read('stats.html').includes('data-insight="club.records" hidden') && !/data-insight-sec(?! hidden)/.test(lh));
const hb = read('hub.html'), pj = read('pages.js');
t('locker: medals, form and room quick links on the landing; ring, bell and skeleton→land wired', ['id="medalpanel"', 'id="formpanel"', 'class="panel reveal lk-quick"'].every((k) => hb.includes(k)) && ['lk-ring', 'M.ring(', 'M.skeleton(', 'M.land(np', 'data-lkretry', "classList.add('nocard')"].every((k) => pj.includes(k)) && /\.lk-ring\.soon\{[^}]*mxSoon/.test(read('style.css')));
const hh = read('hub-handbook.html'), hj = read('handbook.js');
t('handbook: live docs + play style mounts, game updates, markdown helper shipped, gated for members', ['id="hbdocs"', 'id="hbps"', 'id="hb-up"', 'src="docs-md.js"', 'src="handbook.js"', 'data-for="member owner"'].every((k) => hh.includes(k)) && fs.existsSync(path.join(out, 'docs-md.js')));
t('handbook: reads /api/docs + /api/playstyle, the only write is the rules acknowledge', hj.includes("'/api/docs'") && hj.includes("'/api/playstyle'") && (hj.match(/method: 'POST'/g) || []).length === 2 && (hj.match(/\/api\/[a-z/]+/g) || []).every((u) => ['/api/docs', '/api/playstyle', '/api/docs/ack'].includes(u)));
t('tactics: set-piece link lands on a Handbook play-style anchor', read('tactics.html').includes('hub-handbook.html#league-setpieces') && hj.includes('`${mode}-${k}`') === false && hj.includes('id="${mode}-${k}"'));
t('play style: members only – the block lives in the Handbook, the old page forwards there and left the public menu', read('hub-handbook.html').includes('id="hb-ourshape"') && read('playstyle.html').includes("location.replace('hub-handbook.html#hb-ps')") && !read('tactics.html').includes('href="playstyle.html"'));
const sq = read('hub-squad.html'), sj = read('squad.js');
t('squad room: five live panels behind the member gate, ranking library shipped', ['sqteam', 'sqawards', 'sqpredict', 'sqsquads', 'sqscout'].every((k) => sq.includes(`id="${k}"`)) && sq.includes('src="squad.js"') && sq.includes('src="recs.js"') && sq.includes('data-for="member owner"') && fs.existsSync(path.join(out, 'recs.js')));
t('squad room: reads only the member routes, each panel skeleton → land with a retry', ['/api/recs?mode=', "'/api/awards'", "'/api/predict'", "'/api/squads'", "'/api/scout'", "'/api/trials'"].every((k) => sj.includes(k)) && (sj.match(/M\?\.skeleton\(/g) || []).length >= 5 && sj.includes('data-sqretry') && sj.includes('NXRecs'));
t('squad room: the only writes are teammate picks, the award vote and a prediction, each through submit with an error toast', (sj.match(/post\('\/api\/[a-z/]+'/g) || []).sort().join() === ["post('/api/awards/vote'", "post('/api/predict'", "post('/api/squads/prefs'"].join() && (sj.match(/method: 'POST'/g) || []).length === 1 && sj.includes('M.submit(btn, work)') && sj.includes('data-st=') && sj.includes("n.k === A.player"));
const ch = read('hub-clubhouse.html'), cj = read('clubhouse.js');
t('clubhouse: feed, ideas, chat room and Discord mounts behind the gate', ['id="chfeed"', 'id="chideas"', 'id="chchat"', 'id="chdiscord"', 'src="clubhouse.js"', 'src="clubchat.js"', 'src="docs-md.js"', 'data-for="member owner"'].every((k) => ch.includes(k)) && cj.includes('/api/feed?f=') && cj.includes("'/api/suggestions'") && cj.includes('data-chretry') && cj.includes('M?.skeleton('));
t('clubhouse: the only writes are post, react, comment/reply, suggest and vote, each with an error toast', (cj.match(/post\('\/api\/[a-z/]+'/g) || []).sort().join() === ["post('/api/feed/comment'", "post('/api/feed/post'", "post('/api/feed/react'", "post('/api/suggestions'", "post('/api/suggestions/vote'"].join() && (cj.match(/method: 'POST'/g) || []).length === 1 && cj.includes('M.submit(btn, work)') && cj.includes('parent: F.reply[p.id].id') && cj.includes("{ kind: 'err' }"));
const cc = read('clubchat.js');
t('chat room: live socket with the session token, typing, polling fallback, offline banner and a stored retry queue', cc.includes('/api/chats/${id}/ws?t=${encodeURIComponent(A.token)}') && cc.includes("JSON.stringify({ t: 'typing' })") && cc.includes('startPoll()') && cc.includes("addEventListener('online'") && cc.includes("addEventListener('offline'") && cc.includes("QK = 'nx.chatq'") && cc.includes('!e.status || e.status >= 500') && (cc.match(/post\(`?'?\/api\/chats[^,)]*/g) || []).length >= 3 && !/\/api\/(feed|suggestions)/.test(cc));
t('on discord: reads the public widget feed only, bots hidden, voice channel links', cc.includes('https://discord.com/api/guilds/${G}/widget.json') && cc.includes('ch-discord') === false && cc.includes('/bot$/i') && cc.includes('https://discord.com/channels/${G}/') && read('style.css').includes('.dl-f.idle::after'));
const aj = read('alerts.js');
t('locker alerts: inbox + settings mounts behind the gate, the alert card links down to the inbox', ['id="lk-alerts"', 'id="lkinbox"', 'id="lkprefs"', 'src="alerts.js"'].every((k) => hb.includes(k)) && pj.includes('href="#lk-alerts"'));
t('locker alerts: reads /api/notify, writes only read / ack / prefs / test, due rules pinned on top, live-site links mapped to rooms', aj.includes("A.call('/api/notify')") && (aj.match(/post\('\/api\/[a-z/]+'/g) || []).every((u) => ["post('/api/notify/read'", "post('/api/notify/ack'", "post('/api/notify/prefs'", "post('/api/notify/test'", "post('/api/push/subscribe'", "post('/api/push/unsubscribe'"].includes(u)) && aj.includes('Needs your OK') && aj.includes("'hub-clubhouse.html#ch-ideas'") && aj.includes("v === 'off' && !t.mute"));
const ml = read('mylocker.js');
t('locker: profile, stats and medals mounts behind the gate with a jump bar, the stat card links down', ['id="lk-me"', 'id="lkme"', 'id="lk-mystats"', 'id="lkstats"', 'id="lk-medals"', 'id="lkmedals"', 'class="wrap lk-jump"', 'src="mylocker.js"'].every((k) => hb.includes(k)) && pj.includes('href="#lk-mystats"') && pj.includes('href="#lk-medals"'));
t('locker profile: reads /api/me, saves only the changed fields to /api/profile, play times travel with the time zone, warns before leaving unsaved', ml.includes("A.call('/api/me')") && ml.includes("post('/api/profile', body)") && ml.includes('keys.map((k) => [k, norm(k, P[k])])') && ml.includes("body.tz = P.tz || myTz") && ml.includes("'beforeunload'") && ml.includes('Three picks max') && ['GK', 'LWB', 'CF'].every((x) => ml.includes(`'${x}'`)) && read('style.css').includes('.pt-grid{'));
t('locker medals + stats: achievements, badges and member card reads; the only writes are seen + badge remove + profile', ml.includes("A.call('/api/achievements')") && ml.includes("A.call('/api/badges')") && ml.includes("A.call('/api/member')") && [...new Set(ml.match(/post\('\/api\/[a-z/]+'/g) || [])].sort().join() === ["post('/api/achievements/seen'", "post('/api/badges/remove'", "post('/api/profile'"].join() && ml.includes('Sure? Tap again') && ml.includes('pool.filter'));
t('locker push: per-device opt-in through the root sw.js, subscribe and unsubscribe, iPhone Home Screen hint', aj.includes("new URL('../sw.js', location.href)") && aj.includes("post('/api/push/subscribe'") && aj.includes("post('/api/push/unsubscribe'") && aj.includes('Add to Home Screen') && aj.includes("Notification.permission === 'denied'"));
const tj = read('tonight.js'), mn = read('hub-matchnight.html');
t("tonight's plays: Match Night section + locker card row from /api/locker, learned writes only, study link to the /next/ Playbook", mn.includes('id="mn-plays"') && mn.includes('id="mnplays"') && mn.includes('src="tonight.js"') && hb.includes('src="tonight.js"') && pj.includes('<div id="lkplays"></div>') && pj.includes('NorexTonight?.use(n,') && tj.includes("A.call('/api/locker')") && tj.includes('/api/plays/${+id}/learned') && (tj.match(/method: 'POST'/g) || []).length === 1 && tj.includes('playbook.html#play') && pj.includes('class="tp-pill" href="#mn-plays"'));
const cs = read('cardstudio.js'), sa = read('staff-artwork.html');
t('card studio: locker section + jump link, staff mount on the artwork page, the live card PNG maker is copied at build', hb.includes('id="lk-cards"') && hb.includes('id="lkcards"') && hb.includes('href="#lk-cards"') && hb.includes('src="cardstudio.js"') && sa.includes('id="csstaff"') && sa.includes('src="cardstudio.js"') && fs.existsSync(path.join(out, 'cardcomposer.js')) && read('style.css').includes('.tier-gold{--t1:'));
t('card studio: only the live /api/cards routes, photo sent as the raw body, private pictures fetched with the token', ['/api/cards/templates', "'/api/cards/request'", '/api/cards/request?', '/api/cards/request/cancel', '/api/cards/kit-number', '/api/cards/requests', '/api/cards/requests/decide', '/api/cards/requests/review', '/api/cards/requests/retry', '/api/cards/templates/upload?', '/api/cards/templates/update', '/api/cards/owner/requests', '/api/cards/owner/revoke', '/api/avatarcard'].every((k) => cs.includes(k))
  && (cs.match(/(?:post|raw)\(['`]\/api\/[a-z/]+/g) || []).every((u) => /\/api\/(cards|avatarcard)\b/.test(u)) && cs.includes("Authorization: 'Bearer ' + A.token") && cs.includes('URL.createObjectURL(b)') && !/\/api\/cards\/(photo|result)\/[^`'"]*['"`]\s*\)?\s*\.then\(\(r\) => r\.json/.test(cs));
t('card studio: one request a month with resubmit after a rejection, reject needs a reason, two-tap cancel and revoke, the site never says AI', cs.includes("rejected: ['🔁', 'Send a new photo'") && cs.includes("r.month !== R.month") && cs.includes("dc.dataset.dc === 'reject' && !note") && cs.includes("sure(cc, 'Cancel it? Tap again')") && cs.includes("sure(orv, 'Revoke? Tap again')") && !/>[^<]*\bAI\b[^<]*</.test(cs.replace(/^\s*\/\/.*$/gm, '')));
t('card studio: preview uses the shared card fit (NorexArt.fitInto) instead of a second image system', read('cards.js').includes('async function fitInto(el, u, kit)') && cs.includes('NorexArt?.fitInto(') && cs.includes('NorexCards.cardHTML('));
const pbj = read('playbook.js'), pbh = read('playbook.html');
t('playbook: members page in the Tactics menu, guest gate does not fight the hidden attribute, reads /api/plays', html.includes('playbook.html') && read('tactics.html').includes('href="playbook.html"') && pbh.includes('id="pbook"') && pbh.includes('src="playbook.js"') && pbh.includes('<div data-for="guest" hidden><div class="panel sq-empty">')
  && pbj.includes("A.call('/api/plays')") && pbj.includes('A.call(`/api/plays/${id}`)'));
const stj = read('studio.js'), cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8')), pls = fs.readFileSync(path.join(ROOT, 'bot/plays.js'), 'utf8');
t('playbook writes: Learned it goes through the one Match Night write (tonight.js), quiz answers are scored by the server only, recordings are fetched with the token',
  pbh.indexOf('src="tonight.js"') > -1 && pbh.indexOf('src="tonight.js"') < pbh.indexOf('src="playbook.js"') && pbh.indexOf('src="playbook.js"') < pbh.indexOf('src="studio.js"')
  && pbj.includes('NorexTonight.learn(P.id, want') && !pbj.includes('}/learned') && tj.includes('learn, note,')
  && pbj.includes('/api/plays/${P.id}/quiz') && !/\.answer\b/.test(pbj) && pbj.includes('r.score === r.total')
  && pbj.includes('A.call(`/api/plays/${id}/media`)') && pbj.includes("Authorization: 'Bearer ' + A.token") && pbj.includes('URL.revokeObjectURL(mediaUrl)')
  && (pbj.match(/method: 'POST'/g) || []).length === 2 && pbj.includes("A.call('/api/plays', { method: 'POST'"));
t('studio: owner flag first, managers only, opens at #edit<id> on the Playbook board (no second board)', cfg.features.nxStudio === 'owner' && pbj.includes("manager && flagOn('nxStudio')") && pbj.includes('location.hash.match(/^#edit(\\d+)$/)')
  && stj.includes('B().svg(S.doc, { edit: true') && pbj.includes('window.NorexBoard = {') && !/<svg/.test(stj) && read('style.css').includes('.pb-svg.edit{touch-action:none'));
t('studio: only the live play routes (save, publish, assign) plus the squad list, the live draft key, every tool is a shape the server keeps',
  ['`/api/plays/${S.id}`', '`/api/plays/${S.id}/publish`', '`/api/plays/${S.id}/assign`', "'/api/admin/overview'"].every((k) => stj.includes(k)) && (stj.match(/(?:post|A\.call)\([`']\/api\/[^`']+/g) || []).every((u) => /\/api\/(plays|admin\/overview)/.test(u))
  && stj.includes('norex_tx_draft_${S.id}') && (() => { const kinds = Object.keys(eval('(' + pls.match(/const SHAPES = (\{[^;]+\});/)[1] + ')')), teams = eval(pls.match(/const TEAMS = (\[[^\]]+\]);/)[1]);
    const tools = [...stj.matchAll(/\['(\w+)', '[^']+', '[^']+', '[^']*'\]/g)].map((m) => m[1]); return tools.filter((x) => x !== 'erase' && !teams.includes(x)).every((k) => kinds.includes(k)) && teams.every((x) => stj.includes(`['${x}', '`)) && kinds.every((k) => k === 'free' || tools.includes(k)); })()
  && stj.includes('LIMIT = { pieces: 60, drawings: 150, steps: 60, quiz: 20 }') && pls.includes('.slice(0, 60)') && pls.includes('const MAX_DRAWINGS = 150') && pls.includes('.slice(0, 20)'));
t('studio: unsaved edits warn before leaving, two-tap close / clear / unpublish, empty quiz fields block the save', stj.includes("addEventListener('beforeunload', unload)") && stj.includes("S.confirm !== 'leave'") && stj.includes("S.confirm !== 'chalk'") && stj.includes("S.confirm !== 'unpub'") && stj.includes('const bad = quizProblem(); if (bad)'));
const pmd = fs.readFileSync(path.join(ROOT, 'bot/playmedia.js'), 'utf8');
t('studio: live co-editing on the live Studio room (socket with the session token, ops through POST /op, last write wins, only the op shapes the Worker relays, no echo)',
  stj.includes('/api/plays/${id}/ws?t=${encodeURIComponent(A.token)}') && stj.includes('post(`/api/plays/${id}/op`, { op })') && stj.includes('at > cur.at || (at === cur.at && String(by) > String(cur.by))')
  && stj.includes('if (!S.live.on) return;') && stj.includes("if (String(by) === myId()) return;") && stj.includes('applyOp(S.doc, op, at); applyOp(S.synced, op, at);') && stj.includes('if (S.gesture) { S.live.pending = true; return; }')
  && ['piece', 'pieceDel', 'stroke', 'strokeDel', 'chalkClear', 'key', 'keyDel'].every((k) => stj.includes(`k: '${k}'`) && pls.includes(`op.k === '${k}'`)) && pls.includes("op: { k: 'saved', version }") && stj.includes("op.k === 'saved'"));
t('studio: recordings (tab capture + voice-over) upload raw with the token, within the server caps; hide is two-tap',
  stj.includes('getDisplayMedia({') && stj.includes('preferCurrentTab: true') && stj.includes('getUserMedia({ audio: true })') && stj.includes('/media?kind=${R.kind}`') && stj.includes("Authorization: 'Bearer ' + A.token, 'Content-Type': type")
  && stj.includes('REC_MAX = { video: 60e6, voice: 10e6 }') && pmd.includes('MEDIA_MAX = { video: 60e6, voice: 10e6 }') && stj.includes('REC_COUNT = 6') && pmd.includes('MEDIA_PER_PLAY = 6') && stj.includes('ATTACH_MAX = 25e6') && pmd.includes('DISCORD_ATTACH_MAX = 25e6')
  && stj.includes("['video/webm;codecs=vp9', 'video/webm', 'video/mp4']") && stj.includes(".split(';')[0]") && stj.includes("arm('hide:' + mid") && stj.includes('/media/${mid}/delete`'));
t('studio: Share to Discord (play or recording) previews the post first from the same fields the Worker sends; versions restore and archive are two-tap',
  stj.includes("A.call('/api/plays/discord')") && stj.includes('/api/plays/${S.id}/discord`, body)') && stj.includes('/media/${sh.mode}/discord`, body)') && stj.includes('if (r.ok === false)')
  && stj.includes("ICON = { 'set-piece': '⚽', formation: '🧩', drill: '🏃' }") && pls.includes("CAT_ICON = { 'set-piece': '⚽', formation: '🧩', drill: '🏃' }") && stj.includes("'A new play in the Tactics Studio.'") && pls.includes("'A new play in the Tactics Studio.'")
  && stj.includes('Preview · nothing is sent yet') && stj.includes("arm('v' + v") && stj.includes('/restore`, { version: v })') && stj.includes("arm('arch'") && stj.includes('/delete`, {})') && pbj.includes('onArchive: (id) =>'));
t('bug reporter: the live 🐞 issue tool on every /next/ page for the owner (flag issueTool), posts through the session to /api/issues', fs.existsSync(path.join(out, 'report.js')) && fs.existsSync(path.join(out, 'report.css')) && read('report.js').includes("ctx.call('/api/issues'")
  && read('session.js').includes("role === 'owner'") && read('session.js').includes("includes('issueTool')") && read('session.js').includes("src: 'report.js'") && pages.every((f) => read(f).includes('src="session.js"')));
t('playbook: deep links use the live #play<id> hash, keyframes carry pieces forward, the live chalk shapes, tall view attacks up', pbj.includes("location.hash.match(/^#play(\\d+)$/)") && pbj.includes('cur = { ...cur, ...s.pieces }') && ['free', 'dot', 'text', 'circle', 'rect', 'curve', 'darrow'].every((k) => pbj.includes(`'${k}'`)) && pbj.includes('vert ? [y, W - x] : [x, y]'));
t('locker: claims match a player by EA id as well as by name (the live site stores the EA id)', read('cards.js').includes('x.k === A.player || x.id === A.player'));
t('hub: Staff tab in the Hub menu shows only for staff', read('hub.html').includes('href="staff.html" class="" data-for="owner" hidden'));
// ---- B2 Builds: builder + pro builds + my builds on the live routes, the live build maths, the newest game-rules dataset ----
{
  const bh = read('builds.html'), bj = read('builds.js'), gj = JSON.parse(read('game.json'));
  const gdir = path.join(ROOT, 'data/game'), newest = fs.readdirSync(gdir).filter((f) => /^fc\d+-.+\.json$/.test(f)).map((f) => JSON.parse(fs.readFileSync(path.join(gdir, f), 'utf8'))).sort((a, b) => String(b.published).localeCompare(String(a.published)))[0];
  t('builds: four panes (Builder, Pro builds, My builds, Archetypes), live build maths loaded before builds.js, pages.js no longer drives the tabs',
    ['data-pane="b"', 'data-pane="p"', 'data-pane="m"', 'data-pane="a"', 'id="bxb"', 'id="bxp"', 'id="bxm"', 'data-t="m"'].every((k) => bh.includes(k))
    && bh.indexOf('src="build-math.js"') > -1 && bh.indexOf('src="build-math.js"') < bh.indexOf('src="builds.js"') && read('build-math.js') === fs.readFileSync(path.join(ROOT, 'web/build-math.js'), 'utf8') && !read('pages.js').includes("$('#pp')"));
  t('builds: ships the newest versioned dataset as the offline seed and asks the Worker first', gj.version === newest.version && bh.includes(`max level ${newest.levelCap?.value}`) && bj.includes('`${API}/api/game`') && bj.includes("fetch('game.json')"));
  const posts = [...bj.matchAll(/send\('([^']+)'/g)].map((m) => m[1]).sort(), gets = [...bj.matchAll(/get\(`?'?(\/api\/[a-z/]+)/g)].map((m) => m[1]);
  const routes = fs.readFileSync(path.join(ROOT, 'bot/builds.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'bot/probuilds.js'), 'utf8');
  t('builds: writes are save/update, delete, copy, post/take down, vote, comment + delete, my build pick and Club recommended, all existing Worker routes',
    JSON.stringify([...new Set(posts)]) === JSON.stringify(['/api/builds', '/api/builds/delete', '/api/builds/fork', '/api/mybuild', '/api/probuilds/comment', '/api/probuilds/comment/delete', '/api/probuilds/feature', '/api/probuilds/post', '/api/probuilds/unpost', '/api/probuilds/vote'])
    && [...new Set([...posts, ...gets])].every((r) => routes.includes(`'${r}'`)) && !bj.includes('../probuilds.html'));
  t('builds: votes toggle (same arrow again clears), are optimistic and rolled back on error, never on your own build', bj.includes('x.myVote === n ? 0 : n') && bj.includes('Object.assign(x, was)') && bj.includes('x.mine ? \' disabled'));
  t('builds: comments write (500 chars) and delete with two taps, only where the Worker says canDelete', bj.includes('maxlength="500"') && bj.includes("twoTap(t, 'Delete?')") && bj.includes('c.canDelete ?') && bj.includes('{ comment: id }'));
  t('builds: ⭐ my build for League or Rush from the Builder, a pro build or My builds, and a pick can be cleared', ['data-bxusego="side"', 'data-bxusego="d${x.id}"', 'data-bxusego="m${x.id}"', "{ mode, id: null }"].every((k) => bj.includes(k)));
  t('builds: managers get Club recommended + remove post (two taps); the Worker checks the role', bj.includes("A.role === 'manager' || A.role === 'owner'") && bj.includes("label: null") && bj.includes("twoTap(btn, 'Tap again to remove the post')"));
  t('builds: ⚖️ compare against my builds, pro builds or a share link, and a 🖼️ 1080×1350 image card with the crest',
    bj.includes('function compareHtml(') && bj.includes('🔗 Paste a share link') && bj.includes('W = 1080, H = 1350') && bj.includes("crest.src = 'crest.png'") && fs.existsSync(path.join(out, 'crest.png')));
  t('builds: delete and take down need two taps, unsaved edits warn before leaving, the build survives the Discord login', /twoTap\(t, 'Tap again to delete'\)/.test(bj) && bj.includes("twoTap(btn, 'Tap again to take it down')") && bj.includes('beforeunload') && bj.includes("sessionStorage.setItem(PENDING"));
  t('builds: older game rules show what changed (/api/game/changes) and upgrade to MAX', bj.includes('/api/game/changes?from=') && bj.includes('X.fit(g, { ...b, level: cap() })'));
  // the share code round-trips through the live maths with the shipped dataset
  const ctx = {}; new Function('globalThis', read('build-math.js'))(ctx); const X = ctx.NXBuildMath;
  const arch = gj.archetypes.find((a) => a.group === 'FWD'), b = { arch: arch.id, level: gj.levelCap.value, spent: {}, ps: [gj.playstyles[0].id], plus: [], h: 185, w: 80 };
  for (const a of ['Finishing', 'Positioning']) for (let i = 0; i < 4; i++) { const ev = X.evaluate(gj, b); if (X.canAdd(gj, ev, a) != null) b.spent[a] = (b.spent[a] || 0) + 1; }
  const back = X.decode(gj, X.encode(gj, b));
  t('builds: share code round-trips archetype, level, points, PlayStyles, body and the dataset version', back.arch === b.arch && back.level === b.level && Object.keys(b.spent).length === 2 && Object.entries(b.spent).every(([k, v]) => back.spent[k] === v) && Object.keys(back.spent).length === 2 && back.ps[0] === b.ps[0] && back.h === 185 && back.version === gj.version);
  t('builds: archetype cards show signature attributes and open the builder', (bh.match(/class="bx-sig"/g) || []).length >= 10 && bh.includes('data-bxtry="finisher"'));
}
{
  const bj = read('boardroom.js'), bh = read('staff-boardroom.html');
  t('boardroom: page loads the script, carries the committed levels and keeps the offline stub', bh.includes('src="boardroom.js"') && bh.includes('id="brLive"') && bh.includes('data-committed="{') && bh.includes('id="brLocal"'));
  t('boardroom: flag edits use the live routes and body names and ask first', bj.includes("'/api/admin/flags', { name, level }") && bj.includes("'/api/admin/flags/reset'") && /confirm\(`Change/.test(bj));
  t('boardroom: Medals tab uses /api/admin/medals ops, confirms destructive ones; Backup tab downloads a JSON copy and restores medals', ['save', 'hide', 'reset', 'delete', 'award', 'revoke'].every((o) => bj.includes(`'${o}'`) || bj.includes(`op === '${o}'`) || bj.includes(`${o}:`)) && bj.includes("'/api/admin/medals'") && bj.includes("data-tab") && /TABS = .*medals.*backup/.test(bj) && bj.includes('norex-boardroom-backup') && bh.includes('src="trophy.js"'));
  const tj = read('trophy.js');
  t('trophies: SVG per shape and rarity, picked from the award wording', ['cup', 'boot', 'glove', 'star', 'shield', 'ball', 'crown'].every((x) => tj.includes(x + ':')) && ['common', 'rare', 'epic', 'legendary'].every((x) => tj.includes(x)) && tj.includes('window.NorexTrophy'));
  t('boardroom: announcements preview then confirm; Discord posts preview then confirm; HoF removal confirms', bj.includes("preview: true") && (bj.match(/confirm\(/g) || []).length >= 6 && bj.includes("'/api/hof/remove'"));
  const ij = read('intel.js'), ih = read('staff-insights.html');
  t('insights: page loads the script, keeps the offline stub and is linked from Staff', ih.includes('src="intel.js"') && ih.includes('id="ixLive"') && ih.includes('id="ixLocal"') && read('staff.html').includes('staff-insights.html'));
  t('insights: Club Intelligence uses the live routes; to-dos can be undone and reminders ask first', ij.includes("'/api/intel'") && ij.includes("'/api/intel/act'") && ij.includes("'/api/intel/remind'") && /confirm\('Remind/.test(ij));
  t('insights: three cards on phones (one at a time) and all three on wide screens', ij.includes('data-card') && css.includes('.ix-card{display:none}') && css.includes('.ix-cards{display:grid;grid-template-columns:repeat(3'));
  t('insights: burners track/stop ask first, use the staff routes and say burners are never official', ij.includes("'/api/burners/track'") && ij.includes("'/api/burners/remove'") && (ij.match(/confirm\(/g) || []).length >= 3 && /never official/.test(ij) && !/data\/matches|league totals count/i.test(ij));
}
// ---- Phase D1: Watch + embeds ----
{ const wh = read('watch.html'), wj = read('watch.js');
  t('watch: page has the live slot, channels and the Watch menu entry', wh.includes('data-watch-live') && wh.includes('twitch.tv') && read('index.html').includes('watch.html'));
  t('watch: script on every page, reads /api/live, clip blurs after 10 s with a prompt', pages.every((f) => read(f).includes('watch.js')) && wj.includes('/api/live') && wj.includes('CLIP_MS = 10000') && wj.includes('Tap to keep watching'));
  t('watch: feed/doc video links become posters that load only on tap', wj.includes('.md-video') && wj.includes('i.ytimg.com') && wj.includes("wt-play').addEventListener('click'"));
  t('watch: Twitch parent is the page host, no autoplay with sound', wj.includes('parent=${encodeURIComponent(location.hostname)}') && wj.includes('muted=true')); }
// ---- Phase D6/D7: Rush results page + result graphic ----
{ const rh = read('rush.html'), rj = read('rush.js');
  t('rush: page built with the list, scorers and opponents slots, linked from the Matches menu', ['id="rs-list"', 'id="rs-pl"', 'id="rs-op"', 'rush.js'].every((k) => rh.includes(k)) && read('results.html').includes('rush.html'));
  t('rush: reads only the public confirmed-games API and escapes every name', rj.includes("/api/rush'") && !rj.includes('/api/rush/') && rj.includes('esc(m.opp') && rj.includes('esc(r.n)'));
  t('rush: per-game result graphic is a PNG download, nothing is posted', rj.includes("'image/png'") && rj.includes('data-poster') && !/method:\s*'POST'/.test(rj)); }
// ---- Phase D2–D4: news, join flow, opponent reports ----
{ const jh = read('join.html'), jj = read('join.js'), nh = read('news.html'), nj = read('news.js'), oh = read('opponents.html');
  const oppFiles = fs.readdirSync(out).filter((f) => /^opp-.+\.html$/.test(f)), op = read(oppFiles[0]);
  t('join: real Discord apply link, requirements, positions and the open/closed line are on the page', jh.includes('https://discord.gg/') && jh.includes('What we look for') && jh.includes('Positions we want') && /Trials are (open|closed)/.test(jh));
  t('join: short form posts to /api/trials/apply with a honeypot, validates positions/discord/clips and stays hidden until the API answers', jj.includes('/api/trials/apply') && jh.includes('name="website"') && jh.includes('data-join-form hidden') && jj.includes('Pick up to three positions') && jj.includes('must start with https://'));
  t('join: signed-in status reads /api/me (approved, pending, declined, unlinked) and guests get a sign-in card', jj.includes("get('/api/me')") && ['approved', 'pending', 'declined'].every((k) => jj.includes(`'${k}'`)) && jj.includes('data-login'));
  t('join: managers to talk to come from /api/contacts', jj.includes('/api/contacts') && jh.includes('data-join-contacts'));
  t('news: page, Club menu entry, public feed from /api/feed/public and honest empty/off states', nh.includes('data-news-feed') && read('index.html').includes('news.html') && nj.includes('/api/feed/public') && nj.includes('Nothing shared publicly yet') && nj.includes('for members for now'));
  t('news: docs stay squad-only – guests get links, members their pinned docs from /api/docs', nj.includes("'/api/docs'") && nj.includes('pinned') && nh.includes('hub-handbook.html') && nh.includes('Requirements to join'));
  t('opponents: every rival has a report page, linked from the table', oppFiles.length >= 1 && oh.includes('href="opp-') && oh.includes('🔍 Report'));
  t('opponent report: record, facts, players faced and every meeting, all from match data', ['Scouting report', 'What we know', 'Players we have faced', 'Every meeting', 'data-insight="h2h.'].every((k) => op.includes(k)) && op.includes('href="match-')); }
fs.rmSync(out, { recursive: true, force: true });
done();
