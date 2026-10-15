// Posts the results fetch.mjs queued in .outbox/results.json. Runs in update.yml after the site build and the Discord cards, so every
// result carries its score card and field view (attached straight from site/cards). Missing cards just mean a post without the pictures.
import fs from 'node:fs';
import { loadConfig, readJson } from './lib.mjs';
import { postResults } from './lib/resultpost.mjs';

const FILE = '.outbox/results.json';
if (!fs.existsSync(FILE)) { console.log('No results waiting to be posted'); process.exit(0); }
const { matches = [], hidden = [] } = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const config = loadConfig();
const manifest = readJson('site/api/cards.json', null);
await postResults(matches, { config, homeId: String(config.homeClubId), hidden, drawn: manifest ? { dir: 'site/cards', manifest } : null });
fs.rmSync(FILE, { force: true });
console.log(`Posted ${matches.length} result${matches.length === 1 ? '' : 's'}${manifest ? ' with cards' : ' without cards'}`);
