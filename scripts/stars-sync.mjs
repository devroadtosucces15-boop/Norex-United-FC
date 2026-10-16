// Sync the owner's GitHub stars and star lists into RESEARCH/stars/ (one markdown file per list).
//   STARS_TOKEN=<read-only PAT> node scripts/stars-sync.mjs
// Runs from .github/workflows/stars-sync.yml. Zero dependencies. Never prints the token.
// The star lists GraphQL field (viewer.lists) is newer than plain stars; if it fails we still write all stars
// into one file and say so in the log, instead of failing the run.
import fs from 'node:fs';
import { MARK, repoEntry, buildLists, renderList, renderIndex, slugify } from './lib/stars.mjs';

const TOKEN = process.env.STARS_TOKEN;
const OUT = new URL('../RESEARCH/stars/', import.meta.url);

const gql = async (query, variables = {}) => {
  const r = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json', 'user-agent': 'norex-stars-sync' },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.errors) throw new Error(`GraphQL ${r.status}: ${(j.errors || [j.message || 'error']).map((e) => e.message || e).join('; ')}`);
  return j.data;
};

const REPO = 'nameWithOwner url description primaryLanguage { name } pushedAt stargazerCount';

async function allStars() {
  const out = [];
  let cursor = null;
  do {
    const d = await gql(`query($c:String){ viewer { starredRepositories(first:100, after:$c, orderBy:{field:STARRED_AT, direction:DESC}) { pageInfo { hasNextPage endCursor } nodes { ${REPO} } } } }`, { c: cursor });
    const s = d.viewer.starredRepositories;
    out.push(...s.nodes.map(repoEntry));
    cursor = s.pageInfo.hasNextPage ? s.pageInfo.endCursor : null;
  } while (cursor);
  return out;
}

async function allLists() {
  const d = await gql('query { viewer { lists(first:100) { nodes { id name description } } } }');
  const lists = [];
  for (const l of d.viewer.lists.nodes) {
    const items = [];
    let cursor = null;
    do {
      const p = await gql(`query($id:ID!, $c:String){ node(id:$id) { ... on UserList { items(first:100, after:$c) { pageInfo { hasNextPage endCursor } nodes { ... on Repository { ${REPO} } } } } } }`, { id: l.id, c: cursor });
      const it = p.node.items;
      items.push(...it.nodes.filter((n) => n?.url).map(repoEntry));
      cursor = it.pageInfo.hasNextPage ? it.pageInfo.endCursor : null;
    } while (cursor);
    lists.push({ name: l.name, description: l.description, items });
  }
  return lists;
}

if (!TOKEN) { console.log('::notice::STARS_TOKEN secret not added yet – see RESEARCH/README.md. Skipping.'); process.exit(0); }

const stars = await allStars();
let lists = [];
try { lists = await allLists(); } catch (e) { console.log(`::warning::Star lists unavailable (${e.message}). Writing all stars to one file.`); }
const built = buildLists(stars, lists);

fs.mkdirSync(OUT, { recursive: true });
const keep = new Set(['index.md', 'inbox.md']);
for (const l of built) { fs.writeFileSync(new URL(l.file, OUT), renderList(l)); keep.add(l.file); }
fs.writeFileSync(new URL('index.md', OUT), renderIndex(built.map((l) => ({ name: l.name, file: l.file, count: l.entries.length }))));
// drop list files that no longer exist upstream (only ones we generated)
for (const f of fs.readdirSync(OUT)) if (!keep.has(f) && fs.readFileSync(new URL(f, OUT), 'utf8').startsWith(MARK)) fs.unlinkSync(new URL(f, OUT));
console.log(`Synced ${stars.length} stars into ${built.length} file(s): ${built.map((l) => slugify(l.name)).join(', ')}`);
