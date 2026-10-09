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
    const portrait = await image(portraitUrl); fit(c,portrait,110,208,380,390);
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
