// Club knowledge: P5.1 Play Style, P5.2 docs hub (versions, rules acknowledgement), P5.3 announcements to Discord,
// P5.4 suggestion box – markdown-lite renderer, pages, API and permissions.
import fs from 'node:fs';
import { call, env, login, ROOT, sqlite, W } from './mock.mjs';
import { t, tt, done } from './lib.mjs';
import '../web/docs-md.js';

const M = globalThis.NXMd;
const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };

// ----- markdown-lite -----
const h = M.html('# Plan\nWe **press** and *keep* it. [Rules](docs.html#rules) · https://x.com/a?b=1&c=2\n- one\n- two\n1. first\n> quote\n---\nhttps://i.imgur.com/a.png\nhttps://youtu.be/dQw4w9WgXcQ\nhttps://www.twitch.tv/x/clip/Clip-1', { host: 'norex.test' });
t('md: heading, bold, italic', h.includes('<h3>Plan</h3>') && h.includes('<b>press</b>') && h.includes('<i>keep</i>'));
t('md: site link + https autolink (new tab)', h.includes('<a href="docs.html#rules">Rules</a>') && h.includes('href="https://x.com/a?b=1&amp;c=2" target="_blank" rel="noopener nofollow"'));
t('md: lists, quote, rule', h.includes('<ul><li>one</li><li>two</li></ul>') && h.includes('<ol><li>first</li></ol>') && h.includes('<blockquote>quote</blockquote>') && h.includes('<hr>'));
t('md: image line → picture, video lines → players', h.includes('<img src="https://i.imgur.com/a.png"') && h.includes('youtube-nocookie.com/embed/dQw4w9WgXcQ') && h.includes('clips.twitch.tv/embed?clip=Clip-1&amp;parent=norex.test'));
const bad = M.html('<script>alert(1)</script>\n<img src=x onerror=alert(1)>\n[x](javascript:alert(1))\n[y](//evil.com)\nhttp://plain.com/a.png\n"><b>');
t('md: HTML escaped, no javascript:/protocol-relative links, http images stay text', !/<script|<img src=x|href="javascript|href="\/\/|<img src="http:/i.test(bad) && bad.includes('&lt;script&gt;'));
t('md: unknown video hosts are not embedded', !M.html('https://evil.com/watch?v=abc').includes('iframe') && M.video('https://youtube.com/watch?v=a"b') === null);
t('md: excerpt is plain text', M.excerpt('# T\nWe **press** [here](https://x.com).\n- a') === 'We press here. a');

// ----- pages -----
const read = (f) => fs.readFileSync(ROOT + 'site/' + f, 'utf8');
const docsPage = read('docs.html'), psPage = read('playstyle.html'), home = read('index.html');
t('P5.2 docs.html behind the docs flag + static glossary', docsPage.includes('data-flag="docs"') && docsPage.includes('data-docs') && docsPage.includes('Form index') && docsPage.includes('assets/docs.js'));
t('P5.1 playstyle.html behind the playStyle flag', psPage.includes('data-flag="playStyle"') && psPage.includes('data-playstyle'));
t('footer links docs + play style (flagged), home has the news slot', home.includes('href="docs.html" data-flag="docs"') && home.includes('href="playstyle.html" data-flag="playStyle"') && home.includes('data-news'));
t('assets shipped', ['docs.js', 'docs-md.js', 'docs.css'].every((f) => fs.existsSync(ROOT + 'site/assets/' + f)));

// ----- fake Discord (P5.3 + DMs) -----
env.DISCORD_BOT_TOKEN = 'bot';
const posts = [];
let refuse = null;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.endsWith('/guilds/9/channels')) return Response.json([{ id: '70001', name: 'general', type: 0, position: 2 }, { id: '70002', name: 'news', type: 5, position: 1 }, { id: '70003', name: 'Voice', type: 2 }]);
  if (u.endsWith('/guilds/9/roles')) return Response.json([{ id: '9', name: '@everyone', position: 0 }, { id: '80001', name: 'Squad', position: 3 }, { id: '80002', name: 'Bot', managed: true }]);
  if (u.endsWith('/users/@me/channels')) return Response.json({ id: 'dm' });
  const m = u.match(/\/channels\/(\w+)\/messages$/);
  if (m && m[1] !== 'dm') {
    if (refuse) return Response.json({ code: refuse, message: 'Missing Permissions' }, { status: 403 });
    posts.push({ channel: m[1], ...JSON.parse(init.body) });
    return Response.json({ id: `m${posts.length}` });
  }
  if (m) return Response.json({ id: 'dm-msg' });
  return realFetch(url, init);
};

const owner = await login('111', [], 'Founder');
const mgr = await login('600', ['mgr'], 'Coach');
const member = await login('500', [], 'Player One');
const member2 = await login('501', [], 'Player Two');

// ----- flags -----
setFlags({ docs: 'owner', playStyle: 'owner', suggestions: 'owner', notifications: 'members' });
t('flags: docs 404 for guests + members while owner-only', (await W('/api/docs')).status === 404 && (await call(member, '/api/docs')).s === 404);
t('flags: play style + suggestions 404 for a member', (await call(member, '/api/playstyle')).s === 404 && (await call(member, '/api/suggestions')).s === 404);
t('flags: owner gets in', (await call(owner, '/api/docs')).s === 200 && (await call(owner, '/api/playstyle')).s === 200 && (await call(owner, '/api/suggestions')).s === 200);
setFlags({ docs: 'public', playStyle: 'members', suggestions: 'members' });

// ----- P5.2 docs -----
t('member cannot write docs (403)', (await call(member, '/api/docs', { area: 'faq', title: 'Hi there', body: 'x' })).s === 403);
t('unknown area refused', (await call(mgr, '/api/docs', { area: 'nope', title: 'Hello', body: 'x' })).s === 400);
const req = await call(mgr, '/api/docs', { area: 'requirements', title: 'Mic <b>on</b>', body: 'Always on **comms**.', public: true });
t('manager adds a public requirement (title cleaned)', req.s === 200 && req.d.items.some((x) => x.area === 'requirements' && x.title === 'Mic b on /b' && x.public));
const ann = await call(mgr, '/api/docs', { area: 'announce', title: 'Season kick-off', body: 'League starts **Friday**.', pinned: true, notify: true });
const annId = ann.d.id;
t('announcement saved + members notified', ann.s === 200 && ann.d.notified >= 3 && (await call(member, '/api/notify')).d.items.some((n) => n.title === 'Season kick-off' && n.link === `docs.html#d-${annId}`));
const guestView = await (await W('/api/docs')).json();
t('guest sees only public items, no rules state', guestView.items.length === 1 && guestView.items[0].area === 'requirements' && guestView.rules === undefined && !guestView.canEdit);
const memView = (await call(member, '/api/docs')).d;
t('member sees members-only items too, no edit rights', memView.items.length === 2 && !memView.canEdit && memView.rules.version === 0 && memView.rules.acked);
t('manager view: can edit + Discord', (await call(mgr, '/api/docs')).d.canEdit && (await call(mgr, '/api/docs')).d.canDiscord);
t('title required', (await call(mgr, '/api/docs', { area: 'faq', title: 'x', body: 'y' })).s === 400);

const ed = await call(mgr, '/api/docs', { id: annId, title: 'Season kick-off!', body: 'League starts **Saturday**.', pinned: true });
t('edit → version 2', ed.d.items.find((x) => x.id === annId).version === 2 && ed.d.items.find((x) => x.id === annId).editedBy === 'Coach');
t('edit with same text keeps the version (pin change only)', (await call(mgr, '/api/docs', { id: annId, title: 'Season kick-off!', body: 'League starts **Saturday**.', pinned: false })).d.items.find((x) => x.id === annId).version === 2);
const hist = await call(mgr, `/api/docs/history?id=${annId}`);
t('history lists current + old versions', hist.s === 200 && hist.d.versions.length === 2 && hist.d.versions[1].body === 'League starts **Friday**.');
t('history is managers only', (await call(member, `/api/docs/history?id=${annId}`)).s === 403);
const rs = await call(mgr, '/api/docs/restore', { id: annId, version: 1 });
t('restore v1 → saved as v3 with the old text', rs.s === 200 && rs.d.items.find((x) => x.id === annId).version === 3 && rs.d.items.find((x) => x.id === annId).body === 'League starts **Friday**.');

// ----- rules + acknowledgements -----
const rule = await call(mgr, '/api/docs', { area: 'rules', title: 'Respect everyone', body: 'No toxicity on comms.', ack: true });
t('rules with ack → rules version 1', rule.s === 200 && rule.d.rulesVersion === 1 && rule.d.rules.acked);
const ms = (await call(member, '/api/docs')).d.rules;
t('member has not acknowledged yet', ms.version === 1 && !ms.acked);
const due = (await call(member, '/api/notify/count')).d.ack;
t('member gets a must-acknowledge notification pointing at the rules', due && /rules/i.test(due.title));
const ackd = await call(member, '/api/docs/ack', {});
t('member acknowledges on the docs page', ackd.s === 200 && ackd.d.rules.acked && !(await call(member, '/api/notify/count')).d.ack);
const n2 = (await call(member2, '/api/notify/count')).d.ack;
await call(member2, '/api/notify/ack', { id: n2.id });
t('"Got it" on the rules notification counts as acknowledging', (await call(member2, '/api/docs')).d.rules.acked);
const acks = await call(mgr, '/api/docs/acks');
t('managers see who has / hasn’t acknowledged', acks.s === 200 && acks.d.acked.some((u) => u.id === '500') && acks.d.acked.some((u) => u.id === '600') && acks.d.missing.some((u) => u.id === '111') && !acks.d.missing.some((u) => u.id === '501'));
t('acks list is managers only', (await call(member, '/api/docs/acks')).s === 403);
const rem = await call(mgr, '/api/docs/remind', {});
t('remind the rest, then 429 within 12 h', rem.s === 200 && rem.d.sent >= 1 && (await call(mgr, '/api/docs/remind', {})).s === 429);
const typo = await call(mgr, '/api/docs', { id: rule.d.id, title: 'Respect everyone', body: 'No toxicity on comms!', ack: false });
t('typo fix without ack keeps the rules version', typo.s === 200 && !typo.d.rulesVersion && (await call(member, '/api/docs')).d.rules.acked);
await call(mgr, '/api/docs', { id: rule.d.id, title: 'Respect everyone', body: 'No toxicity. Ever.', ack: true });
t('real change with ack → everyone acknowledges again', (await call(member, '/api/docs')).d.rules.version === 2 && !(await call(member, '/api/docs')).d.rules.acked);

// ----- P5.3 Discord -----
t('member cannot load Discord targets', (await call(member, '/api/docs/discord')).s === 403);
const tg = (await call(mgr, '/api/docs/discord')).d;
t('Discord targets: text + announcement channels, roles without bots, @everyone named', tg.ready && tg.channels.map((c) => c.id).join() === '70002,70001' && tg.roles.some((r) => r.id === '9' && r.name === '@everyone') && !tg.roles.some((r) => r.id === '80002'));
const dc = await call(mgr, '/api/docs/discord', { id: annId, channel: '70002', role: '80001' });
const p0 = posts.at(-1);
t('post to Discord: embed, role ping only that role, link back', dc.s === 200 && p0.channel === '70002' && p0.content === '<@&80001>' && p0.allowed_mentions.roles[0] === '80001' && p0.embeds[0].title.includes('Season kick-off') && p0.embeds[0].url.endsWith(`docs.html#d-${annId}`));
t('posted item remembers it (managers see it) + last channel', dc.d.items.find((x) => x.id === annId).discord?.channel === '70002' && (await call(mgr, '/api/docs/discord')).d.last === '70002');
t('members don’t see the Discord marker', !(await call(member, '/api/docs')).d.items.find((x) => x.id === annId).discord);
await call(mgr, '/api/docs/discord', { id: annId, channel: '70001', role: '9' });
t('@everyone ping uses parse everyone', posts.at(-1).content === '@everyone' && posts.at(-1).allowed_mentions.parse[0] === 'everyone');
refuse = 50013;
const no = await call(mgr, '/api/docs/discord', { id: annId, channel: '70001' });
t('missing permission → helpful error', no.s === 400 && /Send Messages/.test(no.d.error));
refuse = null;
const withDc = await call(mgr, '/api/docs', { area: 'announce', title: 'Trials Sunday', body: 'Bring a mic.\nhttps://i.imgur.com/p.png', discord: { channel: '70001' } });
t('publish + post to Discord in one go (image becomes the embed picture)', withDc.d.discord?.ok && posts.at(-1).embeds[0].image?.url === 'https://i.imgur.com/p.png' && !posts.at(-1).embeds[0].description.includes('imgur') && !posts.at(-1).content);
t('bad channel id refused', (await call(mgr, '/api/docs/discord', { id: annId, channel: 'abc' })).s === 400);

const rm = await call(mgr, '/api/docs/remove', { id: withDc.d.id });
t('remove hides it (history kept)', rm.s === 200 && !rm.d.items.some((x) => x.id === withDc.d.id) && sqlite.prepare('SELECT removed_at FROM docs WHERE id = ?').get(withDc.d.id).removed_at > 0);

// ----- P5.1 Play Style -----
const ps0 = await call(member, '/api/playstyle');
t('member reads Play Style (empty = placeholders), cannot edit', ps0.s === 200 && ps0.d.sections.length === 0 && !ps0.d.canEdit);
t('guest gets 401', (await W('/api/playstyle')).status === 401);
t('member cannot write Play Style', (await call(member, '/api/playstyle', { mode: 'league', section: 'philosophy', body: 'x' })).s === 403);
t('bad section refused', (await call(mgr, '/api/playstyle', { mode: 'league', section: 'nope', body: 'x' })).s === 400);
const ps1 = await call(mgr, '/api/playstyle', { mode: 'rush', section: 'formations', body: 'Diamond.' });
const ps2 = await call(mgr, '/api/playstyle', { mode: 'rush', section: 'formations', body: 'Box.' });
t('Play Style saves per mode + section, edits make versions', ps1.s === 200 && ps2.d.sections.length === 1 && ps2.d.sections[0].version === 2 && ps2.d.sections[0].title === 'Formations' && ps2.d.sections[0].mode === 'rush');
t('Play Style rows stay out of the docs hub', !(await call(member, '/api/docs')).d.items.some((x) => x.area === 'playstyle'));

// ----- P5.4 suggestions -----
const s1 = await call(member, '/api/suggestions', { title: 'Weekly <i>scrims</i>', body: 'Against div 1 clubs', anon: true });
const sid = s1.d.items[0].id;
t('member sends an anonymous idea (author sees it is theirs)', s1.s === 200 && s1.d.items[0].own && s1.d.items[0].anon && s1.d.items[0].by?.id === '500');
const other = (await call(member2, '/api/suggestions')).d.items.find((x) => x.id === sid);
t('other members don’t see an anonymous author', other && other.by === null && !other.own);
t('managers see the author', (await call(mgr, '/api/suggestions')).d.items.find((x) => x.id === sid).by.id === '500');
t('managers were notified', (await call(mgr, '/api/notify')).d.items.some((n) => /New suggestion/.test(n.title)));
t('duplicate idea → 409', (await call(member2, '/api/suggestions', { title: 'weekly  i scrims /i' })).s === 409);
t('too-short idea refused', (await call(member2, '/api/suggestions', { title: 'no' })).s === 400);
t('can’t vote own idea', (await call(member, '/api/suggestions/vote', { id: sid, on: true })).s === 400);
t('vote up, then take it back', (await call(member2, '/api/suggestions/vote', { id: sid, on: true })).d.items.find((x) => x.id === sid).up === 1
  && (await call(member2, '/api/suggestions/vote', { id: sid, on: true })).d.items.find((x) => x.id === sid).up === 1
  && (await call(member2, '/api/suggestions/vote', { id: sid, on: false })).d.items.find((x) => x.id === sid).up === 0);
t('member cannot set a status', (await call(member2, '/api/suggestions/decide', { id: sid, status: 'planned' })).s === 403);
const dec = await call(mgr, '/api/suggestions/decide', { id: sid, status: 'planned', reply: 'Starting next month.' });
t('manager plans it with a reply', dec.s === 200 && dec.d.items.find((x) => x.id === sid).status === 'planned' && dec.d.items.find((x) => x.id === sid).repliedBy === 'Coach');
t('author gets the reply as a notification', (await call(member, '/api/notify')).d.items.some((n) => n.type === 'idea' && /Planned/.test(n.title) && /next month/.test(n.body)));
t('bad status refused', (await call(mgr, '/api/suggestions/decide', { id: sid, status: 'maybe' })).s === 400);
t('someone else can’t remove it', (await call(member2, '/api/suggestions/remove', { id: sid })).s === 403);
t('author removes it', (await call(member, '/api/suggestions/remove', { id: sid })).d.items.every((x) => x.id !== sid));
for (let i = 0; i < 5; i++) await call(member2, '/api/suggestions', { title: `Idea number ${i}` });
t('5 ideas a day', (await call(member2, '/api/suggestions', { title: 'Idea number 6' })).s === 429);

await tt('activity log records docs + ideas', async () => {
  const types = sqlite.prepare("SELECT DISTINCT type FROM activity WHERE type LIKE 'doc-%' OR type LIKE 'rules-%' OR type LIKE 'suggest%' OR type = 'playstyle-edit'").all().map((r) => r.type);
  return ['doc-new', 'doc-edit', 'doc-restore', 'doc-discord', 'doc-remove', 'rules-ack', 'rules-remind', 'playstyle-edit', 'suggest', 'suggest-status', 'suggest-remove'].every((x) => types.includes(x));
});
done();
