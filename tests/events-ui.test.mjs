// The Schedule tab lives inside app.js's #panel, whose delegated onclick also serves the Availability tab.
// A shared data-* name makes one click fire both handlers (bulk-answer repainted the panel and lost the selection).
import fs from 'node:fs';
import { ROOT } from './mock.mjs';
import { t, done } from './lib.mjs';

const ev = fs.readFileSync(ROOT + 'web/events.js', 'utf8');
const app = fs.readFileSync(ROOT + 'web/app.js', 'utf8');
const panel = app.slice(app.indexOf('function bind()'), app.indexOf('function bind()') + 12000);
const used = new Set([...ev.matchAll(/\bdata-([a-z][a-z-]*)/g)].map((m) => m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase())));
const handled = new Set([...panel.matchAll(/\bd\.([a-zA-Z]+)/g)].map((m) => m[1]));
// id, p, u: only read together with a claim/rush/vote attribute, or from modals outside #panel
const clash = [...used].filter((k) => handled.has(k) && !['id', 'p', 'tip', 'u'].includes(k));
t('events.js data-* names do not collide with the panel onclick handlers' + (clash.length ? ` (${clash.join(', ')})` : ''), clash.length === 0);
done();
