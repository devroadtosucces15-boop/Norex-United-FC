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
  // Crop to visible subject bounds before fitting, keeping head and shoulders intact.
  async function prepare(src, kitNumber) {
    const raw = await image(src), cut = isolate(raw);
    const cv = document.createElement('canvas'); cv.width = cut.width; cv.height = cut.height;
    const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(cut, 0, 0);
    const a = g.getImageData(0, 0, cv.width, cv.height).data;
    let left = cv.width, top = cv.height, right = 0, bottom = 0;
    for (let y=0; y<cv.height; y++) for (let x=0; x<cv.width; x++) if (a[(y*cv.width+x)*4+3]>24) {
      left=Math.min(left,x); top=Math.min(top,y); right=Math.max(right,x); bottom=Math.max(bottom,y);
    }
    const out = document.createElement('canvas');
    out.width = Math.max(1,right-left+1); out.height = Math.max(1,bottom-top+1);
    const c = out.getContext('2d'); c.drawImage(cv,left,top,out.width,out.height,0,0,out.width,out.height);
    if (kitNumber != null && kitNumber !== '' && Number.isInteger(Number(kitNumber)) && Number(kitNumber)>=0 && Number(kitNumber)<=99) {
      c.textAlign='center'; c.textBaseline='middle'; c.font=`700 ${Math.round(out.height*.085)}px Oswald, Impact, sans-serif`;
      c.lineWidth=Math.max(2,out.height*.005); c.strokeStyle='#16191d'; c.fillStyle='#fff';
      c.strokeText(String(Number(kitNumber)),out.width*.5,out.height*.82);
      c.fillText(String(Number(kitNumber)),out.width*.5,out.height*.82);
    }
    return out;
  }
  function fit(ctx, img, x, y, w, h) {
    const ratio = Math.min(w / img.width, h / img.height);
    const iw = img.width * ratio, ih = img.height * ratio;
    ctx.drawImage(img, x + (w-iw)/2, y+h-ih, iw, ih);
  }
  async function draw(canvas, portraitUrl, player, crestUrl, options = {}) {
    await document.fonts?.ready;
    canvas.width = WIDTH; canvas.height = HEIGHT;
    const c = canvas.getContext('2d');
    // Read the site's canonical tier tokens; never introduce a second card theme.
    const tier = player?.ovr>=88?'icon':player?.ovr>=80?'gold':player?.ovr>=70?'silver':player?.ovr>0?'bronze':'plain';
    const probe = Object.assign(document.createElement('span'), {className:'tier-'+tier});
    probe.hidden=true; document.body.append(probe);
    const styles = getComputedStyle(probe), token = k => styles.getPropertyValue(k).trim();
    const t1=token('--t1'), t2=token('--t2'), tx=token('--tx'), edge=token('--edge'); probe.remove();
    const gradient = c.createLinearGradient(0,0,WIDTH*.34,HEIGHT); gradient.addColorStop(0,t1); gradient.addColorStop(1,t2);
    c.beginPath(); [[0,.04],[.08,0],[.92,0],[1,.04],[1,.88],[.5,1],[0,.88]].forEach(([x,y],i)=>c[i?'lineTo':'moveTo'](x*WIDTH,y*HEIGHT)); c.closePath();
    c.fillStyle=gradient; c.fill(); c.strokeStyle=edge; c.lineWidth=4; c.stroke(); c.save(); c.clip();
    c.strokeStyle='rgba(255,255,255,.05)'; c.lineWidth=2;
    for(let x=-HEIGHT;x<WIDTH+HEIGHT;x+=28){ c.beginPath(); c.moveTo(x,HEIGHT); c.lineTo(x+HEIGHT*.47,0); c.stroke(); }
    c.restore();
    c.fillStyle = tx;
    c.font = '700 98px Oswald, Impact, sans-serif'; c.fillText(safe(player?.ovr),48,127);
    c.font = '600 42px Oswald, Impact, sans-serif'; c.fillText(safe(player?.pos),50,177);
    try { const crest = await image(crestUrl); const h=75; c.drawImage(crest,WIDTH-48-h*crest.width/crest.height,65,h*crest.width/crest.height,h); } catch {}
    c.save(); c.beginPath(); c.rect(48,186,504,362); c.clip();
    const portrait = options.prepared ? await image(portraitUrl) : await prepare(portraitUrl,options.kitNumber);
    fit(c,portrait,48,186,504,362); c.restore();
    c.fillStyle = tx; c.textAlign = 'center'; c.font = '700 43px Oswald, Impact, sans-serif';
    const name = safe(player?.n,'NOREX PLAYER').toUpperCase().slice(0,24);
    let size = 43; while (c.measureText(name).width > 475 && size > 19) { c.font = 'bold ' + (--size) + 'px Oswald, Impact, sans-serif'; }
    c.fillText(name.toUpperCase(),300,598);
    const stats = [[safe(player?.s?.g),'GLS'],[safe(player?.s?.a),'AST'],[player?.s?.r ? Number(player.s.r).toFixed(1) : '—','RAT'],[player?.s?.p == null ? '—' : player.s.p+'%','PAS'],[player?.s?.t == null ? '—' : player.s.t+'%','TKL'],[safe(player?.s?.gp),'GP']];
    stats.forEach(([value,label],i) => {
      const x = 150+(i%3)*150, y = 662+Math.floor(i/3)*83;
      c.font = '700 45px Oswald, Impact, sans-serif'; c.fillText(value,x,y);
      c.font = '500 23px Oswald, Impact, sans-serif'; c.fillText(label,x,y+28);
    });
    c.font = 'bold 19px system-ui'; c.fillText('NOREX UNITED FC',300,798);
    return canvas;
  }
  window.NXCardComposer = { draw, prepare, getPlayer, WIDTH, HEIGHT };
})();
