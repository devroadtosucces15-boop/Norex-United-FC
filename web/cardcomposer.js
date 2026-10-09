// Deterministic NOREX player-card compositor. Data is read fresh at render time.
(() => {
  const WIDTH = 600, HEIGHT = 840;
  const safe = (value, fallback = '—') => value == null || value === '' ? fallback : String(value);
  const getPlayer = (ctx) => {
    const claim = ctx.claim?.();
    return claim?.status === 'approved' ? ctx.players?.().find(p => p.k === claim.player) : null;
  };
  const image = (src) => new Promise((resolve, reject) => {
    const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src;
  });
  // Remove only light, border-connected backgrounds; never erase isolated light pixels inside the subject.
  function isolate(img) {
    const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth || img.width; canvas.height = img.naturalHeight || img.height;
    const c = canvas.getContext('2d', { willReadFrequently: true }); c.drawImage(img,0,0);
    const frame = c.getImageData(0,0,canvas.width,canvas.height), a = frame.data;
    const w = canvas.width, h = canvas.height, seen = new Uint8Array(w*h), queue = [];
    const light = (i) => { const k=i*4; return a[k]>224 && a[k+1]>224 && a[k+2]>224 && Math.max(a[k],a[k+1],a[k+2])-Math.min(a[k],a[k+1],a[k+2])<24; };
    const add = (i) => { if (!seen[i] && light(i)) { seen[i]=1; queue.push(i); } };
    for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}
    for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
    for(let n=0;n<queue.length;n++){const i=queue[n],x=i%w,y=(i/w)|0;if(x>0)add(i-1);if(x<w-1)add(i+1);if(y>0)add(i-w);if(y<h-1)add(i+w);}
    // Avoid destructive removal when the source background is not a near-white studio background.
    if(queue.length < w*h*.025 || queue.length > w*h*.85) return img;
    for(const i of queue) a[i*4+3]=0;
    c.putImageData(frame,0,0); return canvas;
  }
  function fit(ctx, img, x, y, w, h) {
    const ratio = Math.max(w / img.width, h / img.height);
    const iw = img.width * ratio, ih = img.height * ratio;
    ctx.drawImage(img, x + (w-iw)/2, y + (h-ih)/2, iw, ih);
  }
  async function draw(canvas, portraitUrl, player, crestUrl) {
    canvas.width = WIDTH; canvas.height = HEIGHT;
    const c = canvas.getContext('2d');
    const gold = c.createLinearGradient(0,0,WIDTH,HEIGHT);
    gold.addColorStop(0,'#ffe6a0'); gold.addColorStop(.55,'#d6b05a'); gold.addColorStop(1,'#b58b36');
    c.fillStyle = gold;
    c.beginPath();
    c.moveTo(52,18); c.lineTo(548,18); c.lineTo(584,52); c.lineTo(584,724); c.lineTo(300,828); c.lineTo(16,724); c.lineTo(16,52); c.closePath(); c.fill();
    c.strokeStyle = '#f9e5a7'; c.lineWidth = 5; c.stroke();
    c.fillStyle = '#302107';
    c.font = 'bold 98px system-ui'; c.fillText(safe(player?.ovr),70,153);
    c.font = 'bold 42px system-ui'; c.fillText(safe(player?.pos),78,203);
    try { const crest = await image(crestUrl); c.drawImage(crest,475,90,65,75); } catch {}
    c.save(); c.beginPath(); c.rect(110,208,380,390); c.clip();
    const portrait = isolate(await image(portraitUrl)); fit(c,portrait,110,208,380,390);
    c.restore();
    c.fillStyle = '#302107'; c.textAlign = 'center'; c.font = 'bold 43px system-ui';
    const name = safe(player?.n,'NOREX PLAYER').slice(0,24);
    let size = 43; while (c.measureText(name).width > 475 && size > 19) { c.font = 'bold ' + (--size) + 'px system-ui'; }
    c.fillText(name,300,654);
    const stats = [[safe(player?.s?.g),'GLS'],[safe(player?.s?.a),'AST'],[player?.s?.r ? Number(player.s.r).toFixed(1) : '—','RAT']];
    stats.forEach(([value,label],i) => {
      const x = 150+i*150;
      c.font = 'bold 45px system-ui'; c.fillText(value,x,724);
      c.font = '25px system-ui'; c.fillText(label,x,754);
    });
    c.font = 'bold 19px system-ui'; c.fillText('NOREX UNITED FC',300,798);
    return canvas;
  }
  window.NXCardComposer = { draw, getPlayer, WIDTH, HEIGHT };
})();
