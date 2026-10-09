(() => {
const $=id=>document.getElementById(id);
const key='norex-explorer-personal-v1';
let saved={favorites:[],notes:{},flags:[]};
try{saved={...saved,...JSON.parse(localStorage.getItem(key)||'{}')}}catch{}
const persist=()=>{try{localStorage.setItem(key,JSON.stringify(saved))}catch{}};
const css=document.createElement('style');css.textContent=`
#atlasTools{padding:9px 12px;background:#171f2b;border-bottom:1px solid #344153;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
#atlasTools select,#atlasTools button{width:auto;margin:0;padding:7px 10px}
#atlasOverview{position:absolute;inset:12px;overflow:auto;background:#121a25f5;border:1px solid #4c6077;border-radius:12px;padding:16px;z-index:3}
#atlasOverview[hidden],#atlasMenu[hidden]{display:none}
.scopeGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
.scopeCard{border:1px solid #42536a;border-radius:9px;padding:14px;background:#202c3a;cursor:pointer}
.scopeCard:hover{background:#304158}
#atlasMenu{position:fixed;z-index:50;background:#1d2836;border:1px solid #62748b;border-radius:9px;padding:6px;box-shadow:0 12px 35px #0009;min-width:220px}
#atlasMenu button{display:block;text-align:left;border:0;margin:0;background:transparent}
#atlasMenu button:hover{background:#34445a}
#personalPane{padding:12px;border-bottom:1px solid #334357}
#personalPane button{width:auto}
#personalPane .item{font-size:12px}
#atlasNotes{width:100%;min-height:65px;background:#152131;color:#e5e9f1;border:1px solid #50617a;border-radius:7px;padding:8px}
#atlasFlag{width:auto}
#atlasPreviewFrame{width:100%;height:240px;border:1px solid #53637a;background:white}
`;document.head.append(css);
const toolbar=document.createElement('div');toolbar.id='atlasTools';
toolbar.innerHTML='<strong>Architecture views</strong><select id="atlasLevel" aria-label="Architecture detail"><option value="0">1 · Main scope</option><option value="1">2 · Subsystems</option><option value="2">3 · Modules</option><option value="3">4 · Source detail</option></select><button id="atlasHome">Overview</button><span class="help">Right-click any node for options · bookmarks and notes stay in this browser</span>';
document.querySelector('header').after(toolbar);
const stage=$('stage'),overview=document.createElement('div');overview.id='atlasOverview';stage.append(overview);
const menu=document.createElement('div');menu.id='atlasMenu';menu.hidden=true;document.body.append(menu);
const personal=document.createElement('div');personal.id='personalPane';personal.innerHTML='<h2>★ Favorites & flags</h2><div id="atlasFavorites"></div><div id="atlasFlags"></div>';document.querySelector('aside').prepend(personal);
const inspector=$('inspector');const notes=document.createElement('div');notes.id='atlasAnnotation';notes.innerHTML='<h2>Personal annotations</h2><button id="atlasFav">☆ Favorite</button><label><input type="checkbox" id="atlasFlag"> Flag for follow-up</label><textarea id="atlasNotes" placeholder="Notes, reminders or TODOs (saved only in this browser)"></textarea><p class="help">These annotations never change project source files.</p>';inspector.insertBefore(notes,$('preview'));
let api=null,focus=null;
const clean=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function group(n){const p=n.path||'';return p.split('/')[0]||({ 'external-reference':'External references','api-reference':'API','table-reference':'Database'}[n.kind]||'Other')}
function select(id){if(api?.nodes.has(id)){api.choose(id);focus=id;syncNotes()}}
function showPersonal(){
 $('atlasFavorites').innerHTML=saved.favorites.filter(id=>api?.nodes.has(id)).map(id=>'<div class="item" data-personal="'+clean(id)+'">★ '+clean(api.nodes.get(id).label)+'</div>').join('')||'<p class="help">No favorites yet</p>';
 $('atlasFlags').innerHTML=saved.flags.filter(id=>api?.nodes.has(id)).map(id=>'<div class="item" data-personal="'+clean(id)+'">⚑ '+clean(api.nodes.get(id).label)+'</div>').join('')||'<p class="help">No flagged items</p>';
}
function syncNotes(){if(!focus)return;$('atlasNotes').value=saved.notes[focus]||'';$('atlasFlag').checked=saved.flags.includes(focus);$('atlasFav').textContent=saved.favorites.includes(focus)?'★ Remove favorite':'☆ Favorite'}
function toggle(which,id){if(!id)return;const list=saved[which];saved[which]=list.includes(id)?list.filter(x=>x!==id):[...list,id];persist();showPersonal();syncNotes()}
$('atlasFav').onclick=()=>toggle('favorites',focus);$('atlasFlag').onchange=()=>toggle('flags',focus);$('atlasNotes').oninput=()=>{if(!focus)return;saved.notes[focus]=$('atlasNotes').value;persist()};
personal.addEventListener('click',e=>{const id=e.target.closest('[data-personal]')?.dataset.personal;if(id){$('atlasLevel').value='3';render();select(id)}});
function render(){if(!api)return;const level=Number($('atlasLevel').value);overview.hidden=level===3;if(level===3)return;
const groups=new Map();
for(const n of api.nodes.values()){const k=group(n);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(n)}
const sections=[...groups.entries()].sort((a,b)=>b[1].length-a[1].length);
if(level===0){overview.innerHTML='<h2>System overview · major source areas</h2><p class="help">Static inventory counts, not confirmed runtime architecture. Choose an area to drill down.</p><div class="scopeGrid">'+sections.map(([k,v])=>'<div class="scopeCard" data-group="'+clean(k)+'"><strong>📦 '+clean(k)+'</strong><p>'+v.length.toLocaleString()+' indexed items</p></div>').join('')+'</div>'}
else {const term=$('query').value.toLowerCase();let entries=sections;if(level===1)entries=entries.slice(0,40);overview.innerHTML='<h2>'+(level===1?'Subsystems':'Modules and source groups')+'</h2><div class="scopeGrid">'+entries.map(([k,v])=>'<div class="scopeCard" data-group="'+clean(k)+'"><strong>📁 '+clean(k)+'</strong><p>'+v.length+' items</p>'+(level===2?'<small>'+v.slice(0,6).map(n=>clean(n.label)).join(' · ')+'</small>':'')+'</div>').join('')+'</div>'}
}
overview.addEventListener('click',e=>{const groupName=e.target.closest('[data-group]')?.dataset.group;if(!groupName)return;$('query').value=groupName==='Other'?'':groupName;$('query').dispatchEvent(new Event('input'));$('atlasLevel').value='3';render();const match=[...api.nodes.values()].find(n=>group(n)===groupName);if(match)select(match.id)});
$('atlasLevel').onchange=render;$('atlasHome').onclick=()=>{$('atlasLevel').value='0';render()};
document.addEventListener('contextmenu',e=>{if(!api)return;const node=e.target.closest('[data-id]');const id=node?.dataset.id||((e.target.closest('#details,#classification,#preview,#atlasAnnotation'))&&focus);if(!id||!api.nodes.has(id))return;e.preventDefault();menu.hidden=false;menu.style.left=Math.min(e.clientX,innerWidth-235)+'px';menu.style.top=Math.min(e.clientY,innerHeight-300)+'px';menu.innerHTML=[['inspect','🔎 Inspect'],['focus','◎ Focus diagram'],['branch','🌿 Show connected branch'],['upstream','↖ Incoming dependencies'],['downstream','↘ Outgoing dependencies'],['source','↗ Open source'],['favorite','★ Toggle favorite'],['flag','⚑ Toggle follow-up']].map(([action,title])=>'<button data-action="'+action+'>'+title+'</button>').join('');menu.dataset.id=id});
document.addEventListener('click',e=>{const action=e.target.closest('#atlasMenu [data-action]');if(!action){menu.hidden=true;return}const id=menu.dataset.id,n=api.nodes.get(id);menu.hidden=true;if(action.dataset.action==='favorite')return toggle('favorites',id);if(action.dataset.action==='flag')return toggle('flags',id);if(action.dataset.action==='source'){if(n.url)window.open(n.url,'_blank','noopener');return}
$('atlasLevel').value='3';render();select(id);
if(['branch','upstream','downstream'].includes(action.dataset.action)){const edges=api.adj.get(id)||[];const filtered=action.dataset.action==='upstream'?edges.filter(x=>x.direction==='in'):action.dataset.action==='downstream'?edges.filter(x=>x.direction==='out'):edges;api.draw(filtered);$('neighbors').innerHTML=filtered.slice(0,100).map(x=>{const v=api.nodes.get(x.other);return v?'<div class="item" data-id="'+clean(v.id)+'">'+clean(x.kind)+' → '+clean(v.label)+'</div>':''}).join('');$('neighbors').querySelectorAll('[data-id]').forEach(el=>el.onclick=()=>select(el.dataset.id))}});
window.addEventListener('norex-atlas-ready',e=>{api=e.detail;focus=api.selected()?.id||null;showPersonal();syncNotes();render();
const original=api.choose;api.choose=id=>{original(id);focus=id;syncNotes()};});
})();