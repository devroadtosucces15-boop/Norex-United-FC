// P11.1 AI verification spike: permission + missing-binding guards (the real Workers AI calls can only be
// exercised by running /aispike against the deployed Worker – the mock server can't emulate that binding).
import { env } from './mock.mjs';
import { tt, done } from './lib.mjs';
import { runSpike } from '../bot/aispike.js';

await tt('non-owner is blocked', async () => {
  try { await runSpike(env, { role: 'member' }); return false; } catch (e) { return e.message === 'Owner only.'; }
});
await tt('manager is blocked (owner only)', async () => {
  try { await runSpike(env, { role: 'manager' }); return false; } catch (e) { return e.message === 'Owner only.'; }
});
await tt('missing AI binding gives a clear error, not a crash', async () => {
  try { await runSpike({ ...env, AI: undefined }, { role: 'owner' }); return false; } catch (e) { return /AI binding/.test(e.message); }
});
done();
