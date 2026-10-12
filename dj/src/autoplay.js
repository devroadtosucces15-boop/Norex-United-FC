// Suggestions based on what this session has played: YouTube's "mix" for a recent song, then more from the same artist.
const norm = (s = '') => s.toLowerCase().replace(/\(.*?\)|\[.*?\]|official|video|audio|lyrics|hd|ft\..*|feat\..*/g, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
export const titleKey = (info) => norm(info.title);

export async function suggest(room, count = 5) {
  const node = room.helper.shoukaku.getIdealNode();
  const pool = [...room.history.slice(-3), ...(room.current ? [room.current.info] : [])];
  const seed = pool[Math.floor(Math.random() * pool.length)];
  if (!seed || !node) return [];
  const seen = new Set([...room.history, ...(room.current ? [room.current.info] : []), ...room.queue.map((t) => t.info)].map(titleKey));
  const out = [];
  const take = (tracks) => {
    for (const t of tracks) {
      const k = titleKey(t.info);
      if (!k || seen.has(k) || t.info.isStream || t.info.length > 12 * 60_000 || t.info.length < 60_000) continue;
      seen.add(k); out.push(t); if (out.length >= count) return true;
    }
    return false;
  };
  try {
    let vid = seed.sourceName === 'youtube' ? seed.identifier : null;
    if (!vid) { const r = await node.rest.resolve(`ytsearch:${seed.author} ${seed.title}`); vid = r?.data?.[0]?.info?.identifier; }
    if (vid) {
      const r = await node.rest.resolve(`https://www.youtube.com/watch?v=${vid}&list=RD${vid}`);
      if (r?.loadType === 'playlist' && take(r.data.tracks)) return out;
    }
  } catch { /* fall through */ }
  for (const q of [`ytsearch:${seed.author} songs`, `scsearch:${seed.author}`]) {
    try { const r = await node.rest.resolve(q); if (r?.loadType === 'search' && take(r.data)) return out; } catch { /* next */ }
  }
  return out;
}
