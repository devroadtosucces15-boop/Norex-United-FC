# Unified list

58 unique repos from 4 star lists (duplicates merged). Each entry was assessed from its own README and from what Norex already has (Cloudflare Workers AI for /ask, insights and voice recaps; a Lavalink DJ bot; zero-npm-dependency site and tests). Snapshot from 2026-10-15; it does not auto-update.

**Verdicts** (mine, yours to overrule): `Try` worth a trial on Norex · `Maybe` only if a need shows up · `Me` your own dev tooling, not the site · `Ref` read for ideas · `Skip` no use here.

Totals: Try 3 · Maybe 8 · Me 14 · Ref 11 · Skip 21 · — 1

## Could improve Norex directly

| Repo | What it is | Verdict | Proposed use for Norex | Your lists |
|---|---|---|---|---|
| [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) | Framework that renders HTML/CSS/animation into deterministic MP4 video; has a Claude Code plugin. | Try | Norex already draws score cards from HTML in `scripts/cards.mjs`. Same templates could become short animated result/MOTM clips for Discord and socials. | My stack |
| [cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design) | Agent skill that draws 45 diagram types as one self-contained HTML+SVG file in your brand colours. | Try | Tactics, Play Style and formation pages: generate brand-matched diagrams (Norex ink/red/gold) with no build dependencies. | My stack |
| [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill) | Multi-phase agent security audit with independently verified findings (from Cloudflare's vulnerability harness). | Try | One audit pass over `bot/` (Discord login, member API, D1 queries) before the Hub opens more features to members. | unsorted |
| [alibaba/open-code-review](https://github.com/alibaba/open-code-review) | CLI that reviews git diffs with an LLM agent and writes line-level comments; Anthropic-compatible. | Maybe | Could run on PRs in CI as an extra reviewer. Needs an API key and costs tokens; Claude Code review already covers this. | My stack |
| [tester-army/e2e](https://github.com/tester-army/e2e) | E2E test framework where an agent follows plain-English steps, then replays them without model calls. | Maybe | Norex tests are a zero-dependency harness. Only worth it for the login/Hub flows that need a real browser. | unsorted |
| [DigitalPlatDev/FreeDomain](https://github.com/DigitalPlatDev/FreeDomain) | Free domain registration plus a DNS learning guide. | Maybe | Only if the club wants a custom address for the site; free domains can be unreliable for a club brand. | unsorted |
| [public-apis/public-apis](https://github.com/public-apis/public-apis) | Big directory of free public APIs, by category. | Maybe | Mine it for fun Discord/site features (weather on match night, football facts); nothing needed today. | unsorted |

## Overlaps what Norex already has

| Repo | What it is | Verdict | Proposed use for Norex | Your lists |
|---|---|---|---|---|
| [yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp) | Command-line downloader for audio and video from thousands of sites. | Maybe | The DJ bot already uses Lavalink. Could help the Watch list pull metadata/thumbnails, but YouTube terms apply; the YouTube API is the safer route. | unsorted |
| [debpalash/VoiceStudio](https://github.com/debpalash/VoiceStudio) | Local voice cloning, dubbing, dictation and transcription app with a local API and MCP. | Maybe | Voice recaps already work through Workers AI. Interesting for a spoken match-recap voice, but cloning members' voices needs their consent. | My stack |
| [tashfeenahmed/freellmapi](https://github.com/tashfeenahmed/freellmapi) | Self-hosted router that pools free tiers of 34 LLM providers behind one OpenAI-compatible endpoint. README says personal experimentation only. | Skip | Norex already calls Cloudflare Workers AI (`env.AI`) for /ask, insights and voice recaps. A router needs hosting and breaks provider terms for a club service. | My stack |
| [vercel/ai](https://github.com/vercel/ai) | Provider-agnostic TypeScript AI toolkit (Next.js, React, Svelte). | Skip | Repo rule is no npm dependencies and the bot talks to Workers AI directly. Useful only if the next/ site ever gains an app server. | My stack |
| [Tencent/WeKnora](https://github.com/Tencent/WeKnora) | Heavy enterprise RAG, agent and wiki platform with Docker sandboxes. | Skip | Norex `/ask` already answers from site JSON. This is far more than a club needs. | My stack |

## Claude Code workflow tools (for you, not the site)

| Repo | What it is | Verdict | Proposed use for Norex | Your lists |
|---|---|---|---|---|
| [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem) | Records what an agent does each session, compresses it and feeds relevant context into later sessions. | Me | Several Claude sessions work on this repo. Could replace some hand-written handoff notes; adds a background service to run. | My stack |
| [mksglu/context-mode](https://github.com/mksglu/context-mode) | MCP server that keeps raw tool output out of the context window (claimed 98% less) and tracks session state in SQLite. | Me | Helps long sessions on this big repo (344 JS files); try on one session first. | My stack |
| [obra/superpowers](https://github.com/obra/superpowers) | Composable skills plus a development methodology: spec, plan, test-driven build, review. | Me | Closest match to how you already work; compare with your own CLAUDE.md rules before adopting. | unsorted |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | Skills and 9 slash commands for each phase: spec, plan, build, test, review, ship. | Me | Overlaps superpowers. Pick one set, not both. | unsorted |
| [mattpocock/skills](https://github.com/mattpocock/skills) | Small composable engineering skills from a developer's daily `.agents` folder. | Me | Light option if superpowers feels too opinionated. | unsorted |
| [affaan-m/ECC](https://github.com/affaan-m/ECC) | Large agent harness system: skills, memory, security, with a paid Pro tier. | Me | Big surface area; skim, don't install wholesale. | unsorted |
| [vercel-labs/skills](https://github.com/vercel-labs/skills) | The `npx skills` CLI that installs agent skills across 75+ agents. | Me | Handy installer for any skills you adopt (diagram-design installs with it). | unsorted |
| [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) | One CLAUDE.md file that counters common LLM coding mistakes (assumptions, overcomplication). | Me | Cheapest win: compare its rules to Norex's CLAUDE.md and copy the gaps. | unsorted |
| [ayghri/i-have-adhd](https://github.com/ayghri/i-have-adhd) | Skill that makes the agent answer action-first with numbered steps and no filler. | Me | Matches your preference for short, direct answers; try it. | unsorted |
| [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | Curated list of Claude Code skills, agents, status lines, tooling and plugins. | Ref | Browse when you want something new, not a to-do. | My stack |
| [VoltAgent/awesome-openclaw-skills](https://github.com/VoltAgent/awesome-openclaw-skills) | 5,300+ OpenClaw skills sorted by category. | Ref | Only useful if you adopt OpenClaw. | unsorted |

## AI agent platforms

| Repo | What it is | Verdict | Proposed use for Norex | Your lists |
|---|---|---|---|---|
| [paperclipai/paperclip](https://github.com/paperclipai/paperclip) | Node server and React dashboard that runs a team of agents with goals, budgets and org charts. | Maybe | Interesting for running recurring jobs (summaries, moderation) as a managed team, but heavy for now. | My stack, Me |
| [openclaw/openclaw](https://github.com/openclaw/openclaw) | Self-hosted AI assistant that lives in Discord, Slack, iMessage and 20+ other chats; models are swappable plugins. | Me | Possible personal assistant in your Discord; separate from the club bot. | unsorted |
| [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) | Self-improving agent with memory and skills, reachable from Telegram, Discord and Slack, with a cron scheduler. | Me | Same niche as OpenClaw; pick one to try. | unsorted |
| [anomalyco/opencode](https://github.com/anomalyco/opencode) | Open-source terminal coding agent. | Me | Alternative to Claude Code; no reason to switch while Claude Code works. | unsorted |
| [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) | DeepSeek's plugin-based agent harness, developer preview with breaking changes. | Skip | Too early; revisit later. | unsorted |
| [agent-substrate/substrate](https://github.com/agent-substrate/substrate) | Kubernetes runtime for running millions of agent sandboxes. | Skip | Infrastructure for AI platforms, not a club. | My stack |
| [lyogavin/airllm](https://github.com/lyogavin/airllm) | Runs 70B models on a 4GB GPU by streaming layers. | Skip | Norex uses hosted Workers AI; no local model need. | My stack |

## Design and creative

| Repo | What it is | Verdict | Proposed use for Norex | Your lists |
|---|---|---|---|---|
| [storytold/artcraft](https://github.com/storytold/artcraft) | Desktop IDE for AI image and video: compose in 2D, stage scenes in 3D, pick models. | Maybe | Crests, kit art or banner images if you want hand-directed AI art rather than the `aispike` crest generator. | My stack |
| [goabstract/Awesome-Design-Tools](https://github.com/goabstract/Awesome-Design-Tools) | Curated list of design tools, plugins and UI kits (last updated 2024). | Ref | Dated; skip unless you want a design tool. | My stack |
| [earthtojake/text-to-cad](https://github.com/earthtojake/text-to-cad) | Agent plugin that generates 3D CAD files (STEP, STL) and manufacturing drawings. | Skip | Nothing to do with a football club site. | unsorted |

## Web and frontend

| Repo | What it is | Verdict | Proposed use for Norex | Your lists |
|---|---|---|---|---|
| [dypsilon/frontend-dev-bookmarks](https://github.com/dypsilon/frontend-dev-bookmarks) | Categorised frontend resources (animation, typography, visualisation, architecture). | Ref | Look up when polishing the `next/` redesign. | My stack |
| [react/react](https://github.com/react/react) | The React UI library. | Skip | The `next/` site is plain static pages with no framework; React would break the no-dependency rule. | unsorted |
| [longbridge/gpui-kit](https://github.com/longbridge/gpui-kit) | Rust desktop UI framework (75+ components). | Skip | Desktop apps only; the club has none. | My stack |
| [bilawalsidhu/gods-eye-view](https://github.com/bilawalsidhu/gods-eye-view) | Browser 3D globe showing live aircraft, ships, satellites, earthquakes and cameras, with voice control. | Skip | You were right: this has nothing to do with Pro Clubs. My earlier tag was based on a loose idea of data visualisation. | My stack |

## Learning and reference

| Repo | What it is | Verdict | Proposed use for Norex | Your lists |
|---|---|---|---|---|
| [rohitg00/ai-engineering-from-scratch](https://github.com/rohitg00/ai-engineering-from-scratch) | 542 lessons across 20 phases on model internals, retrieval and agent runtimes. | Ref | Study material if you want to understand how the AI features work. | My stack |
| [codecrafters-io/build-your-own-x](https://github.com/codecrafters-io/build-your-own-x) | Step-by-step guides to rebuild technologies (bot, database, git, emulator, game…). | Ref | Learning, including its "build your own bot" section. | unsorted |
| [donnemartin/system-design-primer](https://github.com/donnemartin/system-design-primer) | Guide to designing large-scale systems and interview prep. | Ref | Learning only. | unsorted |
| [freeCodeCamp/freeCodeCamp](https://github.com/freeCodeCamp/freeCodeCamp) | Free coding curriculum and its platform codebase. | Ref | Learning only. | unsorted |
| [DovAmir/awesome-design-patterns](https://github.com/DovAmir/awesome-design-patterns) | Curated software and architecture design patterns (serverless, microservices, security…). | Ref | Serverless and Cloudflare Worker patterns are the relevant part. | Me |
| [trimstray/the-book-of-secret-knowledge](https://github.com/trimstray/the-book-of-secret-knowledge) | Cheatsheets, one-liners and CLI/web tools for sysadmins and pentesters. | Ref | Useful for running the Oracle server behind the DJ bot. | My stack |
| [awesome-selfhosted/awesome-selfhosted](https://github.com/awesome-selfhosted/awesome-selfhosted) | List of free self-hostable services by category. | Ref | Pick from it if the DJ server or club tools need self-hosting. | unsorted |
| [DopplerHQ/awesome-interview-questions](https://github.com/DopplerHQ/awesome-interview-questions) | Lists of technical interview questions; no longer maintained. | Skip | No use here. | unsorted |
| [vinta/awesome-python](https://github.com/vinta/awesome-python) | Opinionated list of Python libraries. | Skip | Norex is JavaScript; only the build-script Python files use it. | unsorted |
| [dkhamsing/open-source-ios-apps](https://github.com/dkhamsing/open-source-ios-apps) | List of open-source iOS apps. | Skip | No iOS app planned. | unsorted |
| [torvalds/linux](https://github.com/torvalds/linux) | The Linux kernel source. | Skip | No use here. | unsorted |

## Your own repos

| Repo | What it is | Verdict | Proposed use for Norex | Your lists |
|---|---|---|---|---|
| [devroadtosucces15-boop/Copyweb](https://github.com/devroadtosucces15-boop/Copyweb) | Your copy of an AI website-cloner template: give an agent a URL and it rebuilds the site as a Next.js app. | Me | Handy for studying other club sites for the `next/` redesign. | unsorted |
| [devroadtosucces15-boop/Norex-United-FC](https://github.com/devroadtosucces15-boop/Norex-United-FC) | This project: club site, Discord bot and member API. | — | Listed in Inspiration and My stack, so it is already the centre of everything. | My stack, Inspiration |

## Reverse engineering and game tooling

| Repo | What it is | Verdict | Proposed use for Norex | Your lists |
|---|---|---|---|---|
| [morluto/rea](https://github.com/morluto/rea) | MCP server for reverse engineering binaries, apps and runtime behaviour (the tools in this session). | Me | Personal tool; not part of Norex. | unsorted |
| [AssetRipper/AssetRipper](https://github.com/AssetRipper/AssetRipper) | Analyses and converts Unity game files. | Skip | No use here. | unsorted |
| [EpicGames/raddebugger](https://github.com/EpicGames/raddebugger) | Native Windows graphical debugger (alpha). | Skip | No use here. | My stack |

## PlayStation 5 tinkering

| Repo | What it is | Verdict | Proposed use for Norex | Your lists |
|---|---|---|---|---|
| [boykopovar/AnyPS5](https://github.com/boykopovar/AnyPS5) | Ports PS5 executables to Linux and Windows. | Skip | Your personal interest, not Norex. | My stack, Inspiration |
| [ps5-linux/ps5-linux-tools](https://github.com/ps5-linux/ps5-linux-tools) | Linux fan/boost control and install scripts for PS5. | Skip | Not Norex. | unsorted |
| [itsPLK/ps5-webkit-autoloader](https://github.com/itsPLK/ps5-webkit-autoloader) | Autoloader for exploited PS5 consoles. | Skip | Not Norex. | unsorted |
| [FunkeyFlo/ps5-mqtt](https://github.com/FunkeyFlo/ps5-mqtt) | Home Assistant add-on to control a PS5 over MQTT. | Skip | Not Norex. | unsorted |
| [Ohjurot/DualSense-Windows](https://github.com/Ohjurot/DualSense-Windows) | Windows C++ API for the DualSense controller. | Skip | Not Norex. | unsorted |
