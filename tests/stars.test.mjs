// Stars sync + link inbox: parsing and rendering (scripts/lib/stars.mjs). No network.
import { t, done } from './lib.mjs';
import { slugify, repoEntry, buildLists, renderList, renderIndex, extractLinks, githubRepoOf, summariseReadme, parseHtmlMeta, parseInbox, inboxLine, renderInbox, MARK } from '../scripts/lib/stars.mjs';

t('slugify handles spaces, symbols, empty', slugify('Pro Clubs / Tools!') === 'pro-clubs-tools' && slugify('???') === 'list');

const a = repoEntry({ nameWithOwner: 'o/a', url: 'https://github.com/o/a', description: 'Does | things\n', primaryLanguage: { name: 'JS' }, pushedAt: '2026-09-01T10:00:00Z', stargazerCount: 5 });
const b = repoEntry({ nameWithOwner: 'o/b', url: 'https://github.com/o/b', description: null, primaryLanguage: null, pushedAt: '2026-08-01T00:00:00Z' });
t('repoEntry cleans and trims', a.updated === '2026-09-01' && a.language === 'JS' && a.description === 'Does \\| things' && b.language === '' && b.stars === 0);

const built = buildLists([a, b], [{ name: 'Bots', description: 'x', items: [{ url: a.url }] }]);
t('buildLists puts unlisted stars in Unsorted', built.length === 2 && built[0].file === 'bots.md' && built[0].entries[0].name === 'o/a' && built[1].file === 'unsorted.md' && built[1].entries[0].name === 'o/b');
t('no Unsorted file when everything is listed', buildLists([a], [{ name: 'All', items: [{ url: a.url }] }]).length === 1);

const md = renderList(built[0]);
t('renderList has marker, heading, table row', md.startsWith(MARK) && md.includes('# Bots') && md.includes('| [o/a](https://github.com/o/a) |') && md.includes('1 repo\n'));
t('renderList is deterministic (no timestamps)', renderList(built[0]) === md);
t('renderIndex links every list', renderIndex([{ name: 'Bots', file: 'bots.md', count: 1 }]).includes('[Bots](bots.md) | 1'));

t('extractLinks finds, dedupes, trims punctuation', JSON.stringify(extractLinks('see https://a.com/x, and [y](https://b.org/p). https://a.com/x\nnot a link ftp://z')) === JSON.stringify(['https://a.com/x', 'https://b.org/p']));
t('extractLinks ignores empty input', extractLinks('').length === 0 && extractLinks(null).length === 0);
t('githubRepoOf', githubRepoOf('https://github.com/foo/bar/tree/main') === 'foo/bar' && githubRepoOf('https://github.com/foo') === null && githubRepoOf('https://example.com/a/b') === null);

const readme = '# Title\n\n[![CI](x.svg)](y)\n\n![logo](l.png)\n\nA **fast** tool for [Pro Clubs](https://x) stats that does lots of things.\n\n## Install\n';
t('summariseReadme skips headings/badges, strips markdown', summariseReadme(readme) === 'A fast tool for Pro Clubs stats that does lots of things.');
t('summariseReadme truncates long text', summariseReadme('word '.repeat(200), 50).length <= 50);
t('summariseReadme empty', summariseReadme('# only heading') === '');

const m = parseHtmlMeta('<title>Hi &amp; bye</title><meta name="description" content="A page about stuff">');
t('parseHtmlMeta title + description', m.title === 'Hi & bye' && m.description === 'A page about stuff');
t('parseHtmlMeta prefers og:title', parseHtmlMeta('<meta property="og:title" content="OG"><title>T</title>').title === 'OG');

const line = inboxLine({ url: 'https://x.io/', title: 'X', summary: 'Sum', added: '2026-10-15' });
t('inbox round trip: parseInbox sees filed links', parseInbox(renderInbox([line])).has('https://x.io/') && !parseInbox(renderInbox([line])).has('https://y.io/'));
t('inboxLine falls back to bare url', inboxLine({ url: 'https://x.io/', title: '', summary: '', added: 'd' }).startsWith('- [https://x.io/](https://x.io/)'));
done();
