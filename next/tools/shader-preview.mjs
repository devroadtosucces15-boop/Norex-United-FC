// PREVIEW ONLY. Makes <out>/shader-preview.html from the built home page with a WebGPU "Shaders" (MIT, shader-effects-inc/shaders) hero background.
// Not part of next/build.mjs, so nothing changes on the real site. usage: node next/tools/shader-preview.mjs [--out next/dist]  (run next/build.mjs first)
import fs from 'node:fs'; import path from 'node:path';
const i = process.argv.indexOf('--out'); const out = path.resolve(i > -1 ? process.argv[i + 1] : 'next/dist');
const src = path.join(out, 'index.html'); if (!fs.existsSync(src)) { console.error('build first: node next/build.mjs'); process.exit(1); }
let h = fs.readFileSync(src, 'utf8');
const css = `<style>
.sx-bg{position:absolute;left:0;right:0;top:0;height:820px;z-index:0;pointer-events:none;overflow:hidden;background:radial-gradient(120% 90% at 50% 0,#3a1620 0,#0d1220 55%,transparent 100%);-webkit-mask-image:linear-gradient(#000 60%,transparent);mask-image:linear-gradient(#000 60%,transparent)}
.sx-bg canvas{width:100%;height:100%;display:block;opacity:0;transition:opacity 1.2s}.sx-bg.on canvas{opacity:1}
main#main{position:relative}main#main>.wrap{position:relative;z-index:1}
.sx-tag{position:fixed;right:12px;bottom:12px;z-index:9;font:600 11px Inter;letter-spacing:.08em;text-transform:uppercase;padding:6px 10px;border-radius:999px;background:#000a;color:#efcf7a;border:1px solid #efcf7a66}
</style>`;
const js = `<script type="module">
const bg = document.querySelector('.sx-bg'), tag = document.querySelector('.sx-tag');
const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches || /[?&]still/.test(location.search);
// Fallback: no WebGPU or reduced motion keeps the CSS gradient already on .sx-bg
if (navigator.gpu && !reduce) try {
  const { createShader } = await import('https://cdn.jsdelivr.net/npm/shaders@4.0.4/dist/js/bundle.js');
  const c = document.createElement('canvas'); c.style.cssText = 'width:100%;height:100%'; bg.prepend(c);
  await createShader(c, { components: [
    { type: 'SolidColor', props: { color: '#080b11' } },
    { type: 'Aurora', props: { colorA: '#c8352c', colorB: '#efcf7a', colorC: '#1d3a8f', intensity: 100, speed: 3, curtainCount: 3, height: 140, blendMode: 'screen' } },
    { type: 'Vignette', props: { intensity: 0.6 } },
    { type: 'FilmGrain', props: { strength: 0.12 } } ] }, { disableTelemetry: true });
  bg.classList.add('on'); tag.textContent = 'Shader preview · WebGPU';
} catch (e) { console.warn('shader preview fallback', e); tag.textContent = 'Shader preview · fallback'; }
else tag.textContent = 'Shader preview · fallback (no WebGPU)';
</script>`;
h = h.replace('</head>', css + '</head>').replace('<main id="main">', '<main id="main"><div class="sx-bg" aria-hidden="true"></div>').replace('</body>', '<div class="sx-tag">Shader preview</div>' + js + '</body>').replace('<title>', '<meta name="robots" content="noindex"><title>');
fs.writeFileSync(path.join(out, 'shader-preview.html'), h); console.log('wrote', path.join(out, 'shader-preview.html'));
