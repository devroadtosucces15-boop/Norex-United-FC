// /panel – the manager panel in Discord: everything waiting for a decision, with Approve / Reject right in the message.
// Private to the manager who opened it; every button updates the same message in place. Decisions go through the
// Squad Hub's own API routes (members.js apiAs), so checks, logs and the member's notification are identical to the Hub.
//   custom ids: norex:mp:home · norex:mp:q:<queue> · norex:mp:a:<queue>:<id>:<action> · norex:mp:r:<queue>:<id> (reason modal)
import { can, flagOn } from './roles.js';
import { apiAs } from './members.js';
import { facesOf } from './faces.js';
import { message, header, text, sep, side, thumb, footer, button, buttons, notice, IS_V2 } from './ui.js';

const SHOW = 4; // items per queue page – each is a row + its buttons, which keeps the message under Discord's 40 components
const all = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).all().then((r) => r.results ?? []).catch(() => []);
const ago = (ms) => `<t:${Math.floor(ms / 1000)}:R>`;
const clip = (s, n) => (String(s ?? '').length > n ? `${String(s).slice(0, n - 1)}…` : String(s ?? ''));

// What each queue lists, how a row reads, and what its buttons do (path + body for apiAs). `reason`: reject opens a form.
export const QUEUES = {
  claims: {
    icon: '🪪', name: 'Player claims', perm: 'claims.decide',
    list: (env) => all(env, "SELECT user_id AS id, name, player_name, at FROM claims WHERE status = 'pending' ORDER BY at"),
    who: (r) => r.id, line: (r) => `**${r.name}** says they play as **${r.player_name}**\n-# asked ${ago(r.at)}`,
    actions: [['approve', 'Approve', 'ok', (r) => ['/api/admin/claims', { user: r, action: 'approve' }]], ['reject', 'Reject', 'no', (r) => ['/api/admin/claims', { user: r, action: 'reject' }]]],
    done: { approve: '✅ Claim approved – they get the Verified role and a notification', reject: '❌ Claim rejected – they’ve been told' },
  },
  cards: {
    icon: '🎨', name: 'Card Studio', perm: 'cards.templates', flag: 'cardStudio',
    list: (env) => all(env, "SELECT r.id, r.user_id, r.photo_key, r.created_at AS at, COALESCE(u.name, 'Member') AS name FROM card_requests r LEFT JOIN users u ON u.id = r.user_id WHERE r.status = 'pending' ORDER BY r.created_at"),
    who: (r) => r.user_id, photo: (r) => r.photo_key, line: (r) => `**${r.name}** wants a card made from this photo\n-# sent ${ago(r.at)}`,
    actions: [['approve', 'Approve', 'ok', (id) => ['/api/cards/requests/decide', { id: Number(id), decision: 'approve' }]], ['reject', 'Reject…', 'no', (id, why) => ['/api/cards/requests/decide', { id: Number(id), decision: 'reject', note: why }]]],
    reason: { reject: ['What should they fix?', true] },
    done: { approve: '✅ Approved – the card is being made', reject: '❌ Rejected – they’ve been told what to fix' },
  },
  rush: {
    icon: '⚡', name: 'Rush results', perm: 'rush.confirm', flag: 'rushLog',
    list: (env) => all(env, "SELECT id, date, opponent, gf, ga, by_id, by_name, at FROM rush_matches WHERE status = 'pending' ORDER BY at"),
    who: (r) => r.by_id, line: (r) => `**${r.gf}–${r.ga} vs ${r.opponent}** · ${r.date}\n-# logged by ${r.by_name ?? 'a member'} ${ago(r.at)}`,
    actions: [['confirm', 'Confirm', 'ok', (id) => ['/api/rush/decide', { id: Number(id), action: 'confirm' }]], ['reject', 'Reject', 'no', (id) => ['/api/rush/decide', { id: Number(id), action: 'reject' }]]],
    done: { confirm: '✅ Confirmed – it counts on the Rush leaderboard now', reject: '❌ Rejected – they’ve been told' },
  },
  requests: {
    icon: '📨', name: 'Requests', perm: 'requests.decide', flag: 'requests',
    list: (env) => all(env, "SELECT id, kind, subject, note, by_id, by_name, at FROM requests WHERE status = 'pending' ORDER BY at"),
    who: (r) => r.by_id, line: (r) => `${r.kind === 'club' ? '🏟️ Track club' : '🙈 Hide from the site'}: **${r.subject}**${r.note ? `\n> ${clip(r.note, 160)}` : ''}\n-# from ${r.by_name ?? 'a visitor'} ${ago(r.at)}`,
    actions: [['approve', 'Approve', 'ok', (id) => ['/api/admin/requests/decide', { id: Number(id), action: 'approve' }]], ['reject', 'Reject…', 'no', (id, why) => ['/api/admin/requests/decide', { id: Number(id), action: 'reject', reason: why }]]],
    reason: { reject: ['Reason (optional – they’ll see it)', false] },
    done: { approve: '✅ Approved', reject: '❌ Rejected' },
  },
  ideas: {
    icon: '💡', name: 'New ideas', perm: 'suggest.decide', flag: 'suggestions',
    list: (env) => all(env, "SELECT id, title, body, up, anon, by_id, by_name, at FROM suggestions WHERE status = 'open' AND removed_at IS NULL AND reply IS NULL ORDER BY up DESC, at"),
    who: (r) => r.by_id, line: (r) => `**${clip(r.title, 90)}** · 👍 ${r.up}${r.body ? `\n> ${clip(r.body, 160)}` : ''}\n-# ${r.anon ? 'anonymous to members · ' : ''}from ${r.by_name ?? 'a member'} ${ago(r.at)}`,
    actions: [['planned', 'Planned', 'ok', (id) => ['/api/suggestions/decide', { id: Number(id), status: 'planned' }]], ['done', 'Done', 'grey', (id) => ['/api/suggestions/decide', { id: Number(id), status: 'done' }]],
      ['declined', 'Not for now…', 'no', (id, why) => ['/api/suggestions/decide', { id: Number(id), status: 'declined', reply: why }]]],
    reason: { declined: ['A short reply (optional – they’ll see it)', false] },
    done: { planned: '🗓️ Marked planned – they’ve been told', done: '✅ Marked done', declined: '🚫 Marked not for now' },
  },
};
const visible = (env, me) => Object.entries(QUEUES).filter(([, q]) => can(me, q.perm) && (!q.flag || flagOn(env, me, q.flag)));

// ---------- views ----------
async function home(env, me, site, note) {
  const qs = visible(env, me);
  const counts = await Promise.all(qs.map(([, q]) => q.list(env).then((r) => r.length)));
  const reports = can(me, 'reports.view') ? await apiAs('/api/admin/reports', 'GET', null, me, env).then((r) => r.json()).then((d) => d.items?.length ?? 0).catch(() => null) : null;
  const total = counts.reduce((t, n) => t + n, 0) + (reports ?? 0);
  return message({ accent: total ? 'gold' : 'steel', ephemeral: true, blocks: [
    header({ eyebrow: 'Staff · Manager panel', title: '🗂️ Manager panel', sub: total ? `${total} waiting for a decision` : 'All clear – nothing waiting' }),
    note ? text(note) : null,
    sep(),
    ...qs.map(([key, q], k) => side(`${q.icon} **${q.name}**\n-# ${counts[k] ? `${counts[k]} waiting` : 'All clear'}`, button({ label: counts[k] ? `Open · ${counts[k]}` : 'Open', id: `norex:mp:q:${key}` }))),
    reports != null ? side(`🚩 **Reported content**\n-# ${reports ? `${reports} to look at` : 'Nothing reported'}`, button({ label: 'Review in the portal', url: `${site}members.html#portal-reports` })) : null,
    footer(`Updated <t:${Math.floor(Date.now() / 1000)}:R> · only you can see this`),
    buttons([{ label: 'Refresh', id: 'norex:mp:home', emoji: '🔄' }, { label: 'Manager portal', url: `${site}members.html#portal` }]),
  ] });
}

async function queue(env, me, site, key, note) {
  const q = QUEUES[key];
  const rows = await q.list(env);
  const shown = rows.slice(0, SHOW);
  const faces = await facesOf(env, shown.map(q.who));
  const media = String(env.PUBLIC_URL || '').replace(/\/?$/, '');
  const pic = (r) => (q.photo && media ? `${media}/media/${q.photo(r)}` : faces.get(String(q.who(r))));
  return message({ accent: rows.length ? 'gold' : 'steel', ephemeral: true, blocks: [
    header({ eyebrow: 'Staff · Manager panel', title: `${q.icon} ${q.name}`, sub: rows.length ? `${rows.length} waiting${rows.length > SHOW ? ` · showing the oldest ${SHOW}` : ''}` : 'All clear' }),
    note ? text(note) : null,
    ...shown.flatMap((r) => [sep(), side(q.line(r), thumb(pic(r))),
      buttons(q.actions.map(([act, label, style]) => ({ label, style, id: `norex:mp:${q.reason?.[act] ? 'r' : 'a'}:${key}:${r.id}:${act}` })))]),
    rows.length ? null : text('Nothing waiting here. 🎉'),
    sep(),
    buttons([{ label: 'Back', id: 'norex:mp:home', emoji: '⬅️' }, { label: 'Refresh', id: `norex:mp:q:${key}`, emoji: '🔄' }, { label: 'Open in the Squad Hub', url: `${site}members.html#portal` }]),
  ] });
}

async function decide(env, me, loadSite, key, id, act, why) {
  const q = QUEUES[key], a = q?.actions.find(([x]) => x === act);
  if (!a || !can(me, q.perm)) return '⚠️ You can’t do that.';
  const [path, body] = a[3](id, why);
  const res = await apiAs(path, 'POST', body, me, env, loadSite);
  if (res.ok) return q.done[act] ?? '✅ Done';
  const d = await res.json().catch(() => ({}));
  return `⚠️ ${d.error ?? 'That didn’t work – try again or use the Squad Hub.'}`;
}

// ---------- entry point (worker.js) ----------
// /panel (type 2), its buttons (type 3) and the reason form (type 5). `me` = the member behind the interaction.
export async function panelInteraction(i, env, me, site, loadSite) {
  if (!can(me, 'portal.view')) return { type: 4, data: notice('Managers only', 'The manager panel is for managers and the owner.') };
  const update = (data) => ({ type: i.type === 2 ? 4 : 7, data: i.type === 2 ? data : { ...data, flags: IS_V2 } });
  if (i.type === 2) return update(await home(env, me, site));
  const id = i.data.custom_id;
  if (id === 'norex:mp:home') return update(await home(env, me, site));
  let m = id.match(/^norex:mp:q:(\w+)$/);
  if (m && QUEUES[m[1]]) return update(await queue(env, me, site, m[1]));
  m = id.match(/^norex:mp:r:(\w+):([\w-]+):(\w+)$/);
  if (m && QUEUES[m[1]]) {
    const [, key, rid, act] = m;
    if (i.type === 5) { // the reason form was sent
      const why = i.data.components?.flatMap((row) => row.components ?? [row.component]).find((c) => c?.custom_id === 'why')?.value ?? '';
      return update(await queue(env, me, site, key, await decide(env, me, loadSite, key, rid, act, why.trim())));
    }
    const [label, required] = QUEUES[key].reason?.[act] ?? ['Reason', false];
    return { type: 9, data: { custom_id: id, title: `${QUEUES[key].name}: ${act === 'declined' ? 'not for now' : act}`.slice(0, 45), components: [{ type: 1, components: [
      { type: 4, custom_id: 'why', style: 2, label: label.slice(0, 45), required, min_length: required ? 3 : 0, max_length: 200 },
    ] }] } };
  }
  m = id.match(/^norex:mp:a:(\w+):([\w-]+):(\w+)$/);
  if (m && QUEUES[m[1]]) return update(await queue(env, me, site, m[1], await decide(env, me, loadSite, m[1], m[2], m[3])));
  return update(await home(env, me, site, '⚠️ That button is out of date – here’s the panel again.'));
}
export const PANEL_ID = /^norex:mp:/;
export const panelCounts = async (env, me) => Object.fromEntries(await Promise.all(visible(env, me).map(async ([k, q]) => [k, (await q.list(env)).length])));
