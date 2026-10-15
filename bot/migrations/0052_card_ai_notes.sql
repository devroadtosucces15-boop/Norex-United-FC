-- What the artwork model was told about the photo. ai_notes_manual = 1 means a manager wrote or edited it, so it is used as-is instead of a fresh description.
ALTER TABLE card_requests ADD COLUMN ai_notes TEXT;
ALTER TABLE card_requests ADD COLUMN ai_notes_manual INTEGER NOT NULL DEFAULT 0;
