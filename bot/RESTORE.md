# Disaster recovery – restoring a backup (BE7)

A runbook for a future session (Claude Code, or anyone comfortable with `wrangler`) to follow when the
live D1 database (`norex`) needs to be rolled back – accidental bad migration, a bug that corrupted data,
a bucket/database deleted by mistake, etc.

**For the user:** if something looks badly wrong with the club data (members, claims, events, points…),
just ask in a Claude Code session: *"restore the backup from <date>"* (or "the latest backup" / "before
today"). Don't run anything yourself – this needs the same Cloudflare credentials the bot deploy already
uses, which only GitHub Actions / a sandboxed session has.

## What exists

- **Nightly export**: `.github/workflows/backup.yml`, runs once a day (`workflow_dispatch` also works for
  an on-demand backup before a risky change). Exports the whole `norex` D1 database to SQL
  (`wrangler d1 export`), gzips it, uploads to the R2 bucket the bot already uses for feed media
  (`norex-media`, binding `MEDIA`) under `backups/norex-<YYYY-MM-DD>.sql.gz` – no new bucket needed.
- **Retention**: the bucket's existing 365-day lifecycle rule (set by `bot/ensure-resources.mjs`) deletes
  objects after a year – the same backstop already used for feed photos/clips. Daily SQL dumps of this
  club's data are a few MB at most, nowhere near the 10 GB free tier even at a year of history.
- List what's available: `npx wrangler@4 r2 object get norex-media/backups/<key> --remote --pipe` to peek,
  or check the bucket in the Cloudflare dashboard (R2 → norex-media → backups/).

## Restoring

1. Pick the backup to restore (a date, or "latest" – list the `backups/` prefix in the R2 dashboard or via
   the Cloudflare API if unsure which key matches).
2. Download and decompress it:
   ```
   cd bot
   npx --yes wrangler@4 r2 object get norex-media/backups/norex-<date>.sql.gz --remote --file=restore.sql.gz
   gunzip restore.sql.gz
   ```
3. **This export is a full schema + data dump** (`wrangler d1 export` includes `CREATE TABLE` statements).
   Restoring it over a database that still has its tables will fail on the `CREATE TABLE` lines. Two ways
   to apply it, pick based on the situation:
   - **Database is gone / being rebuilt from scratch** (e.g. recreated via `ensure-resources.mjs`, empty
     schema from migrations only): clear it first so the dump's `CREATE TABLE`s don't collide – drop the
     tables the migrations created, or recreate the D1 database entirely (`wrangler d1 delete norex` then
     let the next bot deploy's `ensure-resources.mjs` + migrations recreate it empty) – then:
     ```
     npx --yes wrangler@4 d1 execute norex --remote --file=restore.sql
     ```
   - **Database exists and only specific rows need rolling back**: don't run the whole dump. Open
     `restore.sql`, pull out the `INSERT INTO <table> ...` lines for just the affected table(s), wrap them
     in a transaction that deletes the current rows first, and run that smaller script instead – much
     safer than a full overwrite.
4. **Verify**: `npx --yes wrangler@4 d1 execute norex --remote --command "SELECT COUNT(*) FROM users"` (and
   a couple of the other core tables – `events`, `builds`, `claims`) – compare counts against what's
   expected before telling the user it's done.
5. Tell the user plainly what was restored and from which date, and that anything written to the live site
   *after* that backup's timestamp is gone (D1 writes) unless it can be re-derived from `data/` (the EA
   stats archive, committed separately and not affected by this).

## What this does NOT cover

- `data/` (EA stats archive) – already a committed git history, not a D1 concern; `git revert`/`git
  checkout` handles that independently.
- KV (`norex-members`, only the `public` badge cache + `rush` confirmed-results cache since the P0.3
  migration) – disposable, rebuilds itself from D1/the next fetch; not backed up on purpose.
- R2 media itself (feed photos/clips, avatar cards, report posters) – not backed up; losing the bucket
  loses those files. Out of scope for BE7 (the roadmap item is specifically the D1/R2 *database* backup);
  revisit if club media turns out to need its own backup too.
