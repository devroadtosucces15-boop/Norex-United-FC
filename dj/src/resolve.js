// Search order: direct links go straight to Lavalink; plain text tries SoundCloud, then YouTube.
// Spotify links are handled by Lavalink's LavaSrc plugin (metadata only, audio is mirrored from SC/YT).
const isUrl = (s) => /^https?:\/\//i.test(s);

export async function resolve(node, query) {
  const attempts = isUrl(query) ? [query] : [`scsearch:${query}`, `ytsearch:${query}`];
  for (const id of attempts) {
    const r = await node.rest.resolve(id);
    if (!r || r.loadType === 'empty') continue;
    if (r.loadType === 'error') { if (attempts.length > 1) continue; throw new Error(r.data?.message || 'Could not load that'); }
    if (r.loadType === 'track') return { tracks: [r.data], title: r.data.info.title };
    if (r.loadType === 'playlist') return { tracks: r.data.tracks, title: r.data.info.name, playlist: true };
    if (r.loadType === 'search') return { tracks: [r.data[0]], title: r.data[0].info.title };
  }
  return null;
}
