import { can } from './roles.js';
const API = 'https://discord.com/api/v10';
const KINDS = ['all','text','images','videos','audio','documents','attachments'];
const FILE_TYPES = { images: /\.(png|jpe?g|gif|webp|avif)$/i, videos: /\.(mp4|mov|webm|mkv)$/i, audio: /\.(mp3|wav|ogg|m4a|flac)$/i, documents: /\.(pdf|docx?|xlsx?|pptx?|txt|csv|md)$/i };
async function api(env, path, method = 'GET', payload) {
  for (let n = 0; n < 4; n++) {
    const r = await fetch(API + path, { method, headers: { Authorization: 'Bot ' + env.DISCORD_BOT_TOKEN, ...(payload ? {'Content-Type':'application/json'} : {}) }, ...(payload ? {body:JSON.stringify(payload)} : {}) });
    if (r.ok) return r.json();
    if (r.status === 429 && n < 3) {
      const data = await r.json().catch(() => ({}));
      await new Promise(resolve => setTimeout(resolve, Math.min(10000, Math.max(1000, (data.retry_after || 1)*1000))));
      continue;
    }
    throw new Error('Discord API ' + r.status);
  }
}
function classify(a) {
  const mime = a.content_type || '';
  if (mime.startsWith('image/')) return 'images';
  if (mime.startsWith('video/')) return 'videos';
  if (mime.startsWith('audio/')) return 'audio';
  return Object.entries(FILE_TYPES).find(([,rx]) => rx.test(a.filename || ''))?.[0] || 'attachments';
}
function render(m, type, ext, keyword) {
  const attachments = (m.attachments || []).filter(a =>
    (!ext || (a.filename || '').toLowerCase().endsWith('.' + ext)) &&
    (!keyword || (a.filename || '').toLowerCase().includes(keyword)) &&
    (type === 'all' || type === 'attachments' || classify(a) === type));
  const showText = !ext && !keyword && (type === 'all' || type === 'text') && !!m.content?.trim();
  if (!showText && !attachments.length) return null;
  return '[' + m.timestamp + '] ' + (m.author?.username || 'unknown') + ' id:' + m.id +
    (showText ? '\n' + m.content : '') + attachments.map(a => '\n📎 ' + a.filename + ' — ' + a.url).join('');
}
function pieces(text) {
  const result = [];
  while (text.length) {
    let cut = Math.min(1900, text.length);
    if (cut < text.length) { const nl = text.lastIndexOf('\n', cut); if (nl > 900) cut = nl; }
    result.push(text.slice(0, cut)); text = text.slice(cut).replace(/^\n/, '');
  }
  return result;
}
export async function exportContent(env, who, opts = {}) {
  if (!can(who, 'settings.bot')) throw new Error('Owner only.');
  if (!env.DB || !env.DISCORD_BOT_TOKEN) throw new Error('Bot database or token missing.');
  const { channelId, count = 100, mode = 'next', type = 'all', extension = '', keyword = '' } = opts;
  if (!/^\d+$/.test(String(channelId))) throw new Error('Invalid channel.');
  if (!Number.isInteger(count) || count < 1 || count > 250) throw new Error('Count must be 1–250.');
  if (!KINDS.includes(type) || !['next','reset'].includes(mode)) throw new Error('Invalid mode/type.');
  const ext = extension.toLowerCase().replace(/^\./,'').trim();
  const word = keyword.toLowerCase().trim();
  if (ext && !/^[a-z0-9]{1,12}$/.test(ext)) throw new Error('Invalid extension.');
  const channel = await api(env, '/channels/' + channelId);
  if (![0,5].includes(channel.type) || channel.guild_id !== env.DISCORD_GUILD_ID) throw new Error('Channel must be in this server.');
  const key = JSON.stringify([who.u, channelId, type, ext, word]);
  const saved = mode === 'next' ? await env.DB.prepare('SELECT before_id FROM export_content_cursors WHERE cursor_key = ?').bind(key).first() : null;
  let before = saved?.before_id || null;
  const matches = [];
  let scanned = 0, exhausted = false;
  while (scanned < count) {
    const limit = Math.min(100, count - scanned);
    const batch = await api(env, '/channels/' + channelId + '/messages?limit=' + limit + (before ? '&before=' + before : ''));
    if (!batch.length) { exhausted = true; break; }
    for (const msg of batch) { const result = render(msg,type,ext,word); if (result) matches.push(result); }
    scanned += batch.length;
    before = batch[batch.length-1].id;
    if (batch.length < limit) { exhausted = true; break; }
  }
  const dm = await api(env, '/users/@me/channels', 'POST', {recipient_id:who.u});
  const heading = '📚 #' + channel.name + ' | scanned ' + scanned + ' | matched ' + matches.length + ' | ' + type + (ext ? ' .' + ext : '') + (word ? ' filename:' + word : '') + (exhausted ? '\nBeginning of history reached.' : '');
  const output = pieces([heading,...matches.reverse()].join('\n\n'));
  for (const content of output) await api(env, '/channels/' + dm.id + '/messages', 'POST', {content,allowed_mentions:{parse:[]}});
  if (before) await env.DB.prepare('INSERT INTO export_content_cursors (cursor_key,before_id,updated_at) VALUES (?,?,?) ON CONFLICT(cursor_key) DO UPDATE SET before_id=excluded.before_id,updated_at=excluded.updated_at').bind(key,before,Date.now()).run();
  return {channels:[channel.name],messages:output.length,scanned,matched:matches.length,exhausted};
}
