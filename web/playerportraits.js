// One approved portrait source for static cards and cards mounted later by any submenu.
(() => {
  const api = document.body.dataset.api;
  if (!api) return;
  let portraits = {}, ready, revision=0;
  const cache = new Map(), original = new WeakMap();
  async function get(player) {
    await ready;
    const art = Object.hasOwn(portraits, player) ? portraits[player] : null; if (!art) return null;
    const key = `${art.id}:${art.kitNumber}`;
    if (!cache.has(key)) cache.set(key, (async () => {
      const r = await fetch(`${api}/api/cards/portraits?id=${art.id}`);
      if (!r.ok) throw new Error('Portrait unavailable');
      const src = URL.createObjectURL(await r.blob());
      try {
        const canvas = await NXCardComposer.prepare(src, art.kitNumber);
        const blob = await new Promise(ok => canvas.toBlob(ok,'image/png'));
        if (!blob) throw new Error('Portrait unavailable');
        return { url:URL.createObjectURL(blob), ...art };
      } finally { URL.revokeObjectURL(src); }
    })().catch(e => {cache.delete(key); throw e;}));
    return cache.get(key);
  }
  function hydrate(root=document) {
    const faces = [...root.querySelectorAll('[data-card-player]')];
    if (root.matches?.('[data-card-player]')) faces.push(root);
    faces.forEach(async face => {
      const marker = String(revision);
      if (face.dataset.portraitRevision === marker) return;
      face.dataset.portraitRevision=marker;
      if (!original.has(face)) original.set(face, face.innerHTML);
      try {
        const art = await get(face.dataset.cardPlayer);
        if (!face.isConnected || marker!==String(revision)) return;
        if (!art) {face.innerHTML=original.get(face); return;}
        const img = Object.assign(new Image(), {className:'nx-player-portrait', alt:'', src:art.url});
        await img.decode(); face.replaceChildren(img);
      } catch { delete face.dataset.portraitRevision; }
    });
  }
  function refresh() {
    ready = fetch(`${api}/api/cards/portraits`).then(r => r.ok?r.json():Promise.reject()).then(d => {
      portraits=d.portraits || {}; revision++;
    }).catch(()=>{});
    ready.then(()=>hydrate());
    return ready;
  }
  window.NXPlayerPortraits = { get, refresh, hydrate };
  new MutationObserver(records => records.forEach(r => r.addedNodes.forEach(n => {if(n.nodeType===1) hydrate(n);})))
    .observe(document.body,{childList:true,subtree:true});
  refresh();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden) refresh();});
})();
