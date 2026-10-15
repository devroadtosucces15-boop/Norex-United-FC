(()=>{
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const friendly=s=>String(s||'').split('/').pop().replace(/\.[^.]+$/,'').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[_-]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
const bytes=n=>n>=1048576?(n/1048576).toFixed(2)+' MiB':n>=1024?(n/1024).toFixed(1)+' KiB':n+' B';
const css=document.createElement('style');css.textContent='#fileAllocation{position:absolute;inset:0;overflow:auto;background:#101a27;z-index:9;padding:22px}#fileAllocation[hidden]{display:none}.allocationRow{width:100%;display:block;text-align:left;background:#23344a;color:white;border:1px solid #40516b;padding:12px;margin:8px 0;border-radius:9px}.allocationBar{height:12px;border-radius:9px;background:#41536b;overflow:hidden;margin:7px 0}.allocationFill{height:100%;background:#78a7e7}.allocationMeta{color:#b6c7db;font-size:12px}';document.head.append(css);
const pane=document.createElement('section');pane.id='fileAllocation';pane.hidden=true;$('stage').append(pane);
const btn=document.createElement('button');btn.textContent='📊 File allocation';$('atlasTools').append(btn);
let api,metric='count',type=null,folder=null;
const files=()=>[...api.nodes.values()].filter(n=>n.id.startsWith('file:')||n.kind==='local-file');
const ext=n=>{const name=(n.path||n.label||'').split('/').pop(),i=name.lastIndexOf('.');return i>0?name.slice(i+1).toUpperCase():'NO EXTENSION'};
const totals=arr=>({count:arr.length,size:arr.reduce((v,n)=>v+(Number.isFinite(n.bytes)?n.bytes:0),0),missing:arr.filter(n=>!Number.isFinite(n.bytes)).length});
function show(){if(!api)return;pane.hidden=false;$('learningCanvas').hidden=true;$('architecturePanel').hidden=true;const all=files(),filtered=all.filter(n=>(!type||ext(n)===type)&&(!folder||(n.path||'').startsWith(folder+'/'))),summary=totals(filtered),groups=new Map();
for(const n of filtered){const key=!type?ext(n):!folder?(n.path||'').split('/').slice(0,2).join('/'):'file:'+n.id;const list=groups.get(key)||[];list.push(n);groups.set(key,list)}
const rows=[...groups].map(([key,list])=>({key,list,...totals(list)})).sort((a,b)=>b[metric==='size'?'size':'count']-a[metric==='size'?'size':'count']);const denom=summary[metric]||1;
pane.innerHTML='<h2>File allocation · '+(type||'All file types')+'</h2><p class="allocationMeta">Based on indexed file metadata. Missing sizes are explicitly excluded from byte totals.</p><div><button id="allocationBack">← Back</button> <button id="allocationReset">⌂ All types</button> <button id="allocationCount">By file count</button> <button id="allocationSize">By bytes</button></div><h3>'+summary.count+' files · '+bytes(summary.size)+'</h3><p class="allocationMeta">'+summary.missing+' file(s) without size metadata · '+(metric==='count'?'Count':'Storage')+' distribution</p>'+rows.map((r,i)=>{const pct=r[metric]/denom*100;return '<button class="allocationRow" data-row="'+i+'" title="'+esc(friendly(r.key))+' — '+r.count+' files, '+bytes(r.size)+', '+pct.toFixed(1)+'% of current selection. '+r.missing+' unknown sizes."><strong>'+esc(friendly(r.key))+'</strong><div class="allocationMeta">'+esc(r.key)+' · '+r.count+' files · '+bytes(r.size)+' · '+pct.toFixed(1)+'%</div><div class="allocationBar"><div class="allocationFill" style="width:'+pct+'%"></div></div></button>'}).join('');
$('allocationBack').onclick=()=>{if(folder)folder=null;else type=null;show()};$('allocationReset').onclick=()=>{type=null;folder=null;show()};$('allocationCount').onclick=()=>{metric='count';show()};$('allocationSize').onclick=()=>{metric='size';show()};
pane.querySelectorAll('[data-row]').forEach(el=>el.onclick=()=>{const r=rows[Number(el.dataset.row)];if(!type){type=r.key;show()}else if(!folder){folder=r.key;show()}else{pane.hidden=true;api.choose(r.list[0].id)}});
}
btn.onclick=()=>{type=null;folder=null;show()};
window.addEventListener('norex-atlas-ready',e=>api=e.detail);
$('learningButton').addEventListener('click',()=>pane.hidden=true);$('archButton').addEventListener('click',()=>pane.hidden=true);$('archHistoryButton').addEventListener('click',()=>pane.hidden=true);
})();