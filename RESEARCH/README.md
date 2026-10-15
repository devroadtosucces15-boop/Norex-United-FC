# Research folder

Ideas and links carried over from GitHub stars and other sites, so they are in the repo where Claude can use them.

- `stars/<list>.md` – one file per GitHub star list (link, description, language, last pushed). Synced every 6 h by `.github/workflows/stars-sync.yml`; don't edit by hand.
- `stars/unsorted.md` – starred but not in any list.
- `stars/inbox.md` – links filed through the inbox, newest first, each with a short summary.

## Adding a link
- **Issue:** new issue, label `link`, put the link(s) in the body. It is filed and the issue is closed.
- **File:** add links to `RESEARCH/inbox.txt` (one per line) and push to `main`.

## One-time setup (stars sync)
1. GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)** → Generate new token. Tick only `read:user`. Set an expiry you'll remember.
2. Repo → Settings → Secrets and variables → Actions → New repository secret. Name `STARS_TOKEN`, paste the token.
3. Repo → Issues → Labels → create a label named `link`.
4. Actions → "Sync GitHub stars" → Run workflow.

If star lists can't be read with the token, the sync logs a warning and writes all stars to `unsorted.md` instead of failing.
