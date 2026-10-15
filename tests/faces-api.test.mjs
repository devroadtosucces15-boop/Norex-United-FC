// GET /api/faces?ids= – the site's version of the bot's "faces everywhere" rule (Card Studio card → Discord picture → default).
import { call, login, sqlite } from './mock.mjs';
import { t, done } from './lib.mjs';

const a = await login('500');
sqlite.prepare("INSERT OR REPLACE INTO users (id, name, avatar, role, first_at, last_at) VALUES ('777', 'Pic', 'https://cdn.example/pic.png', 'member', ?, ?)").run(Date.now(), Date.now());
const r = await call(a, '/api/faces?ids=777,888,not-an-id');
t('answers 200 with an id → picture map', r.s === 200);
const faces = r.d ?? {};
t('a member with a Discord picture gets it', faces['777'] === 'https://cdn.example/pic.png');
t('someone unknown gets Discord’s default picture', /embed\/avatars\/\d\.png$/.test(faces['888'] ?? ''));
t('junk ids are ignored', !('not-an-id' in faces));
done();
