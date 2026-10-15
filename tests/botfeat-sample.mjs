// SAMPLE data for the bot-feature pages (watch list, discoveries, member live, fun stats, faces). The bot gives no sample rows,
// so local previews and tests seed the mock D1 with these. Every visible title says SAMPLE so it can never be mistaken for real content.
import { sqlite, login, call, mockDiscord, r2objects } from './mock.mjs';

export async function seedBotSample() {
  const now = Date.now(), ids = { owner: '111', mike: '222', jez: '333', kruger: '444' };
  const tok = {};
  for (const [id, name] of [['222', 'Mike'], ['333', 'Jez'], ['444', 'Kruger']]) tok[id] = await login(id, [], name);
  tok['111'] = await login('111', [], 'Zub (owner)');
  await call(tok['222'], '/api/profile', { twitch: 'norex_mike', kick: 'mike_on_kick', birthday: '07-14', youtube: '@mikeplays' });
  await call(tok['333'], '/api/profile', { youtube: '@jezclips', birthday: '03-02' });
  const vids = [
    ['sampleVid001', 'SAMPLE · Best CAM build for FC 27 Pro Clubs', 'builds', ['CAM', 'meta'], 3], ['sampleVid002', 'SAMPLE · How to defend a 4-2-3-1 in League', 'tactics', ['CDM', 'CB'], 26],
    ['sampleVid003', 'SAMPLE · Five finishing tips you probably skip', 'tips', ['ST'], 70], ['sampleVid004', 'SAMPLE · This patch changed the meta for wingers', 'meta', ['RW', 'LW'], 130],
    ['sampleVid005', 'SAMPLE · FC 27 Clubs update notes in two minutes', 'news', [], 200], ['sampleVid006', 'SAMPLE · A long title to test clamping: the complete guide to pressing triggers, line height and covering shadows in Pro Clubs', 'tactics', ['CM', 'CAM', 'ST'], 300],
  ];
  for (const [id, title, topic, tags, hrs] of vids)
    sqlite.prepare('INSERT OR REPLACE INTO watch_videos (id, channel_id, channel_name, title, thumb, published, topic, tags, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, 'UCsample', 'SAMPLE Channel', title, `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, now - hrs * 36e5, topic, JSON.stringify(tags), now);
  sqlite.prepare("INSERT OR REPLACE INTO watch_useful (video_id, user_id) VALUES ('sampleVid001', '333'), ('sampleVid001', '444'), ('sampleVid002', '333')").run();
  const disc = [['SAMPLE · Hold L1 + a direction to jockey without fouling', 'Found this in training.\n\nIt keeps the defender tight without the lunge. Works best with 85+ defending.', 'https://www.youtube.com/watch?v=sampleVid002', '333', 'Jez', 5], ['SAMPLE · The new kit numbers are first come, first served', 'Pick yours in the Card Studio before the weekend.', '', '444', 'Kruger', 52], ['SAMPLE · Pre-patch: stamina drain is lower', 'Short note, no link.', '', '222', 'Mike', 120]];
  for (const [title, body, link, uid, name, hrs] of disc)
    sqlite.prepare("INSERT INTO discoveries (user_id, name, title, body, link, status, approved_by, at, decided_at) VALUES (?, ?, ?, ?, ?, 'approved', '111', ?, ?)").run(uid, name, title, body, link, now - hrs * 36e5 - 6e5, now - hrs * 36e5);
  sqlite.prepare("INSERT INTO discovery_useful (discovery_id, user_id) VALUES (1, '444'), (1, '222'), (2, '333')").run();
  sqlite.prepare("INSERT OR REPLACE INTO member_live (user_id, platform, url, title, since, at) VALUES ('222', 'twitch', 'https://www.twitch.tv/norex_mike', 'SAMPLE · Ranked Rush grind, come say hi', ?, ?), ('333', 'youtube', 'https://www.youtube.com/watch?v=sampleLive01', 'SAMPLE · Late-night Pro Clubs with the lads', ?, ?), ('444', 'kick', 'https://kick.com/kruger', 'SAMPLE · Tactics talk', ?, ?)")
    .run(now - 42 * 6e4, now, now - 7 * 6e4, now, now - 95 * 6e4, now);
  sqlite.prepare("INSERT INTO fun_jail (user_id, name, by_id, by_name, reason, minutes, at) VALUES ('222', 'Mike', '333', 'Jez', 'SAMPLE · own goal', 5, ?), ('222', 'Mike', '444', 'Kruger', 'SAMPLE · late', 5, ?), ('222', 'Mike', '333', 'Jez', 'SAMPLE · again', 5, ?)").run(now - 9e6, now - 5e6, now - 1e6);
  sqlite.prepare("INSERT OR REPLACE INTO fun_trivia_scores (user_id, name, points, correct, played) VALUES ('222', 'Mike', 120, 9, 12)").run();
  // a shipped Card Studio card for Jez: bytes in the mock R2, the row published
  r2objects.set('card/5a31e000000000000000000000000000.png', { buf: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'), type: 'image/png', uploaded: new Date() });
  sqlite.prepare("INSERT OR REPLACE INTO card_requests (user_id, month, bg_id, pose_id, photo_key, status, result_key, created_at, published) VALUES ('333', '2026-10', 1, 1, 'p', 'done', 'card/5a31e000000000000000000000000000.png', ?, 1)").run(now);
  Object.assign(mockDiscord, { id: '111', username: 'boss', global_name: 'Зуб_Ноrex 👑', roles: [] });
  return { tok, ids };
}
