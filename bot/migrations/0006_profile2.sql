-- Profile 2.0 (P2.2). `positions` stays = League positions (1st/2nd/3rd, in order).
ALTER TABLE profiles ADD COLUMN rush_positions TEXT NOT NULL DEFAULT '[]'; -- JSON array, 1st/2nd/3rd
ALTER TABLE profiles ADD COLUMN tz TEXT NOT NULL DEFAULT ''; -- IANA time zone, e.g. Europe/London
ALTER TABLE profiles ADD COLUMN play_times TEXT NOT NULL DEFAULT ''; -- JSON [7 ints] Mon..Sun, bit h = plays hour h (member's time zone)
ALTER TABLE profiles ADD COLUMN ids TEXT NOT NULL DEFAULT '{}'; -- JSON {psn, xbox, ea, steam} – self-reported until P2.4
ALTER TABLE profiles ADD COLUMN twitch TEXT NOT NULL DEFAULT ''; -- channel name
ALTER TABLE profiles ADD COLUMN youtube TEXT NOT NULL DEFAULT ''; -- '@handle' or 'channel/UC…'
ALTER TABLE profiles ADD COLUMN country TEXT NOT NULL DEFAULT ''; -- ISO 3166 alpha-2
ALTER TABLE profiles ADD COLUMN fav_club TEXT NOT NULL DEFAULT ''; -- favourite real-life club
