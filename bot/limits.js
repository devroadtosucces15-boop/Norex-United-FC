// Plan-bound limits in one place. Owner setting `plan` (bot settings): 'free' keeps the numbers the D1/subrequest squeeze set
// (PLANNING/D1-USAGE.md); 'paid' (Workers Paid: 1,000 subrequests per run, 25 billion D1 rows read a month) lifts them.
// Everything that used to hard-code a free-plan number reads it from here, so the switch is the only thing to flip.
import { getBotSettings } from './settings.js';

export const PLANS = ['free', 'paid'];
const TABLE = {
  free: { dmPerRun: 25, memberLivePerRun: 8, streamPerRun: 10, pushMax: 40, headerPollSec: 120 },
  paid: { dmPerRun: 100, memberLivePerRun: 30, streamPerRun: 30, pushMax: 150, headerPollSec: 60 },
};
export const limitsFor = (plan) => TABLE[plan] ?? TABLE.free;
let seen = null; // { at, env, plan } – a minute, so polling endpoints do not read D1 for it every time
export async function limits(env) {
  try {
    if (!seen || seen.env !== env || Date.now() - seen.at > 60e3) seen = { at: Date.now(), env, plan: (await getBotSettings(env)).plan };
    return { plan: seen.plan, ...limitsFor(seen.plan) };
  } catch { return { plan: 'free', ...TABLE.free }; }
}
export const forgetLimits = () => { seen = null; }; // after the owner changes the plan
