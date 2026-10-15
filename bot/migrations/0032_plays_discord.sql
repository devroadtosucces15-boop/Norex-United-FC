-- BE1 follow-up: Discord share post for a play (board 06) – tracks the posted message so a manager can
-- tell a play has already been shared, same shape as events/docs' discord_channel/discord_msg columns.
ALTER TABLE plays ADD COLUMN discord_channel TEXT;
ALTER TABLE plays ADD COLUMN discord_msg TEXT;
