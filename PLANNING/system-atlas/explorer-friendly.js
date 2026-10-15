(()=>{
const $=id=>document.getElementById(id);
const friendly=s=>String(s||'').split('/').pop().replace(/\.[^.]+$/,'').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[_-]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
const bytes=n=>!Number.isFinite(n)?'Size unknown':n>=1048576?(n/1048576).toFixed(2)+' MiB':n>=1024?(n/1024).toFixed(1)+' KiB':n+' bytes';
const descriptions={'js':'JavaScript code used for website or application behavior.','mjs':'JavaScript module used by the application or build process.','css':'Styles controlling the appearance of interface elements.','html':'Webpage markup describing content and interface structure.','json':'Structured configuration or data consumed by software.','md':'Documentation written in Markdown.','py':'Python script for automation or data processing.','sql':'Database queries or schema definitions.','yml':'YAML configuration, often for automation.','yaml':'YAML configuration, often for automation.','svg':'Scalable vector artwork or icons.','local-file':'Locally indexed file; functionality has not been verified.','function':'Named source-code function; inspect source for actual behavior.','html-control':'Interactive or navigational HTML element.','table-reference':'Database table mentioned by source code; runtime existence unverified.','api-reference':'API endpoint referenced in source code; runtime availability unverified.'};
const css=document.createElement('style');css.textContent='#results .item{border-radius:9px;padding:10px;margin:5px 0}#results .item strong{display:block;font-size:13px}#results .item .muted{font-size:11px}#atlasTooltip{position:fixed;max-width:350px;pointer-events:none;z-index:99;background:#172538;border:1px solid #6b819b;color:#edf4ff;padding:12px;border-radius:10px;box-shadow:0 8px 24px #0008;font-size:12px;line-height:1.5}#atlasTooltip[hidden]{display:none}';document.head.append(css);
const tip=document.createElement('div');tip.id='atlasTooltip';tip.hidden=true;document.body.append(tip);
let api;
const description=n=>descriptions[n.kind]||'Indexed repository reference. The specific purpose is not yet confirmed by source analysis.';
function tooltip(n){const count=(api.adj.get(n.id)||[]).length;return friendly(n.label)+'\nActual: '+(n.path||n.label)+'\nType: '+n.kind+'\nSize: '+bytes(n.bytes)+'\nIndexed relationships: '+count+'\nPurpose: '+description(n)}
function decorate(){if(!api)return;for(const el of document.querySelectorAll('#results [data-id]')){const n=api.nodes.get(el.dataset.id);if(!n)continue;const tag=el.querySelector('.tag');if(!tag||el.dataset.friendly==='1')continue;el.dataset.friendly='1';el.title=tooltip(n);const heading=document.createElement('strong');heading.textContent=friendly(n.label);tag.after(heading)}}
function show(n,x,y){tip.textContent=tooltip(n);tip.hidden=false;tip.style.left=Math.max(8,Math.min(x+14,window.innerWidth-370))+'px';tip.style.top=Math.max(8,Math.min(y+14,window.innerHeight-180))+'px'}
$('results').addEventListener('pointermove',e=>{const el=e.target.closest('[data-id]');const n=el&&api?.nodes.get(el.dataset.id);if(n)show(n,e.clientX,e.clientY);else tip.hidden=true});
$('results').addEventListener('pointerleave',()=>tip.hidden=true);
$('results').addEventListener('focusin',e=>{const el=e.target.closest('[data-id]');if(el){const n=api?.nodes.get(el.dataset.id);if(n)show(n,30,100)}});
$('results').addEventListener('focusout',()=>tip.hidden=true);
const obs=new MutationObserver(decorate);obs.observe($('results'),{childList:true});
window.addEventListener('norex-atlas-ready',e=>{api=e.detail;decorate()});
})();