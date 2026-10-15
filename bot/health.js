// BE6 Boardroom health & usage dashboard (board 09): Cloudflare Worker analytics (last 24h) + GitHub
// Actions run status – owner-only, read-only, no writes.
//
// Env: CLOUDFLARE_ANALYTICS_TOKEN (secret, Account Analytics: Read scope), CLOUDFLARE_ACCOUNT_ID (secret),
//      GITHUB_REPO + GH_DISPATCH_TOKEN (already used by P7.1's site-update dispatch). Either piece degrades
//      to { ready: false, error } on its own if its token is missing – the dashboard just shows what it has.
import { can } from './roles.js';

const WORKER_SCRIPT = 'norex-bot';

async function workerAnalytics(env) {
  if (!env.CLOUDFLARE_ANALYTICS_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) return { ready: false, error: 'Cloudflare analytics token not set up yet.' };
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const until = new Date().toISOString();
  const query = `query ($accountTag: String!, $since: Time!, $until: Time!, $script: String!) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        workersInvocationsAdaptive(limit: 1, filter: { datetime_geq: $since, datetime_leq: $until, scriptName: $script }) {
          sum { requests errors subrequests }
          quantiles { cpuTimeP50 cpuTimeP99 }
        }
      }
    }
  }`;
  let r;
  try {
    r = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.CLOUDFLARE_ANALYTICS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { accountTag: env.CLOUDFLARE_ACCOUNT_ID, since, until, script: WORKER_SCRIPT } }),
    });
  } catch (e) { return { ready: false, error: e.message }; }
  const res = await r.json().catch(() => ({}));
  if (!r.ok || res.errors?.length) return { ready: false, error: res.errors?.[0]?.message || `Cloudflare said ${r.status}` };
  const row = res.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive?.[0];
  if (!row) return { ready: true, window: '24h', requests: 0, errors: 0, subrequests: 0, cpuP50: 0, cpuP99: 0 };
  return { ready: true, window: '24h', requests: row.sum.requests, errors: row.sum.errors, subrequests: row.sum.subrequests, cpuP50: Math.round(row.quantiles.cpuTimeP50 ?? 0), cpuP99: Math.round(row.quantiles.cpuTimeP99 ?? 0) };
}

async function actionRuns(env) {
  if (!env.GITHUB_REPO) return { ready: false, error: 'GITHUB_REPO is not set.' };
  const headers = { 'User-Agent': 'norex-bot', Accept: 'application/vnd.github+json', ...(env.GH_DISPATCH_TOKEN ? { Authorization: `Bearer ${env.GH_DISPATCH_TOKEN}` } : {}) };
  let r;
  try { r = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/actions/runs?per_page=10`, { headers }); } catch (e) { return { ready: false, error: e.message }; }
  if (!r.ok) return { ready: false, error: `GitHub said ${r.status}` };
  const j = await r.json().catch(() => ({}));
  return {
    ready: true,
    runs: (j.workflow_runs || []).map((x) => ({ id: x.id, name: x.name, branch: x.head_branch, status: x.status, conclusion: x.conclusion, at: x.run_started_at || x.created_at, url: x.html_url })),
  };
}

// P9.1 progress – read-only: crawl_cursor (meta) + club_index rows; clubs/day = rows checked in the last 24 h
async function crawlProgress(env) {
  try {
    const q = (sql, ...a) => env.DB.prepare(sql).bind(...a).first();
    const [cur, tot, day, last] = await Promise.all([
      q("SELECT value FROM meta WHERE key = 'crawl_cursor'"),
      q('SELECT COUNT(*) AS n FROM club_index'),
      q('SELECT COUNT(*) AS n FROM club_index WHERE checked_at > ?', Date.now() - 864e5),
      q('SELECT MAX(checked_at) AS at FROM club_index'),
    ]);
    return { ready: true, cursor: Number(cur?.value) || 1, indexed: tot?.n ?? 0, perDay: day?.n ?? 0, lastAt: last?.at ?? null };
  } catch (e) { return { ready: false, error: String(e.message || e).slice(0, 120) }; }
}

export async function healthRoute(me, env) {
  if (!can(me, 'health.view')) return { ok: false, error: 'Owner only.' };
  const [analytics, actions, crawl] = await Promise.all([workerAnalytics(env), actionRuns(env), crawlProgress(env)]);
  return { ok: true, analytics, actions, crawl };
}
