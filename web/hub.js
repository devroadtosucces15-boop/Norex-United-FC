// BE8 Club Hub: live roster over HUB_ROOM WebSocket + server-authoritative wave fallback.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const API = document.body.dataset.api || '';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
  const session = () => { try { const t=localStorage.getItem('norex_session'); const p=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(t.split('.')[0].replace(/-/g,'+').replace(/_/g,'/')),(c)=>c.charCodeAt(0)))); return p.exp>Date.now()/1000?{token:t,...p}:null; } catch { return null; } };
  const call = async (path, body) => { const s=session(); const r=await fetch(API+path,{method:body?'POST':'GET',cache:'no-store',headers:{...(s?{Authorization:`Bearer ${s.token}`}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined}); const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.error||`Error ${r.status}`); return d; };
  const loginUrl=()=>`${API}/auth/login?return=${encodeURIComponent(location.href)}`;
  let root, me, socket, roster=new Map(), siteOnline=0, canWave=false, retry=0, closed=false;
  const avatar=(u)=>UI.avatar?.(u.a,u.n,48)||`<span class="hub-av">${esc((u.n||'?')[0])}</span>`;
  function render(){
    const people=[...roster.values()].sort((a,b)=>(a.u===me?.u?-1:b.u===me?.u?1:String(a.n).localeCompare(String(b.n))));
    root.innerHTML=`<section class="hub-hero card"><div><p class="kicker">LIVE CLUBHOUSE</p><h2>${people.length} in the Hub</h2><p class="muted">${siteOnline} member${siteOnline===1?'':'s'} active across the site right now.</p></div><span class="hub-live"><i></i> Live</span></section>
<div class="hub-roster">${people.length?people.map((u)=>`<article class="hub-person card">${avatar(u)}<div><b>${esc(u.n||'Member')}</b><small>${u.u===me?.u?'You · in the Hub':'In the Hub now'}</small></div>${u.u!==me?.u&&canWave?`<button class="btn sm ghost" type="button" data-wave="${esc(u.u)}">👋 Wave</button>`:''}</article>`).join(''):UI.empty({icon:'🏠',title:'The room is quiet',text:'Keep this page open and teammates will appear here when they enter.'})}</div>
<p class="muted small hub-note">Presence here is temporary: leaving this page removes you from the room. Waves are rate-limited by the server.</p>`;
  }
  function wsUrl(){
    const base=API||location.origin; const u=new URL(base,location.href); u.protocol=u.protocol==='https:'?'wss:':'ws:'; u.pathname=u.pathname.replace(/\/$/,'')+'/api/hub/ws'; u.searchParams.set('t',me.token); return u.toString();
  }
  function connect(){
    if(closed) return;
    try { socket=new WebSocket(wsUrl()); } catch { return schedule(); }
    socket.onopen=()=>{ retry=0; roster.set(me.u,{u:me.u,n:me.n||'You',a:me.a||null}); render(); };
    socket.onmessage=(e)=>{ let m; try{m=JSON.parse(e.data)}catch{return} if(m.t==='roster'){roster=new Map((m.who||[]).map(u=>[u.u,u])); roster.set(me.u,{u:me.u,n:me.n||'You',a:me.a||null}); render();} if(m.t==='here'&&m.who?.u){roster.set(m.who.u,m.who);render();} if(m.t==='gone'){roster.delete(m.u);render();} if(m.t==='wave'){UI.toast(`${m.from?.n||'A teammate'} waved at you 👋`,'info');} };
    socket.onclose=()=>{ roster.delete(me.u); render(); schedule(); };
    socket.onerror=()=>socket.close();
  }
  function schedule(){ if(closed) return; clearTimeout(retry); retry=setTimeout(connect,3000); }
  async function init(){
    root=$('[data-club-hub]'); if(!root)return; me=session();
    if(!me){root.innerHTML=UI.empty({icon:'🔒',title:'Log in to enter the Hub',action:`<a class="btn sm" href="${loginUrl()}">Log in with Discord</a>`});return;}
    root.innerHTML=UI.skeleton('cards',3);
    try{const d=await call('/api/hub');siteOnline=Number(d.online)||0;canWave=!!d.canWave;roster.set(me.u,{u:me.u,n:me.n||'You',a:me.a||null});render();connect();}catch(e){root.innerHTML=UI.empty({icon:'⚠️',title:'Could not enter the Hub',text:e.message});return;}
    root.addEventListener('click',async(e)=>{const b=e.target.closest('[data-wave]');if(!b)return;b.disabled=true;try{const r=await call('/api/hub/wave',{to:b.dataset.wave});UI.toast(r.delivered?'Wave delivered live 👋':'Wave sent — they’ll see it when they’re back.','ok');}catch(x){UI.toast(x.message,'bad');}finally{b.disabled=false;}});
  }
  addEventListener('beforeunload',()=>{closed=true;socket?.close();});
  document.addEventListener('DOMContentLoaded',init);
})();
