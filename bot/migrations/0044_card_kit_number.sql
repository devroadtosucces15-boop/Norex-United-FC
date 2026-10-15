ALTER TABLE card_requests ADD COLUMN kit_number INTEGER CHECK (kit_number IS NULL OR kit_number BETWEEN 0 AND 99);
