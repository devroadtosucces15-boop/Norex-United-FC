-- BE11 Match Night Centre: the session report's share flow can render a poster image (client-side canvas,
-- same technique as the result-card poster PNG) and upload it to R2 (MEDIA bucket, reusing the `i/` media
-- key shape) so the Discord report embed carries a real image, not just text.
ALTER TABLE events ADD COLUMN report_poster TEXT;
