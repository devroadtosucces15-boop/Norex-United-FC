// AI club card (roadmap P11.5, web half). The Discord side (`/avatarcard <image>`, bot/avatarcard.js) generates an
// AI background + stores the member's photo in R2 and replies with both links; this renders the two together as
// one card and offers a "Download PNG" (same canvas-compositing technique as the match result poster in app.js).
//   NXAvatarCard.tab(el, ctx)   Squad Hub → 🎨 AI Card
// ctx = { call, toast, me: { u, n, a } }
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const BASE = document.body.dataset.base || '';
  const MAPI = document.body.dataset.api || '';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  if (!$('link[href$="avatarcard.css"]')) document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${BASE}assets/avatarcard.css` }));
  const mediaUrl = (key) => `${MAPI}/media/${key}`;

  async function download(card, name) {
    const W = 1080, H = 1350;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const red = getComputedStyle(document.documentElement).getPropertyValue('--red').trim() || '#c8352c';
    await document.fonts?.ready;
    const loadImg = async (src, cross = true) => {
      const img = new Image();
      if (cross) img.crossOrigin = 'anonymous';
      img.src = src;
      await img.decode().catch(() => {});
      return img.naturalWidth ? img : null;
    };
    const [bg, photo, crest] = await Promise.all([loadImg(mediaUrl(card.bgKey)), loadImg(mediaUrl(card.photoKey)), loadImg(`${BASE}assets/crest.png`, false)]);
    const cover = (img, w, h) => { const s = Math.max(w / img.naturalWidth, h / img.naturalHeight); const iw = img.naturalWidth * s, ih = img.naturalHeight * s; return [(w - iw) / 2, (h - ih) / 2, iw, ih]; };
    g.fillStyle = '#0b0f16'; g.fillRect(0, 0, W, H);
    if (bg) g.drawImage(bg, ...cover(bg, W, H));
    g.save(); g.globalAlpha = 0.35; const grd = g.createLinearGradient(0, H * 0.55, 0, H); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, '#000'); g.fillStyle = grd; g.fillRect(0, 0, W, H); g.restore();
    if (photo) {
      const size = 640, cx = W / 2, cy = H * 0.42;
      g.save(); g.beginPath(); g.arc(cx, cy, size / 2, 0, Math.PI * 2); g.closePath(); g.clip();
      const [px, py, pw, ph] = cover(photo, size, size);
      g.drawImage(photo, cx - size / 2 + px, cy - size / 2 + py, pw, ph);
      g.restore();
      g.beginPath(); g.arc(cx, cy, size / 2, 0, Math.PI * 2); g.lineWidth = 10; g.strokeStyle = red; g.stroke();
    }
    if (crest) { const h = 92, w = (crest.naturalWidth / crest.naturalHeight) * h; g.drawImage(crest, W / 2 - w / 2, 56, w, h); }
    g.textAlign = 'center'; g.fillStyle = '#fff';
    g.font = '700 54px Oswald, Impact, sans-serif';
    g.fillText(name.toUpperCase(), W / 2, H * 0.42 + 640 / 2 + 80);
    g.fillStyle = '#f5d061'; g.font = '600 30px Oswald, Impact, sans-serif'; g.letterSpacing = '10px';
    g.fillText('★ ★ ★ ★ ★', W / 2, H * 0.42 + 640 / 2 + 128);
    g.letterSpacing = '0px';
    g.fillStyle = red; g.fillRect(0, H - 14, W, 14);
    const a = document.createElement('a');
    a.download = `${name}-norex-card.png`.replace(/[^\w.-]+/g, '_');
    a.href = c.toDataURL('image/png');
    a.click();
  }

  function tab(el, ctx) {
    el.innerHTML = '<div class="card"><p class="muted">Loading your card…</p></div>';
    ctx.call('/api/avatarcard').then(({ card }) => {
      if (!card) {
        el.innerHTML = `<div class="card avc-empty"><h3>🎨 AI club card</h3>
<p class="muted">Upload a photo in Discord with <code>/avatarcard</code> and the bot generates a club-style AI
background for you. Come back here afterwards to see it, download it, and (if you like) set it as your Discord
avatar yourself – Discord doesn't let bots do that part.</p></div>`;
        return;
      }
      el.innerHTML = `<div class="card avc-wrap"><h3>🎨 Your AI club card</h3>
<div class="avc-card" style="background-image:url('${esc(mediaUrl(card.bgKey))}')">
<img class="avc-photo" src="${esc(mediaUrl(card.photoKey))}" alt="">
<img class="avc-crest" src="${BASE}assets/crest.png" alt="">
<div class="avc-name">${esc(ctx.me.n)}</div>
<div class="avc-stars" aria-hidden="true">★★★★★</div></div>
<div class="avc-actions"><button type="button" class="btn" id="avc-dl">⬇ Download PNG</button>
<small class="muted">Want a new one? Run <code>/avatarcard</code> again in Discord.</small></div></div>`;
      $('#avc-dl', el).onclick = async (e) => {
        e.target.disabled = true; e.target.textContent = 'Building…';
        try { await download(card, ctx.me.n); } catch { ctx.toast('Could not build the download – try again', true); }
        e.target.disabled = false; e.target.textContent = '⬇ Download PNG';
      };
    }).catch((e) => { el.innerHTML = `<div class="card"><p>⚠️ ${esc(e.message)}</p></div>`; });
  }

  window.NXAvatarCard = { tab };
})();
