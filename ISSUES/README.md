# ISSUES – the owner's bug reports, readable from the repo

`.github/workflows/issues-sync.yml` (every 30 minutes, or run it by hand from the Actions tab) copies new reports from the site's database into
this folder, so a Claude session can read them without any access to Cloudflare.

**How to read one:** open `INDEX.md`, then the folder's `report.md`. It has Mike's note and category, the page and device, the pages visited, the
flagged moments, what was said (captions) and a handful of frames (`f01-…jpg`) cut from the video at those moments. The full video is not in git:
it is in the workflow run's artifact `issue-videos` for 14 days.

**Auto-delete:** the site deletes a report one day after it is marked fixed. The sync runs every 30 minutes, so a report is copied here long
before that; `index.json` remembers which ones were copied, and marks them `gone` when the site has removed them. This folder is the history.

## Set-up (nothing new)
It uses the repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, which the nightly backup already uses (it reads the same database and the same
R2 bucket). If those two exist, it works as is. A narrower token is better practice if you ever want one: Cloudflare dashboard → My Profile →
API Tokens → Create Token → Custom token, with **Account · D1 · Read** and **Account · Workers R2 Storage · Read**, scoped to your account; paste it
into the repo secret `CLOUDFLARE_API_TOKEN` (Settings → Secrets and variables → Actions). The deploy and backup workflows need write access, so keep the
current token unless you split them.

Limits: 25 new reports per run, 12 frames per video, videos over 60 MB are skipped.
