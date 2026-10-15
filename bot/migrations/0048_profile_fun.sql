-- Profile fun fields (bot/fun.js, bot/profiles.js): Kick channel and birthday (MM-DD, no year).
ALTER TABLE profiles ADD COLUMN kick TEXT NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN birthday TEXT NOT NULL DEFAULT '';
