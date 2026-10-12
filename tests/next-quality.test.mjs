// Phase E: the new design (/next/) keeps its accessibility and weight basics – checked on a fresh preview build.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT } from './mock.mjs';
import { t, done } from './lib.mjs';
import { audit } from '../next/tools/static-audit.mjs';

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'nxq-'));
execFileSync(process.execPath, ['next/build.mjs', '--out', out, '--preview'], { cwd: ROOT, stdio: 'pipe' });
const a = audit(out);
const bad = (k) => a.issues[k]?.e.join(', ') || '';

t('a11y: every page has lang, title, main, skip link and one h1', !['no lang', 'no title', 'no main landmark', 'no skip link', 'no h1', 'several h1'].some((k) => a.issues[k]), JSON.stringify(a.issues));
t('a11y: pinch-zoom is never blocked', !a.issues['pinch-zoom blocked'], bad('pinch-zoom blocked'));
t('a11y: images have alt text, buttons/links/fields have names', !['img without alt', 'button without a name', 'link without a name', 'form field without a label'].some((k) => a.issues[k]), JSON.stringify(a.issues));
t('a11y: no clickable divs without a role, no positive tabindex, no duplicate ids', !['click handler on a non-button', 'positive tabindex', 'duplicate ids'].some((k) => a.issues[k]), JSON.stringify(a.issues));
t('a11y: theme text colours reach WCAG AA (4.5:1)', a.lowContrast.length === 0, JSON.stringify(a.lowContrast));
const css = fs.readFileSync(path.join(out, 'style.css'), 'utf8');
t('a11y: skip link shows on focus; reduced motion has a global safety net', /\.skip:focus\{left/.test(css) && /prefers-reduced-motion:reduce\)\{\*,\*::before/.test(css));
t('perf: logos use the small crest, not the 180 KB original', a.bigCrestPages === 0 && fs.statSync(path.join(out, 'crest-sm.png')).size < 60000);
t('perf: average page stays light (html < 60 KB, scripts < 300 KB)', a.weight.avgHtmlKB < 60 && a.weight.avgJsKB < 300, JSON.stringify(a.weight));
done();
