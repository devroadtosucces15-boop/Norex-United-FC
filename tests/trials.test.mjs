// Recruitment: manager contacts (P1.4), public form + trial cards (P1.5), scouting (P5.5), manager notes (P5.7).
import fs from 'node:fs';
import { call, env, login, ROOT, siteJson, W } from './mock.mjs';
import { t, done } from './lib.mjs';

const owner = await login('111', [], 'Founder 👑');
const mgr = await login('600', ['mgr'], 'Coach');
const mgr2 = await login('601', ['mgr'], 'Coach Two');
const member = await login('500');
const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
const apply = (body, ip = '1.1.1.1') => W('/api/trials/apply', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip }, body: JSON.stringify(body) })
  .then(async (r) => ({ s: r.status, d: await r.json() }));
const form = { ea: 'Rising_Star9', platform: 'PS5', positions: ['ST', 'CAM'], discord: 'risingstar', clips: 'https://youtu.be/abc', note: 'Box-to-box <script>x</script>' };

// ----- flags (all owner-only at launch) -----
t('contacts hidden while flag is owner-only', (await W('/api/contacts')).status === 404);
t('public form hidden while flag is owner-only', (await apply(form)).s === 404);
t('manager gets 404 for trials while owner-only', (await call(mgr, '/api/trials')).s === 404);
t('member gets 404 for scouting while owner-only', (await call(member, '/api/scout')).s === 404);
setFlags({ trials: 'public', scouting: 'members', managerNotes: 'managers' });

// ----- P1.4 contacts -----
const c = (await (await W('/api/contacts')).json()).contacts;
t('contacts: owner first, managers after', c[0]?.id === '111' && c[0].role === 'owner' && c.some((x) => x.id === '600') && c.some((x) => x.id === '601'));
t('contacts: plain members not listed', !c.some((x) => x.id === '500'));
t('contacts carry Discord tag + avatar', c[0].tag === 'u111' && !!c[0].a);

// ----- P1.5 public form -----
t('form: missing Discord rejected', (await apply({ ...form, discord: '' })).s === 400);
t('form: bad position list rejected', (await apply({ ...form, positions: ['XX'] })).s === 400);
t('form: javascript: clips rejected', (await apply({ ...form, clips: 'javascript:alert(1)' })).s === 400);
t('form: honeypot silently ignored', (await apply({ ...form, website: 'spam' })).s === 200);
t('form: valid application accepted', (await apply(form)).s === 200);
t('form: duplicate open application → 409', (await apply({ ...form, ea: 'rising_star9' }, '2.2.2.2')).s === 409);
await apply({ ...form, ea: 'Second_One' });
await apply({ ...form, ea: 'Third_One' });
t('form: 4th from the same IP in a day → 429', (await apply({ ...form, ea: 'Fourth_One' })).s === 429);

// ----- trial cards -----
t('member cannot read trials (403)', (await call(member, '/api/trials')).s === 403);
t('no login → 401', (await W('/api/trials')).status === 401);
let tr = await call(mgr, '/api/trials');
const card = tr.d.trials.find((x) => x.ea === 'Rising_Star9');
t('application became an "applied" trial card', tr.s === 200 && card?.status === 'applied' && card.source === 'form' && card.events[0].status === 'applied');
t('XSS stripped from the applicant note', !card.note.includes('<'));
t('honeypot application not stored', tr.d.trials.length === 3);
const sq = siteJson('players').find((x) => x.home);
tr = await call(mgr, '/api/trials/add', { ea: sq.n, platform: 'Xbox', positions: ['CB'], source: 'discord' });
const known = tr.d.trials.find((x) => x.ea === sq.n);
t('manager adds a Discord applicant; known gamertag links the player page', tr.s === 200 && known.source === 'discord' && known.player === sq.k);
t('manual duplicate → 409', (await call(mgr, '/api/trials/add', { ea: sq.n, platform: 'Xbox', positions: ['CB'] })).s === 409);
tr = await call(mgr, '/api/trials/update', { id: card.id, status: 'trialling' });
t('status → trialling', tr.d.trials.find((x) => x.id === card.id).status === 'trialling');
t('same status again → 409', (await call(mgr, '/api/trials/update', { id: card.id, status: 'trialling' })).s === 409);
t('cannot set back to recommended', (await call(mgr, '/api/trials/update', { id: card.id, status: 'recommended' })).s === 400);
t('session: rating out of range rejected', (await call(mgr, '/api/trials/update', { id: card.id, session: { date: '2026-09-27', rating: 11 } })).s === 400);
t('session: future date rejected', (await call(mgr, '/api/trials/update', { id: card.id, session: { date: '2099-01-01', result: 'W' } })).s === 400);
tr = await call(mgr, '/api/trials/update', { id: card.id, session: { date: '2026-09-27', result: 'W 3–1 vs Rivals', rating: 7.46, detail: 'Good <b>runs</b>' } });
const ses = tr.d.trials.find((x) => x.id === card.id).events.find((e) => e.kind === 'session');
t('session result stored (rating rounded, text cleaned)', ses?.rating === 7.5 && ses.result.includes('3–1') && !ses.detail.includes('<'));
t('link to unknown player rejected', (await call(mgr, '/api/trials/update', { id: card.id, player: 'nope' })).s === 400);
tr = await call(mgr, '/api/trials/update', { id: card.id, player: sq.k });
t('manager links a player page', tr.d.trials.find((x) => x.id === card.id).player === sq.k);
tr = await call(mgr2, '/api/trials/update', { id: card.id, status: 'signed', reason: 'Great trial' });
const hist = tr.d.trials.find((x) => x.id === card.id).events.filter((e) => e.kind === 'status');
t('decision history: applied → trialling → signed, with who', hist.map((e) => e.status).join('>') === 'applied>trialling>signed' && hist[2].by === 'Coach Two' && hist[2].detail === 'Great trial');

// ----- P5.5 scouting -----
t('scout: reason required', (await call(member, '/api/scout', { ea: 'Scouted_1', platform: 'PC', positions: ['GK'] })).s === 400);
let sc = await call(member, '/api/scout', { ea: 'Scouted_1', platform: 'PC', positions: ['GK'], note: 'Saves everything in Rush', clips: 'https://twitch.tv/x' });
t('scout: member recommends a player', sc.s === 200 && sc.d.recs[0].status === 'recommended');
t('scout: already on the list → 409', (await call(member, '/api/scout', { ea: 'scouted_1', platform: 'PC', positions: ['GK'], note: 'again please' })).s === 409);
tr = await call(mgr, '/api/trials');
const rec = tr.d.trials.find((x) => x.ea === 'Scouted_1');
t('recommendation routed to managers with the recommender', rec?.status === 'recommended' && rec.by?.id === '500');
tr = await call(mgr, '/api/trials/update', { id: rec.id, status: 'applied' });
t('one click turns it into a trial card', tr.d.trials.find((x) => x.id === rec.id).status === 'applied');
sc = await call(member, '/api/scout');
t('member sees the status of their recommendation', sc.d.recs[0].status === 'applied');
for (let i = 0; i < 4; i++) await call(member, '/api/scout', { ea: `Scout_x${i}`, platform: 'PC', positions: ['ST'], note: 'quick feet' });
t('scout: 6th in a day → 429', (await call(member, '/api/scout', { ea: 'Scout_x9', platform: 'PC', positions: ['ST'], note: 'quick feet' })).s === 429);

// ----- P5.7 notes -----
t('member cannot read notes (403/404)', [403, 404].includes((await call(member, '/api/notes')).s));
t('note about unknown member → 404', (await call(mgr, '/api/notes', { kind: 'member', subject: '999', text: 'hm' })).s === 404);
t('empty note rejected', (await call(mgr, '/api/notes', { kind: 'member', subject: '500', text: ' ' })).s === 400);
let n = await call(mgr, '/api/notes', { kind: 'member', subject: '500', tag: 'strength', text: 'Great <i>vision</i>\nKeeps the ball' });
t('note saved: newlines kept, tags stripped', n.s === 200 && n.d.notes[0].text === 'Great  i vision /i\nKeeps the ball' && n.d.notes[0].tag === 'strength');
await call(mgr, '/api/notes', { kind: 'player', subject: sq.k, tag: 'issue', text: 'Drifts wide' });
n = await call(mgr, '/api/notes', { kind: 'trial', subject: String(card.id), text: 'Needs a second session' });
t('trial note gets the trial tag', n.d.notes[0].tag === 'trial');
tr = await call(mgr, '/api/trials');
t('trial card shows its notes', tr.d.trials.find((x) => x.id === card.id).notes.length === 1);
const allNotes = (await call(mgr2, '/api/notes')).d.notes;
t('every manager sees all notes, newest first', allNotes.length === 3 && allNotes[0].kind === 'trial' && !allNotes[0].mine);
t('another manager cannot delete someone else’s note', (await call(mgr2, '/api/notes/delete', { id: allNotes[0].id })).s === 403);
n = await call(owner, '/api/notes/delete', { id: allNotes[0].id, all: true });
t('owner can delete any note', n.s === 200 && n.d.notes.length === 2);
const act = (await call(owner, '/api/admin/overview')).d.activity;
t('activity logs notes without their text', act.some((a) => a.type === 'note') && !act.some((a) => String(a.detail).includes('vision')));
t('activity logs the public application', act.some((a) => a.type === 'trial-apply' && a.n === 'Rising_Star9'));
setFlags({ managerNotes: 'owner' });
t('notes flag owner-only → manager 404', (await call(mgr, '/api/notes')).s === 404);
t('…and trial cards hide notes from managers', (await call(mgr, '/api/trials')).d.trials.every((x) => x.notes.length === 0));
// ----- Trials page markup -----
const page = fs.readFileSync(ROOT + 'site/apply.html', 'utf8');
t('Trials page has the flagged form + manager contacts slots', page.includes('data-trials-page') && page.includes('id="trial-contacts"') && /data-flag="trials" hidden/.test(page));
t('trials assets are shipped', fs.existsSync(ROOT + 'site/assets/trials.js') && fs.existsSync(ROOT + 'site/assets/trials.css'));
done();
