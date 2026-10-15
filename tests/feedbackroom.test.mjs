// Redesign: Hub › Clubhouse › Praise & feedback (next/static/feedbackroom.js, flag feedbackRoom). Static wiring plus a run in a stub DOM.
import fs from 'node:fs';
import vm from 'node:vm';
import { ROOT } from './mock.mjs';
import { t, done } from './lib.mjs';

const rd = (f) => fs.readFileSync(ROOT + f, 'utf8');
const js = rd('next/static/feedbackroom.js'), hub = rd('next/pages/hub.mjs'), css = rd('next/static/style.css');
const cfg = JSON.parse(rd('config.json'));

t('flag feedbackRoom ships at owner (the live feedback flag is separate)', cfg.features.feedbackRoom === 'owner' && cfg.features.feedback === 'members');
t('Boardroom lists the flag with a page link', /'suggestions', 'feedbackRoom'/.test(rd('next/static/boardroom.js')) && /feedbackRoom: \['hub-clubhouse\.html'/.test(rd('next/static/boardroom.js')));
t('Clubhouse page: section starts hidden, chip too, script loaded', hub.includes('id="ch-feedback" hidden') && hub.includes('data-fb-chip hidden') && hub.includes('id="chfeedback"') && hub.includes('src="feedbackroom.js"'));
t('the only API writes are send, react, why, report, read and hide', [...js.matchAll(/post\('(\/api\/[a-z/]+)'/g)].map((m) => m[1]).sort().join() === ['/api/feedback/hide', '/api/feedback/react', '/api/feedback/read', '/api/feedback/report', '/api/feedback/send', '/api/feedback/why'].join());
t('five reactions, same emoji as web/feedback.js', ['👍', '✅', '❤️', '❌', '😕'].every((e) => js.includes(e)) && /Object\.entries\(REACT\)/.test(js));
t('"tell the managers why" appears only after ❌ / 😕', /const whyBlock[\s\S]{0,80}BAD\.includes\(f\.reaction\)/.test(js));
t('sent list shows the reaction the server returned (the server drops ❌ / 😕)', js.includes('f.reaction ?') && !/disagree[\s\S]{0,40}sent/.test(js));
t('moderation tab only for canModerate, caution items first', js.includes('S.canModerate ? [[\'mod\'') && /needsLook\(b\) - needsLook\(a\)/.test(js));
t('match picker reads api/club.json and sends the match id', js.includes("'api/club.json'") && /match: f\.match\.value \|\| undefined/.test(js));
t('notification links reach the room', /members\\\.html#feedback\$\/, \(\) => 'hub-clubhouse\.html#ch-feedback'/.test(rd('next/static/alerts.js')) && rd('next/static/header.js').includes("hub-clubhouse.html#ch-feedback"));
t('styles exist, 22px rhythm and a 430px rule', css.includes('.fb-list{display:grid;gap:22px') && /@media \(max-width:480px\)\{\.fb-r/.test(css));

// ---------- run it against a fake DOM ----------
const mk = () => {
  const el = { _h: '', hidden: true, dataset: {}, listeners: {}, set innerHTML(v) { this._h = v; }, get innerHTML() { return this._h; }, addEventListener(k, f) { this.listeners[k] = f; }, querySelector: () => null, closest: () => null };
  return el;
};
const run = async (features, S, canModerate = false) => {
  const mount = mk(), sec = mk(), chip = mk(), calls = [];
  const ids = { '#chfeedback': mount, '#ch-feedback': sec, '[data-fb-chip]': chip };
  const A = { token: 't', features, ready: Promise.resolve(), call: async (p, o) => { calls.push([p, o?.body && JSON.parse(o.body)]); if (p === '/api/feedback') return S; if (p === '/api/feedback/all') return { items: [{ id: 9, kind: 'concern', text: 'x', at: Date.now(), fromName: 'Ann', toName: 'Bo', anon: true, caution: true, reaction: 'confused', reply: 'not clear', hidden: false }] }; return S; } };
  const ctx = { window: null, document: { querySelector: (s) => ids[s] ?? null }, fetch: async () => ({ ok: true, json: async () => ({ matches: [{ id: '1', ts: 1791869467, opp: 'Soccer', gf: 3, ga: 0, res: 'W' }] }) }), setTimeout: () => 0, Promise, Date, Object, String, Number, Set, Map, JSON, Array, Error };
  ctx.window = Object.assign(ctx, { NorexAuth: A, NOREX_API: 'https://api.example', NOREX_ROOT: '../' });
  vm.runInNewContext(js, ctx);
  await new Promise((r) => setImmediate(r)); await new Promise((r) => setImmediate(r));
  return { mount, sec, chip, calls };
};
const S = { inbox: [{ id: 1, kind: 'praise', text: 'Great <b>runs</b>', at: Date.now(), read: false, anon: true, reaction: 'disagree', match: '1' }], unread: 1, sent: [{ id: 2, to: 'x', toName: 'Bo', kind: 'tip', text: 'hello there', at: Date.now(), anon: true, reaction: 'like' }], canSend: true, left: 2, perDay: 3, recipients: [{ id: 'x', n: 'Bo', playerName: 'Bo_FC' }], canModerate: false };

let r = await run([], S);
t('flag off: the room stays hidden and the API is never called', r.sec.hidden && r.chip.hidden && r.calls.length === 0);
r = await run(['feedbackRoom'], S);
t('flag on: section and chip appear, inbox loads', !r.sec.hidden && !r.chip.hidden && r.calls[0][0] === '/api/feedback' && r.mount.innerHTML.includes('Great &lt;b&gt;runs&lt;/b&gt;'));
t('inbox: five reaction buttons, the chosen one pressed, match shown, why button for ❌', (r.mount.innerHTML.match(/data-fbr="1"/g) || []).length === 5 && /aria-pressed="true"[^>]*title="Disagree"|title="Disagree"[^>]*/.test(r.mount.innerHTML) && r.mount.innerHTML.includes('W 3–0 vs Soccer') && r.mount.innerHTML.includes('data-fbwhy-open="1"'));
t('anonymous author is never named in the inbox', r.mount.innerHTML.includes('a teammate') && !r.mount.innerHTML.includes('Ann'));
t('no moderation tab for members', !r.mount.innerHTML.includes('Moderation'));
r = await run(['feedbackRoom'], { ...S, canModerate: true }, true);
t('managers: moderation tab, loaded from /api/feedback/all', r.mount.innerHTML.includes('Moderation') && r.calls.some((c) => c[0] === '/api/feedback/all'));
done();
