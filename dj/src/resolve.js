// Search order for plain text: Spotify (if configured) → YouTube → SoundCloud. Links go straight to Lavalink.
// Spotify results are mirrored to audio by LavaSrc (see lavalink/application.yml providers).
// Links from any platform are recognised (song, video, album, playlist, artist) and sent straight to Lavalink.
// Bare links without https:// and spotify:track:ID style URIs are fixed up first.
const HOSTS = /^(?:www\.|m\.|music\.|open\.|on\.|api\.)?(?:youtube\.com|youtu\.be|spotify\.com|spotify\.link|soundcloud\.com|snd\.sc|bandcamp\.com|twitch\.tv|vimeo\.com)(?:\/|$)|\.bandcamp\.com(?:\/|$)/i;
export function normalizeLink(q) {
  q = q.trim().replace(/^<(.+)>$/, '$1');
  const uri = q.match(/^spotify:(track|album|playlist|artist|episode|show):([A-Za-z0-9]+)$/i);
  if (uri) return `https://open.spotify.com/${uri[1].toLowerCase()}/${uri[2]}`;
  if (/^https?:\/\/\S+$/i.test(q)) return q;
  if (HOSTS.test(q) && !/\s/.test(q)) return `https://${q}`;
  return null;
}
export const platformOf = (url) => (/spotify/i.test(url) ? 'Spotify' : /youtu/i.test(url) ? 'YouTube' : /soundcloud|snd\.sc/i.test(url) ? 'SoundCloud' : 'link');
let spotifyDownUntil = 0; // text search errors on Spotify → skip it for 10 minutes, links still work
const spotifyOn = () => Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) && Date.now() > spotifyDownUntil;
export const SOURCES = { spotify: 'spsearch', youtube: 'ytmsearch', soundcloud: 'scsearch' };

function shape(r) {
  if (!r || r.loadType === 'empty') return null;
  if (r.loadType === 'error') return { error: r.data?.message || 'Could not load that' };
  if (r.loadType === 'track') return { tracks: [r.data], title: r.data.info.title };
  if (r.loadType === 'playlist') return { tracks: r.data.tracks, title: r.data.info.name, playlist: true };
  if (r.loadType === 'search' && r.data.length) return { tracks: [r.data[0]], title: r.data[0].info.title };
  return null;
}

export async function resolve(node, query, source = 'auto') {
  let order;
  const link = normalizeLink(query);
  if (link) order = [link];
  else if (source !== 'auto') order = [`${SOURCES[source]}:${query}`];
  else order = [...(spotifyOn() ? [`spsearch:${query}`] : []), `ytmsearch:${query}`, `ytsearch:${query}`, `scsearch:${query}`];
  let lastError = null;
  for (const id of order) {
    let r;
    try { r = shape(await node.rest.resolve(id)); } catch (e) { lastError = e.message; continue; }
    if (!r) continue;
    if (r.error) { lastError = r.error; if (id.startsWith('spsearch:')) spotifyDownUntil = Date.now() + 600_000; continue; }
    return r;
  }
  if (lastError && order.length === 1) throw new Error(lastError);
  return null;
}
