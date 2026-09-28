// Tiny assertion helper shared by the *.test.mjs files. Prints one line per check, exits 1 on any failure.
let pass = 0, fail = 0;
export function t(name, cond) {
  if (cond) pass++;
  else { fail++; process.exitCode = 1; }
  console.log(`${cond ? '✔' : '✘'} ${name}`);
}
// Checks that throw are failures too, not crashes.
export async function tt(name, fn) {
  try { t(name, await fn()); } catch (e) { t(`${name} – threw ${e.message}`, false); }
}
export function done() {
  console.log(`\n${pass} passed, ${fail} failed`);
}
