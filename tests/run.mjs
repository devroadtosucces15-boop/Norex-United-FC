// Fast test harness (roadmap P0.7) – zero dependencies, run before every commit and on every push (test.yml).
//   node tests/run.mjs            syntax check → site build → every tests/*.test.mjs (in parallel)
//   node tests/run.mjs rush bot   only test files whose name contains one of the words
//   node tests/run.mjs --no-build skip the site build (uses the existing site/)
// New features add their checks to a *.test.mjs file here instead of manual clicking.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const only = args.filter((a) => !a.startsWith('--'));
const CI = !!process.env.GITHUB_ACTIONS;
const started = Date.now();
const failures = [];

const run = (file, cmdArgs = []) => new Promise((resolve) => {
  const p = spawn(process.execPath, [file, ...cmdArgs], { cwd: ROOT, env: { ...process.env, NO_LISTEN: '1' } });
  let out = '';
  p.stdout.on('data', (d) => (out += d));
  p.stderr.on('data', (d) => (out += d));
  p.on('close', (code) => resolve({ code, out }));
});
const fail = (where, msg) => {
  failures.push(`${where}: ${msg}`);
  if (CI) console.log(`::error file=${where},title=Test failed::${msg.replace(/\n/g, '%0A')}`);
};

// 1. Syntax check every JS file we ship
const skip = /^(node_modules|site|\.git|\.claude)$/;
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((f) => (skip.test(f.name) ? [] : f.isDirectory() ? walk(path.join(d, f.name)) : /\.m?js$/.test(f.name) ? [path.join(d, f.name)] : []));
const js = walk(ROOT);
const checks = await Promise.all(js.map((f) => run('--check', [f]).then((r) => ({ f: path.relative(ROOT, f), ...r }))));
for (const c of checks) if (c.code) fail(c.f, c.out.trim().split('\n').slice(0, 5).join('\n'));
console.log(`${checks.some((c) => c.code) ? '✘' : '✔'} syntax  ${js.length} files`);

// 2. Build the site (the tests read site/api/*.json)
if (!args.includes('--no-build')) {
  const t0 = Date.now();
  const b = await run('scripts/build.mjs');
  if (b.code) fail('scripts/build.mjs', b.out.trim().split('\n').slice(-8).join('\n'));
  console.log(`${b.code ? '✘' : '✔'} build   ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

// 3. Test files, each in its own process (fresh in-memory D1/KV)
if (!failures.some((f) => f.startsWith('scripts/build.mjs'))) {
  const tests = fs.readdirSync(ROOT + 'tests').filter((f) => f.endsWith('.test.mjs') && (!only.length || only.some((w) => f.includes(w)))).sort();
  const results = await Promise.all(tests.map((f) => run(`tests/${f}`).then((r) => ({ f, ...r }))));
  for (const { f, code, out } of results) {
    const lines = out.trim().split('\n');
    const bad = lines.filter((l) => l.startsWith('✘'));
    const summary = lines.findLast((l) => /passed, \d+ failed/.test(l)) ?? 'crashed';
    console.log(`${code ? '✘' : '✔'} ${f.replace('.test.mjs', '').padEnd(8)}${summary}`);
    if (code) {
      if (bad.length) bad.forEach((l) => { console.log('    ' + l); fail(`tests/${f}`, l.slice(2)); });
      else { console.log(out.split('\n').slice(-15).map((l) => '    ' + l).join('\n')); fail(`tests/${f}`, out.trim().split('\n').slice(-6).join('\n')); }
    }
  }
}

console.log(`\n${failures.length ? `✘ ${failures.length} problem(s)` : '✔ all green'} in ${((Date.now() - started) / 1000).toFixed(1)} s`);
process.exit(failures.length ? 1 : 0);
