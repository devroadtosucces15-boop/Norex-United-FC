-- Board 08 Dugout: "plays for tonight" – a match night pins up to 4 published plays (JSON array of play ids).
ALTER TABLE events ADD COLUMN plays TEXT;
