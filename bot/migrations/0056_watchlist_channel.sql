-- Watch list: each creator can post to its own Discord channel (NULL = the shared announce channel).
ALTER TABLE watch_creators ADD COLUMN post_channel TEXT;
