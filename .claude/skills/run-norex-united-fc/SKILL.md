---
name: run-norex-united-fc
description: Build, run, and drive the NOREX UNITED FC site and Discord bot locally. Use when asked to start or preview the site, screenshot a page, log in as owner/manager/member to see flagged pages (Pro Builder, Squad Hub, leaderboards…), call the member API, try a Discord slash command, or run the tests.
---

A static site (`scripts/build.mjs` → `site/`) plus a Cloudflare Worker (`bot/worker.js`: member API, Discord login, slash commands). Drive both with **`.claude/skills/run-norex-united-fc/driver.mjs`**. In one process it:

- serves `site/` on `:4321`;
- runs the real Worker on the repo's in-memory mock (`tests/mock.mjs`: D1, KV and a fake Discord OAuth) on `:8788`;
- runs headless Chromium from the global Playwright install.

You feed it a command script on stdin. Nothing needs Cloudflare, Discord or EA.

All paths are relative to the repo root.

## Prerequisites

- Node 22 or newer (`node:sqlite` is needed by the mock).
- Playwright and Chromium, which this container already has: global `playwright@1.56.1` and `/opt/pw-browsers`.
- There's no `npm install`, because the project has zero dependencies.

## Build

```bash
node scripts/build.mjs          # ~0.5 s → "Built 46 clubs, 673 players, 10 matches → site/"
```

The driver also runs this itself if `site/api/club.json` is missing. **Rebuild after any edit** to `scripts/`, `web/` or `config.json`, because the server serves `site/` and not `web/`.

## Run (agent path)

```bash
node --no-warnings .claude/skills/run-norex-united-fc/driver.mjs <<'EOF'
login owner
nav /builder.html
wait [data-arch]
click [data-arch="finisher"]
click [data-max]
click [data-attr="Finishing"] [data-d="1"]
text [data-attr="Finishing"]
shot builder
shot-el builder-summary .bd-side
errors
EOF
```

Screenshots are saved to `/tmp/norex-shots/<name>.png` (set `SHOTS=` to change the folder). The process exits when the script ends. The exit code is 1 if a command failed, 2 for an unknown command, and 3 if `errors` found any.

| command | what it does |
|---|---|
| `login owner\|manager\|member\|guest` | Real OAuth round trip through the mock. owner = id 111 (`ADMIN_IDS`), manager = role `mgr`, member = id 222 ("Mike", seeded with a pending claim). The session goes into `localStorage.norex_session`. |
| `nav <path>` | Opens `http://localhost:4321/<path>`. |
| `wait <selector>` / `click <selector>` | CSS selector, or `text=Some text`. Everything after the command word counts as the selector, so spaces are fine. |
| `fill <selector> \| <text>` | Types into an input. The ` \| ` separator is required. |
| `press <Key>` | Keyboard press, e.g. `press Enter` or `press /` (the search palette). |
| `text [selector]` | Prints innerText, `main` by default, capped at 2000 chars. |
| `eval <js>` | Runs JS in the page and prints the result as JSON. |
| `shot [name]` | Full-page screenshot. |
| `shot-el <name> <selector>` | Screenshot of one element. |
| `viewport <w> <h>` | Resizes, e.g. `viewport 390 844` for a phone. |
| `sleep <ms>` | Pause. |
| `api <path> [json]` | Calls the Worker directly as the logged-in user (GET, or POST when you give JSON). Prints status and JSON. |
| `slash <cmd> [opt=value…]` | Sends a signed Discord interaction to the Worker and prints the reply embed, e.g. `slash player gamertag=x_MrMike_x`. |
| `errors` | Page errors, console errors and failed local requests seen since the last call. |

Scripts that only use `login`, `api` or `slash` never start Chromium and finish in well under a second:

```bash
node --no-warnings .claude/skills/run-norex-united-fc/driver.mjs <<'EOF'
slash club
slash top stat=rating
login member
api /api/me
EOF
```

**Servers only** (for curl or a long session). Stop them by killing the port:

```bash
node .claude/skills/run-norex-united-fc/driver.mjs serve > /tmp/norex-serve.log 2>&1 &
timeout 30 bash -c 'until curl -sf http://localhost:8788/api/public >/dev/null; do sleep 0.5; done'
curl -s localhost:4321/members.html | grep -o 'data-api="[^"]*"'   # → data-api="http://localhost:8788"
lsof -ti:4321 -sTCP:LISTEN | xargs -r kill
```

## Run (human path)

```bash
npm run preview    # site/ on http://localhost:4321; Ctrl-C to stop
```

This mode has no local Worker. Pages still point at the live `norex-bot…workers.dev`, which isn't reachable from the sandbox, so login and member features stay dead.

## Test

```bash
node tests/run.mjs            # syntax check + build + all tests/*.test.mjs, ~2 s, "✔ all green"
node tests/run.mjs builder    # only test files whose name contains "builder"
```

CI (`.github/workflows/test.yml`) runs exactly this.

## Gotchas

- **Feature flags are per role.** `config.json → features` sets who sees what, e.g. `builder: "owner"`. As a guest, `/builder.html` shows "The Pro Builder is in the lab". You must `login owner` first. The Worker enforces flags too, so `api` returns 404 or 403 to a user who is too low.
- **`npm run update` / `scripts/fetch.mjs` gets HTTP 403 from EA in this sandbox.** It retries for about a minute, prints "EA returned 403 (blocked)" and leaves `data/` alone. Work from the committed `data/`: GitHub Actions commits fresh data every ~10 minutes, so `git pull` gets it.
- **Pages are hard-wired to the live Worker.** `config.json → members.api` gets baked into every page as `<body data-api=…>`. The driver rewrites that attribute to `http://localhost:8788` as it serves each page. The file in `site/` stays unchanged, so don't be surprised by what's on disk.
- **Port 4321 is fixed.** `tests/mock.mjs` hard-codes `SITE_URL=http://localhost:4321/`, which the Worker uses for CORS and the OAuth return. The Worker port can be moved with `API_PORT=`.
- **Screenshots come out faded or half-empty without reduced motion.** `.reveal` sections fade in on scroll. The driver runs Chromium with `reducedMotion: 'reduce'`, which `web/style.css` honours.
- **The sticky header gets painted mid-page** in full-page shots taken after a click, because clicks scroll the page. `html{scroll-behavior:smooth}` makes a plain `scrollTo(0,0)` animate, so `shot` does an *instant* scroll to the top first.
- **Off-site requests are aborted** (Google Fonts, the EA crest CDN, Discord avatars) because they fail here anyway, with a CA or tunnel error. Pages fall back to system fonts and SVG badges. `errors` ignores them and reports how many were blocked. `EXTERNAL=1` lets them through.
- **The mock is in-memory per process.** Every driver run starts from the seeded state in `tests/mock.mjs`, so anything you post is gone on the next run.
- **`login member` renames user 222 to "Member"** in the fake Discord profile. The seeded claim still says `x_MrMike_x`.

## Troubleshooting

- **`EADDRINUSE: port 4321 busy`**: a `serve` or `npm run preview` is still running. Run `lsof -ti:4321 -sTCP:LISTEN | xargs -r kill` (and the same for `:8788`).
- **`✘ wait [data-arch]` / `locator.waitFor: Timeout 10000ms exceeded`**: usually the page is flag-gated and you're not logged in high enough. Add `login owner` before `nav`. `text main` shows what the page is actually rendering.
- **`api` returns `404 {"error":"Not available yet."}`**: that route's feature flag is off for this role, e.g. `/api/notes` for a member, because `managerNotes` is managers-only. `401 {"error":"Please log in again."}` means `login` hasn't run yet.
- **`ExperimentalWarning: SQLite is an experimental feature`** on stderr is harmless (`node:sqlite` in the mock). Add `--no-warnings` to hide it.
