# Norex DJ – deploy (Oracle Cloud Always Free)

## 1. Discord apps (developer portal)
1. Create **Norex DJ** (main) plus **DJ 1, DJ 2, DJ 3** (helpers, one per extra room).
2. For each: Bot → copy the token. No privileged intents needed.
3. Invite each to the server with permissions **Connect** + **Speak** + **View Channel** (scope `bot`; the main app also needs `applications.commands`).

## 2. Oracle VM
1. Sign up at cloud.oracle.com (card is for verification only, Always Free is not charged).
2. Compute → Instances → Create: image **Ubuntu 22.04**, shape **VM.Standard.A1.Flex** (2 OCPU / 12 GB is plenty). Download the SSH key.
3. No ports need opening: the bot and Lavalink only talk outwards and to each other inside Docker.
4. `ssh ubuntu@<ip>` then:
   ```bash
   curl -fsSL https://get.docker.com | sh && sudo usermod -aG docker $USER && newgrp docker
   git clone https://github.com/devroadtosucces15-boop/Norex-United-FC && cd Norex-United-FC/dj
   cp .env.example .env && nano .env     # tokens, MAIN_APP_ID, a long LAVALINK_PASSWORD
   docker compose up -d --build
   docker compose logs -f bot            # expect "Norex DJ ready: 4 room(s)"
   ```
5. Updates: `git pull && docker compose up -d --build`. Both services restart on reboot.

## Notes
- Only the main app registers slash commands; helpers just join voice when a room is needed.
- Spotify links need `SPOTIFY_CLIENT_ID/SECRET` (free, developer.spotify.com) in `.env`; without them SoundCloud/YouTube/search still work.
- YouTube playback breaks every few months (plugin update fixes it); SoundCloud is tried first.
- Not yet built: Components V2 panels, drawn Now Playing card, site playlists API, `/hype`, `/lyrics`, `/myplaylist`.
