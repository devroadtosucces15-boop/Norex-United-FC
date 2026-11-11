async (page) => {
  const fs = await import('node:fs');
  const D = '/tmp/claude-1000/-home-mrsuccess-NOREX-UNITED/3c412429-c0ba-4bfd-bfe5-e2b5ae836b73/scratchpad/';
  const jobs = JSON.parse(fs.readFileSync(D + 'jobs.json', 'utf8'));
  await page.setViewportSize({ width: 430, height: 932 });
  const ctx = page.context();
  const res = {}; let cur = null;
  for (const j of jobs) {
    try {
      if (j.role !== cur) { cur = j.role; await ctx.clearCookies();
        if (j.role !== 'guest') { await page.goto('http://localhost:8795/__mock?' + (j.role === 'owner' ? 'id=111&name=Boss' : 'id=222&name=Mike')); await page.goto('http://localhost:8795/auth/login?return=' + encodeURIComponent('http://localhost:8795/index.html')); await page.waitForTimeout(1500); } }
      await page.goto('http://localhost:8795/' + j.url, { waitUntil: 'load' }); await page.waitForTimeout(j.wait || 2200);
      if (j.click) { await page.getByText(j.click, { exact: false }).first().click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(900); }
      const h = await page.evaluateHandle(({ text, up }) => {
        const all = [...document.querySelectorAll('body *')].filter(e => e.children.length < 4 && (e.textContent || '').trim().startsWith(text) && e.offsetParent !== null);
        let el = all[0]; if (!el) return null;
        if (up === 'self') return el;
        const ok = (n) => { const r = n.getBoundingClientRect(), s = getComputedStyle(n); const box = parseFloat(s.borderTopWidth) > 0 || s.boxShadow !== 'none' || (s.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(s.backgroundColor)) || s.backgroundImage !== 'none'; return r.width >= 280 && r.height >= 90 && box; };
        let n = el; for (let i = 0; i < 12 && n && n !== document.body; i++) { if (ok(n) && (up === undefined || i >= up)) return n; n = n.parentElement; }
        return el;
      }, { text: j.text, up: j.up });
      const el = h.asElement(); if (!el) { res[j.name] = 'NOTFOUND'; continue; }
      await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(500);
      const bb = await el.boundingBox();
      if (bb && bb.height > 1500) { await page.screenshot({ path: D + 'site/' + j.name + '.png', clip: { x: 0, y: Math.max(bb.y, 0), width: 430, height: Math.min(900, bb.height) }, fullPage: true }); res[j.name] = 'clip ' + Math.round(bb.height); }
      else { await el.screenshot({ path: D + 'site/' + j.name + '.png' }); res[j.name] = Math.round(bb.width) + 'x' + Math.round(bb.height); }
    } catch (e) { res[j.name] = 'ERR ' + e.message.slice(0, 70); }
  }
  return res;
}
