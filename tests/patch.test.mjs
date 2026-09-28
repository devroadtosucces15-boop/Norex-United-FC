// PB.6 patch changes & build migration: what changed between rule versions, the public diff route, patch notices on publish.
import { call, env, login, siteJson, sqlite, W } from './mock.mjs';
import { gameDiff } from '../bot/game.js';
import { t, done } from './lib.mjs';

const setFlags = (o) => { env.FEATURES = JSON.stringify({ ...JSON.parse(env.FEATURES), ...o }); };
const seed = siteJson('game');

// ----- diff (pure) -----
const next = structuredClone(seed);
next.levelCap = { value: seed.levelCap.value + 10 };
next.archetypes = [...seed.archetypes.slice(1), { id: 'new-one', name: 'Brand New', group: 'FWD' }];
next.archetypes[0] = { ...next.archetypes[0], signature: ['Finishing'] };
next.apPerLevel = [...(seed.apPerLevel ?? []), 99];
const d = gameDiff(seed, next);
const has = (re) => d.some((c) => re.test(c.text));
t('diff: level cap with the extra levels', has(new RegExp(`Max level ${seed.levelCap.value} → ${seed.levelCap.value + 10} – 10 more levels`)));
t('diff: archetypes added / removed / changed by name', has(/New archetypes: Brand New/) && has(new RegExp(`Archetypes removed: ${seed.archetypes[0].name}`)) && has(new RegExp(`Archetypes changed: ${seed.archetypes[1].name}`)));
t('diff: tables that changed', has(/AP per level updated/) && !has(/Masteries updated/));
t('diff: same data → nothing', gameDiff(seed, structuredClone(seed)).length === 0);

// ----- publish → notices, diff route -----
const owner = await login('111', [], 'Founder');
const mgr = await login('600', ['mgr'], 'Coach');
const member = await login('500', [], 'Player One');
setFlags({ gameRules: 'managers', builder: 'members', notifications: 'members' });
const add = (uid, version) => sqlite.prepare("INSERT INTO builds (user_id, name, title, code, arch, level, version, at, updated_at) VALUES (?, 'x', 'My build', 'a=x', 'x', 30, ?, 1, 1)").run(uid, version);
add('500', seed.version); add('500', seed.version); add('111', 'fc27-tu9');
const pub = await call(mgr, '/api/game/publish', { version: 'fc27-tu2', levelCap: seed.levelCap.value + 5, verified: false, changes: {} });
t('publish works', pub.s === 200 && pub.d.current.version === 'fc27-tu2');
const note = (await call(member, '/api/notify')).d.items.find((n) => n.type === 'patch');
t('builders are told: new cap + how many of their builds are on older rules', note && note.title.includes(`max level ${seed.levelCap.value} → ${seed.levelCap.value + 5}`) && /2 of your builds were made on older rules/.test(note.body));
t('…with a link to the builder', note.link === 'builder.html');
const diff = await (await W(`/api/game/diff?from=${seed.version}`)).json();
t('diff route (public): old → new with the cap', diff.known && diff.to === 'fc27-tu2' && diff.cap.from === seed.levelCap.value && diff.cap.to === seed.levelCap.value + 5 && diff.changes.some((c) => /Max level/.test(c.text)));
t('diff route: unknown version → known: false', (await (await W('/api/game/diff?from=fc19-lol')).json()).known === false);
setFlags({ builder: 'owner' });
await call(mgr, '/api/game/publish', { version: 'fc27-tu3', levelCap: seed.levelCap.value + 5, verified: false, changes: {} });
t('no notice for members while the builder is owner-only; the owner still hears', (await call(member, '/api/notify')).d.items.filter((n) => n.type === 'patch').length === 1 && (await call(owner, '/api/notify')).d.items.some((n) => n.type === 'patch' && /fc27-tu3/.test(n.title)));
done();
