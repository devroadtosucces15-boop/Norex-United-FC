// Exact-match finder: given a song's metadata (e.g. from a Spotify link), find the same recording on YouTube or SoundCloud.
// A candidate is accepted only if the title, an artist and the length all agree; otherwise nothing is played.
const NOISE = /\b(official|video|audio|lyrics?|lyric video|visuali[sz]er|hd|hq|4k|remaster(?:ed)?|music video|m\/v|topic|explicit)\b/g;
const BAD = /\b(live|cover|remix|karaoke|instrumental|sped up|slowed|nightcore|reverb|8d|bass boosted|tribute|acoustic|mashup)\b/;

export const clean = (s = '') => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\(.*?\)|\[.*?\]/g, ' ').replace(NOISE, ' ').replace(/\b(?:feat|ft|featuring)\b.*$/, ' ')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => clean(s).split(' ').filter((w) => w.length > 1 || /\d/.test(w));

export function isMatch(want, cand) {
  const wTitle = words(want.title);
  if (!wTitle.length) return false;
  const hay = ` ${clean(`${cand.title} ${cand.author}`)} `;
  const hayWords = new Set(hay.trim().split(' '));
  if (wTitle.filter((w) => hayWords.has(w)).length / wTitle.length < 0.85) return false;
  // Artist: the main (first) artist must appear in the candidate's title or channel name.
  const artist = words(String(want.author || '').split(/,|&| x | feat\.?/i)[0]);
  if (artist.length && artist.filter((w) => hayWords.has(w)).length / artist.length < 0.6) return false;
  // Versions the wanted song is not.
  const wantRaw = `${want.title}`.toLowerCase();
  const m = `${cand.title}`.toLowerCase().match(BAD);
  if (m && !wantRaw.includes(m[1])) return false;
  // Length: within 4% or 5 s, whichever is bigger (skipped if either length is unknown).
  if (want.length > 0 && cand.length > 0 && Math.abs(want.length - cand.length) > Math.max(5000, want.length * 0.04)) return false;
  return true;
}

export async function findEquivalent(node, want, sources = ['ytmsearch', 'ytsearch', 'scsearch'], skip = new Set()) {
  const q = `${String(want.author || '').split(/,|&/)[0].trim()} ${want.title}`.trim();
  for (const src of sources) {
    try {
      const r = await node.rest.resolve(`${src}:${q}`);
      if (r?.loadType !== 'search') continue;
      const hit = r.data.slice(0, 8).find((t) => !skip.has(t.info.identifier) && isMatch(want, t.info));
      if (hit) return hit;
    } catch { /* next source */ }
  }
  return null;
}
