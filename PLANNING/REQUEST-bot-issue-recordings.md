# Request for the bot side: store screen recordings with issue reports

From the web side (screen recorder in the owner's 🐞 issue tool, flag `issueRecorder`). **Nothing in `bot/` was changed.**

## Why
The recorder (`web/record.js`, `web/record-host.html`) produces a WebM/MP4 of up to ~55 MB. `POST /api/issues` keeps one report as JSON in D1
and refuses anything over 60 000 characters, so the video cannot travel with the report today. For now:

- the pop-up **saves the video file on the owner's device** the moment recording stops;
- the report carries a small `recording` block through the existing `POST /api/issues`: file name, length, size, the page trail
  (which pages were visited, with timestamps), "moments" the owner flagged, and the voice-over **captions** with timestamps (kept under 50 000 chars).

## What would finish it (bot side)
1. An R2 bucket binding (e.g. `ISSUE_MEDIA`) in `wrangler.toml`.
2. `POST /api/issues/recording?session=<id>&n=<note number>` – owner only, flag `issueTool`, raw body, `Content-Type` `video/webm` or `video/mp4`,
   cap **55 000 000 bytes** (same family as the Tactics Studio's 60 MB media cap; the client already stops recording before 55 MB).
   Store under `issues/<session>/<n>.<ext>` and set `recording.uploaded = true` plus `recording.key` inside the report's `data` JSON
   (no migration needed – `data` is already free-form).
3. An owner-only `GET /api/issues/recording?...` that streams it back (for a future "watch" button in the Boardroom reports tab).
4. Delete the object when the report row is deleted.

Once the route exists, tell the web side: the pop-up already holds the blob and the page already knows the session id + note number, so the
upload is one `fetch` after the item is committed.

## Other notes
- Reports with a recording have `kind: "recording"` and no `shape`; anything that reads `issue_reports.data` and expects `item.shape` should tolerate that.
- `PUT`/range streaming is not needed; WebM from MediaRecorder has no duration header, so players show the length only after buffering.
