// Light copy of the redesign. usage: node next/build-light.mjs   → next/dist/light/ (served at /light/ by next/serve.mjs)
// Runs the normal build into dist/light, then adds light.css after every stylesheet. Nothing in the dark site changes.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { execFileSync } from 'node:child_process';
const here = path.dirname(fileURLToPath(import.meta.url)), out = path.join(here, 'dist', 'light');
execFileSync(process.execPath, [path.join(here, 'build.mjs'), '--out', out], { stdio: 'inherit' });
fs.copyFileSync(path.join(here, 'light.css'), path.join(out, 'light.css'));
let n = 0;
for (const f of fs.readdirSync(out).filter((f) => f.endsWith('.html'))) {
  const p = path.join(out, f), h = fs.readFileSync(p, 'utf8');
  if (!h.includes('</head>')) continue;
  fs.writeFileSync(p, h.replace('</head>', '<link rel="stylesheet" href="light.css"></head>')); n++;
}
console.log(`light copy: ${n} pages → ${out} (open /light/index.html)`);
