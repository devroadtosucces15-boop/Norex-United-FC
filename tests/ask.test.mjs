// P11.11 `/ask` club chatbot: the context brief built from site JSON is grounded and compact, and the model
// call degrades to null (never throws) so the Discord command can show a friendly fallback.
import { tt, done } from './lib.mjs';
import { askAnswer, buildAskContext } from '../bot/ask.js';

const club = { name: 'NOREX UNITED', division: 3, skill: 1200, w: 10, d: 2, l: 3, gp: 15, gf: 30, ga: 12, matches: [{ res: 'W', gf: 3, ga: 1, opp: 'Rivals FC', scorers: [{ n: 'Alice' }], motm: 'Alice' }] };
const players = [
  { n: 'Alice', home: true, src: 'club', s: { gp: 15, g: 12, a: 3, r: 8.1, m: 4, gp3: true } },
  { n: 'Bob', home: true, src: 'club', s: { gp: 15, g: 2, a: 9, r: 7.4, m: 1 } },
  { n: 'Away Player', home: false, src: 'club', s: { gp: 5, g: 10, a: 0, r: 9, m: 3 } }, // not our squad – must be excluded
];

await tt('context names our top scorer/assister, excludes players from other clubs', async () => {
  const ctx = buildAskContext(club, players);
  return ctx.includes('Alice (12)') && ctx.includes('Bob (9)') && !ctx.includes('Away Player');
});
await tt('context includes the record and the latest result', async () => {
  const ctx = buildAskContext(club, players);
  return ctx.includes('10W 2D 3L') && ctx.includes('Win 3-1 vs Rivals FC');
});
await tt('handles no players/matches without throwing', async () => {
  const ctx = buildAskContext({ name: 'X', w: 0, d: 0, l: 0, gp: 0, gf: 0, ga: 0 }, []);
  return typeof ctx === 'string';
});

await tt('askAnswer sends the question + context to the text model and trims the reply', async () => {
  let seen;
  const fakeEnv = { AI: { run: async (model, input) => { seen = { model, input }; return { response: '  Alice leads with 12 goals.  ' }; } } };
  const out = await askAnswer(fakeEnv, 'who is top scorer?', 'Top scorers: Alice (12).');
  return out === 'Alice leads with 12 goals.' && seen.model.includes('llama') && seen.input.messages[1].content === 'who is top scorer?' && seen.input.messages[0].content.includes('Top scorers: Alice (12).');
});
await tt('askAnswer returns null on an empty model reply, not an empty string', async () => {
  const fakeEnv = { AI: { run: async () => ({ response: '   ' }) } };
  return (await askAnswer(fakeEnv, 'anything', 'ctx')) === null;
});
await tt('askAnswer returns null on a malformed model reply instead of throwing', async () => {
  const fakeEnv = { AI: { run: async () => ({}) } };
  return (await askAnswer(fakeEnv, 'anything', 'ctx')) === null;
});
await tt('a long question is capped before being sent to the model', async () => {
  let seen;
  const fakeEnv = { AI: { run: async (model, input) => { seen = input; return { response: 'ok' }; } } };
  await askAnswer(fakeEnv, 'x'.repeat(1000), 'ctx');
  return seen.messages[1].content.length === 300;
});

done();
