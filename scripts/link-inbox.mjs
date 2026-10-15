// File links into RESEARCH/stars/inbox.md with a short summary.
//   node scripts/link-inbox.mjs                 reads RESEARCH/inbox.txt (one link per line, cleared after filing)
//   ISSUE_BODY="..." node scripts/link-inbox.mjs  links found in an issue body
// GitHub repos: summary from the README. Other sites: page title + meta description.
// Only fetches the links it is given; sends no credentials to third-party sites. Prints FILED=<n> for the workflow.
import fs from 'node:fs';
import { extractLinks, githubRepoOf, summariseReadme, parseHtmlMeta, parseInbox, inboxLine, renderInbox } from './lib/stars.mjs';

const ROOT = new URL('../RESEARCH/', import.meta.url);
const INBOX_TXT = new URL('inbox.txt', ROOT);
const INBOX_MD = new URL('stars/inbox.md', ROOT);
const GH_TOKEN = process.env.GITHUB_TOKEN;

const get = (url, headers = {}) => fetch(url, { headers: { 'user-agent': 'norex-link-inbox', ...headers }, redirect: 'follow', signal: AbortSignal.timeout(15000) });

async function describe(url) {
  const repo = githubRepoOf(url);
  if (repo) {
    const h = { accept: 'application/vnd.github+json', ...(GH_TOKEN ? { authorization: `Bearer ${GH_TOKEN}` } : {}) };
    const meta = await get(`https://api.github.com/repos/${repo}`, h).then((r) => (r.ok ? r.json() : {}));
    const readme = await get(`https://api.github.com/repos/${repo}/readme`, { ...h, accept: 'application/vnd.github.raw+json' }).then((r) => (r.ok ? r.text() : ''));
    return { title: repo, summary: summariseReadme(readme) || meta.description || '' };
  }
  const html = await get(url).then((r) => (r.ok ? r.text() : ''));
  const m = parseHtmlMeta(html);
  return { title: m.title, summary: m.description };
}

const source = process.env.ISSUE_BODY ?? (fs.existsSync(INBOX_TXT) ? fs.readFileSync(INBOX_TXT, 'utf8') : '');
const links = extractLinks(source);
const existing = fs.existsSync(INBOX_MD) ? fs.readFileSync(INBOX_MD, 'utf8') : '';
const seen = parseInbox(existing);
const fresh = links.filter((l) => !seen.has(l));
const today = new Date().toISOString().slice(0, 10);

const lines = [];
for (const url of fresh) {
  let d = { title: '', summary: '' };
  try { d = await describe(url); } catch (e) { console.log(`::warning::Could not fetch ${url} (${e.message}); filing the bare link.`); }
  lines.push(inboxLine({ url, ...d, added: today }));
}
if (lines.length) {
  const old = existing.split('\n').filter((l) => l.startsWith('- ['));
  fs.mkdirSync(new URL('stars/', ROOT), { recursive: true });
  fs.writeFileSync(INBOX_MD, renderInbox([...lines, ...old]));
}
if (process.env.ISSUE_BODY === undefined && fs.existsSync(INBOX_TXT)) fs.writeFileSync(INBOX_TXT, '');
console.log(`FILED=${lines.length} (${links.length - fresh.length} already filed)`);
