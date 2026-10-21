// Profile playlists (flag `music`): no DOM in here, so member.js and the tests share it.
//   GET /api/music/playlists[?u=<discord id>]   → [{ id, name, count, tracks:[{ title, artist, duration }] }]   (duration in seconds)
// SAMPLE playlists are only for a preview: the profile shows them when the request fails, never in place of a real (even empty) answer.
(() => {
  const w = window;
  const num = (n, max) => Math.min(max, Math.max(0, Math.floor(+n) || 0));
  const txt = (s, n) => String(s ?? '').slice(0, n);
  const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const normTracks = (list) => (Array.isArray(list) ? list : []).filter((q) => q && q.title).slice(0, 50).map((q) => ({ title: txt(q.title, 140), artist: txt(q.artist, 80), duration: num(q.duration, 36000) }));
  // pure: clean whatever the server sends so a bad row can never break the page
  const normPlaylists = (list) => (Array.isArray(list) ? list : []).filter((p) => p && p.id != null && p.name).slice(0, 12).map((p) => {
    const tracks = normTracks(p.tracks), count = Math.max(tracks.length, num(p.count, 5000));
    return { id: String(p.id), name: txt(p.name, 60), count, tracks, minutes: Math.round(tracks.reduce((a, x) => a + x.duration, 0) / 60) };
  });
  const T = [['Pre-match hype', 'SAMPLE Artist', 187], ['Walk-out theme', 'SAMPLE Orchestra', 158], ['Full-time anthem', 'SAMPLE Choir', 203], ['Late night warm-up', 'SAMPLE Artist', 214], ['Penalty shootout drums', 'SAMPLE Band', 176], ['Golden goal', 'SAMPLE Band', 232]]
    .map(([title, artist, duration]) => ({ title: 'SAMPLE · ' + title, artist, duration }));
  const samplePlaylists = () => [
    { id: 'sample-p1', name: 'SAMPLE · Match day', count: 4, tracks: T.slice(0, 4) },
    { id: 'sample-p2', name: 'SAMPLE · Late grind', count: 3, tracks: T.slice(3, 6) },
  ];
  w.NorexMusicPlaylists = { clock, normPlaylists, samplePlaylists };
})();
