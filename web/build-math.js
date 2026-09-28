// Builder sandbox maths (roadmap PB.2). Pure functions, no DOM: used by builder.js in the browser and by
// tests/builder.test.mjs in Node. Everything reads the game-rules dataset (NXGame.load(), PB.1). Numbers EA has
// not published and managers have not entered yet fall back to PREVIEW values – the page says so clearly.
(() => {
  // Placeholder rules until the in-game values are entered (portal → Game rules → changed values).
  const PREVIEW = {
    apPerLevel: [20, 3], // index 0 = AP you start with at level 1, then AP gained per level (last value repeats)
    apCosts: [{ upTo: 70, cost: 1 }, { upTo: 80, cost: 2 }, { upTo: 90, cost: 3 }, { upTo: 99, cost: 4 }],
    base: { GK: { goalkeeping: 62, other: 40 }, DEF: { defending: 58, physical: 58, other: 50 }, MID: { passing: 58, dribbling: 56, other: 50 }, FWD: { shooting: 58, pace: 58, other: 50 }, outfieldGk: 12 },
  };

  const attrsOf = (g) => (g.attributeGroups || []).flatMap((grp) => grp.attributes.map((name) => ({ name, group: grp.id })));
  const archOf = (g, id) => (g.archetypes || []).find((a) => a.id === id) || (g.archetypes || [])[0];

  // What's real and what's a placeholder, per dataset.
  function status(g, arch) {
    return {
      ap: !!g.apPerLevel?.length,
      costs: !!g.apCosts?.length,
      base: !!(arch && Object.keys(arch.base || {}).length),
      get preview() { return !(this.ap && this.costs && this.base); },
    };
  }

  function baseOf(g, arch) {
    const real = arch?.base || {};
    const grp = arch?.group || 'MID';
    const p = PREVIEW.base[grp] || PREVIEW.base.MID;
    const out = {};
    for (const a of attrsOf(g)) {
      if (real[a.name] != null) out[a.name] = +real[a.name];
      else if (a.group === 'goalkeeping' && grp !== 'GK') out[a.name] = PREVIEW.base.outfieldGk;
      else out[a.name] = p[a.group] ?? p.other;
    }
    return out;
  }

  const capOf = (g) => Math.max(1, +g.levelCap?.value || 1);
  const maxAttr = (g) => { const c = g.apCosts?.length ? g.apCosts : PREVIEW.apCosts; return c[c.length - 1].upTo; };

  // Total AP available at a level: start value + one entry per level gained.
  function apAt(g, level) {
    const t = g.apPerLevel?.length ? g.apPerLevel : PREVIEW.apPerLevel;
    let sum = 0;
    for (let i = 0; i < level; i++) sum += +(t[Math.min(i, t.length - 1)] || 0);
    return sum;
  }

  // AP cost to raise an attribute from value v to v + 1 (tiers get dearer near the top).
  function stepCost(g, v) {
    const tiers = g.apCosts?.length ? g.apCosts : PREVIEW.apCosts;
    const t = tiers.find((x) => v + 1 <= x.upTo);
    return t ? +t.cost : Infinity;
  }
  function costOf(g, from, added) {
    let c = 0;
    for (let i = 0; i < added; i++) c += stepCost(g, from + i);
    return c;
  }

  // Free boosts from Masteries unlocked at this archetype level (EA notes, e.g. Finisher L10 +1 FIN/+1 COM).
  function masteryBonus(g, archId, level) {
    const out = {};
    for (const m of g.masteries || []) if (m.archetype === archId && level >= m.level) for (const [k, v] of Object.entries(m.bonus || {})) out[k] = (out[k] || 0) + v;
    return out;
  }

  // Full evaluation of a build: { arch, level, spent: {attr: points} } → values, AP used/left, face stats, OVR.
  function evaluate(g, b) {
    const arch = archOf(g, b.arch);
    const level = Math.min(capOf(g), Math.max(1, b.level | 0));
    const base = baseOf(g, arch);
    const bonus = masteryBonus(g, arch?.id, level);
    const top = maxAttr(g);
    const rows = attrsOf(g).map((a) => {
      const add = Math.max(0, b.spent?.[a.name] | 0);
      const bon = bonus[a.name] || 0;
      return { ...a, base: base[a.name], add, bonus: bon, value: Math.min(top, base[a.name] + add + bon), cost: costOf(g, base[a.name], add), sig: (arch?.signature || []).includes(a.name) };
    });
    const total = apAt(g, level);
    const used = rows.reduce((s, r) => s + r.cost, 0);
    const byGroup = {};
    for (const r of rows) (byGroup[r.group] ||= []).push(r.value);
    const avg = (k) => (byGroup[k]?.length ? Math.round(byGroup[k].reduce((s, v) => s + v, 0) / byGroup[k].length) : 0);
    const val = (n) => rows.find((r) => r.name === n)?.value ?? 0;
    const face = arch?.group === 'GK'
      ? [['DIV', val('GK Diving')], ['HAN', val('GK Handling')], ['KIC', val('GK Kicking')], ['REF', val('GK Reflexes')], ['SPD', avg('pace')], ['POS', val('GK Positioning')]]
      : [['PAC', avg('pace')], ['SHO', avg('shooting')], ['PAS', avg('passing')], ['DRI', avg('dribbling')], ['DEF', avg('defending')], ['PHY', avg('physical')]];
    const W = { GK: { goalkeeping: 0.9, physical: 0.1 }, DEF: { defending: 0.45, physical: 0.2, pace: 0.15, passing: 0.2 }, MID: { passing: 0.35, dribbling: 0.3, shooting: 0.15, defending: 0.1, physical: 0.1 }, FWD: { shooting: 0.45, dribbling: 0.25, pace: 0.2, physical: 0.1 } }[arch?.group || 'MID'];
    const ovr = Math.round(Object.entries(W).reduce((s, [k, w]) => s + avg(k) * w, 0));
    return { arch, level, cap: capOf(g), rows, total, used, left: total - used, face, ovr, top, status: status(g, arch) };
  }

  // Can one more point go into this attribute? Returns the AP cost or null (at max / not enough AP).
  function canAdd(g, ev, name) {
    const r = ev.rows.find((x) => x.name === name);
    if (!r || r.value >= ev.top) return null;
    const c = stepCost(g, r.base + r.add);
    return c <= ev.left ? c : null;
  }

  // Lowering the level can leave the build over budget: take points back from the dearest end until it fits.
  function fit(g, b) {
    const spent = { ...b.spent };
    let ev = evaluate(g, { ...b, spent });
    while (ev.left < 0) {
      const r = ev.rows.filter((x) => x.add > 0).sort((x, y) => stepCost(g, y.base + y.add - 1) - stepCost(g, x.base + x.add - 1))[0];
      if (!r) break;
      spent[r.name] = r.add - 1;
      if (!spent[r.name]) delete spent[r.name];
      ev = evaluate(g, { ...b, spent });
    }
    return { ...b, spent };
  }

  // Share links: #a=<archetype>&l=<level>&p=<attrIndex>x<points>.…&v=<dataset version>
  function encode(g, b) {
    const list = attrsOf(g);
    const p = list.map((a, i) => (b.spent?.[a.name] ? `${i.toString(36)}x${b.spent[a.name]}` : '')).filter(Boolean).join('.');
    const q = new URLSearchParams({ a: b.arch, l: String(b.level) });
    if (p) q.set('p', p);
    q.set('v', g.version || '');
    return q.toString();
  }
  function decode(g, str) {
    const q = new URLSearchParams(String(str || '').replace(/^#/, ''));
    const arch = archOf(g, q.get('a'));
    if (!arch || !q.get('a')) return null;
    const list = attrsOf(g);
    const spent = {};
    for (const part of (q.get('p') || '').split('.')) {
      const m = part.match(/^([0-9a-z]+)x(\d{1,3})$/);
      const a = m && list[parseInt(m[1], 36)];
      if (a) spent[a.name] = +m[2];
    }
    const level = Math.min(capOf(g), Math.max(1, parseInt(q.get('l'), 10) || capOf(g)));
    return { ...fit(g, { arch: arch.id, level, spent }), version: q.get('v') || null };
  }

  const api = { PREVIEW, attrsOf, archOf, status, baseOf, capOf, apAt, stepCost, costOf, masteryBonus, evaluate, canAdd, fit, encode, decode };
  globalThis.NXBuildMath = api;
})();
