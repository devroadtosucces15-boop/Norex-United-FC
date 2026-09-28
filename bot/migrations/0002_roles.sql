-- Permissions model (P0.6): each user's tier from Discord at their last login – member | manager | owner.
-- (`claimed` is worked out per request from the claims table.) `admin` stays = role is manager or owner.
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'member';
UPDATE users SET role = 'manager' WHERE admin = 1;
