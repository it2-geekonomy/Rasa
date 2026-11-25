// RASA festival site logic: routing, programme, workshops, artists, plan, poster viewer.
// Needs js/data.js loaded first and js/images.js loaded last.
document.documentElement.classList.add('js');
(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s), $$=(s,r)=>[...(r||document).querySelectorAll(s)];
const mem={};
const store={get(k){try{const v=localStorage.getItem(k);return v===null?mem[k]:v}catch(e){return mem[k]}},set(k,v){mem[k]=v;try{localStorage.setItem(k,v)}catch(e){}}};
function fmt(m){const h=Math.floor(m/60),mm=m%60,ap=h>=12?'PM':'AM';const h12=((h+11)%12)+1;return h12+(mm?':'+String(mm).padStart(2,'0'):'')+' '+ap}
function dur(a,b){const d=b-a,h=Math.floor(d/60),m=d%60;return (h?h+(h>1?' hrs':' hr'):'')+(h&&m?' ':'')+(m?m+' min':'')}
const rs=n=>'₹'+n.toLocaleString('en-IN');
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('on');clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.remove('on'),2600)}
const S={day:store.get('rasa-day')||'fri',type:'all',plan:[],wsday:'all',acat:'all',openEv:null};
try{S.plan=JSON.parse(store.get('rasa-plan')||'[]')}catch(e){S.plan=[]}
const byId=id=>EV.find(e=>e.id===id);
const dayOf=id=>DAYS.find(d=>d.id===id);
const savePlan=()=>store.set('rasa-plan',JSON.stringify(S.plan));

function renderHome(){
 $('#daycards').innerHTML=DAYS.map(d=>'<a class="card day '+d.cls+'" href="#/events/'+d.id+'" style="text-decoration:none"><div class="dchip"><span>'+d.short+'</span><b>'+d.num+'</b></div><h3>'+d.title+'</h3><ul>'+d.pts.map(p=>'<li>'+p+'</li>').join('')+'</ul><span class="go">See the day</span></a>').join('');
 const real=EV.filter(e=>e.ty!=='brk');
 $('#stats').innerHTML=[[real.length,'scheduled slots across three days'],[real.filter(e=>e.ws).length,'workshops and hands-on sessions'],[real.filter(e=>e.ty==='perf').length,'performances and talks'],[2,'causes supported']].map(x=>'<div><b>'+x[0]+'</b><span>'+x[1]+'</span></div>').join('');
 const start=new Date(2027,0,8),now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),days=Math.round((start-today)/864e5);
 $('#countdown').innerHTML=days>0?'<b>'+days+'</b> days to go':(days>-3?'<b>Happening now</b>':'<b>Thank you</b> for coming');
}

function planBtn(e){const on=S.plan.includes(e.id);return '<button class="star tick" type="button" data-star="'+e.id+'" aria-pressed="'+on+'" aria-label="'+(on?'Remove from':'Add to')+' my plan: '+e.t+'"><svg viewBox="0 0 24 24"><polyline points="5 12.5 10 17.5 19 7"/></svg></button>'}
function evHTML(e){
 if(e.ty==='brk')return '<div class="break">'+fmt(e.s)+' to '+fmt(e.e)+': Break</div>';
 const arts=(e.a||[]).map(id=>ARTISTS.find(a=>a.id===id)).filter(Boolean);
 const more=(e.x?'<p>'+e.x+'</p>':'<p>Details coming soon.</p>')+
  '<p style="margin-top:6px"><b>'+(e.dl||(e.nt?'Open for all':dur(e.s,e.e)))+'</b>'+(e.v?' in the '+e.v:'')+'.'+(e.price?' <b>'+e.price+'</b>.':'')+(e.seats?' '+e.seats+'.':'')+'</p>'+
  (arts.length?'<p style="margin-top:6px">'+arts.map(a=>'<a class="lnk" href="#/a/'+a.id+'">'+a.n+'</a>').join(' &middot; ')+'</p>':'')+(e.img?'<div class="posters">'+[].concat(e.img).map((k,i)=>'<img class="pic zoomable" data-img="'+k+'" tabindex="0" role="button" alt="'+[].concat(e.imgalt)[i]+'. Tap to enlarge.">').join('')+'</div><p class="note" style="margin-top:6px">Tap a poster to enlarge it.</p>':'');
 return '<article class="ev t-'+e.ty+' '+(/art (show|exhibition)/i.test(e.t)?'v-art':e.v==='Amphitheatre'?'v-amph':e.v==='Auditorium'?'v-aud':'v-other')+(S.openEv===e.id?' open':'')+'" id="ev-'+e.id+'"><div class="tm">'+(e.tl||fmt(e.s))+(e.tl?(e.ts?'<small>'+e.ts+'</small>':''):'<small>to '+fmt(e.e)+'</small>')+'</div><div class="mid"><button class="bd" type="button" data-open="'+e.id+'" aria-expanded="'+(S.openEv===e.id)+'"><span class="title" style="display:block;font-weight:700;font-size:1.05rem">'+e.t+'</span>'+(e.w?'<span class="who" style="display:block">'+e.w+'</span>':'')+'<span class="meta" style="display:flex">'+(e.v?'<span class="pill">'+e.v+'</span>':'')+'<span class="pill" style="background:#fff;border:1px solid var(--line)">'+TLAB[e.ty]+'</span>'+(e.pair?'<span class="pill pairpill" style="background:#fff;border:1px solid var(--plum);color:var(--plum)">'+e.pair+'</span>':'')+'</span></button><div class="more">'+more+'</div></div>'+planBtn(e)+'</article>';
}
function renderEvents(){
 $('#daytabs').innerHTML=DAYS.map(d=>'<button class="tab" type="button" data-day="'+d.id+'" aria-pressed="'+(S.day===d.id)+'"><small>'+d.short+'</small><b>'+d.num+'</b></button>').join('');
 $('#typechips').innerHTML=TYPES.map(t=>'<button class="fc" type="button" data-type="'+t[0]+'" aria-pressed="'+(S.type===t[0])+'">'+t[1]+'</button>').join('');
 const d=dayOf(S.day);
 $('#dayinfo').innerHTML='<b>'+d.long+'.</b> '+d.info;
 let list=EV.filter(e=>e.d===S.day&&(S.type==='all'||(S.type==='work'?(e.ty==='work'||e.ws):e.ty===S.type)||e.ty==='brk'&&S.type==='perf'||e.id==='u3'&&S.type==='perf'));
 $('#evlist').innerHTML=list.length?list.map(evHTML).join(''):'<p class="note">Nothing in this filter on '+d.long+'. Try another filter.</p>';
 injectImgs($('#evlist'));
 renderPlan();
}
function clashes(){
 const out=[];const p=S.plan.map(byId).filter(Boolean);
 for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++){const a=p[i],b=p[j];if(a.d===b.d&&!a.nt&&!b.nt&&a.s<b.e&&b.s<a.e)out.push([a,b])}
 return out;
}
function planText(){
 const p=S.plan.map(byId).filter(Boolean);if(!p.length)return '';
 return 'My RASA plan\n'+DAYS.map(d=>{const x=p.filter(e=>e.d===d.id).sort((a,b)=>a.s-b.s);return x.length?d.long+'\n'+x.map(e=>'  '+(e.tl?e.tl+(e.ts?' '+e.ts:''):fmt(e.s)+' to '+fmt(e.e))+'  '+e.t+(e.w?' ('+e.w+')':'')+(e.v?', '+e.v:'')).join('\n'):''}).filter(Boolean).join('\n\n');
}
function renderPlan(){
 const p=S.plan.map(byId).filter(Boolean).sort((a,b)=>DAYS.findIndex(d=>d.id===a.d)-DAYS.findIndex(d=>d.id===b.d)||a.s-b.s);
 const cl=clashes();
 let h='<h3>Your plan</h3><p class="note" style="margin:0">'+(p.length?p.length+(p.length>1?' sessions':' session')+' saved on this device.':'Tick any session to build your own plan.')+'</p>';
 if(p.length){
  h+='<ul>'+p.map(e=>'<li><b>'+dayOf(e.d).short+' '+(e.tl||fmt(e.s))+'</b> '+e.t+'</li>').join('')+'</ul>';
  cl.forEach(c=>{h+='<div class="warn">Overlap on '+dayOf(c[0].d).short+': '+c[0].t+' and '+c[1].t+' run at the same time.</div>'});
  h+='<div class="row"><button class="sm" type="button" id="copyplan">Copy plan</button><button class="sm" type="button" id="clearplan">Clear</button></div>';
 }
 $('#plan').innerHTML=h;
 const fab=$('#planfab');fab.innerHTML='Your plan <b>'+p.length+'</b>';
}
function toggleStar(id){
 const i=S.plan.indexOf(id);if(i>=0)S.plan.splice(i,1);else S.plan.push(id);
 savePlan();renderEvents();renderWorkshops();
 const e=byId(id);toast((i>=0?'Removed: ':'Added: ')+e.t);
 const cl=clashes().filter(c=>c[0].id===id||c[1].id===id);if(i<0&&cl.length)setTimeout(()=>toast('Overlaps with '+(cl[0][0].id===id?cl[0][1].t:cl[0][0].t)),1400);
}

function renderWorkshops(){
 $('#wsday').innerHTML=[['all','All days']].concat(DAYS.filter(d=>EV.some(e=>e.ws&&e.d===d.id)).map(d=>[d.id,d.long])).map(x=>'<button class="fc" type="button" data-wsday="'+x[0]+'" aria-pressed="'+(S.wsday===x[0])+'">'+x[1]+'</button>').join('');
 const list=EV.filter(e=>e.ws&&(S.wsday==='all'||e.d===S.wsday));
 $('#wsgrid').innerHTML=list.map(e=>{const on=S.plan.includes(e.id);return '<div class="card ws">'+(e.pic?'<img class="pic" data-img="'+e.pic+'" style="aspect-ratio:3/2;object-position:'+(e.pp||'50% 40%')+'" alt="'+e.palt+'">':'')+'<div class="tm">'+dayOf(e.d).short+' '+dayOf(e.d).num+', '+fmt(e.s)+' to '+fmt(e.e)+'</div><h3>'+e.t+'</h3>'+(e.w?'<p>'+e.w+'</p>':'')+'<p>'+e.v+'</p>'+(e.x?'<p style="font-size:.95rem">'+e.x+'</p>':'')+'<div class="price" style="font-size:1.4rem">'+(e.price||'Price to come')+'</div>'+(e.price?'':'<p style="font-size:.9rem">Each workshop is priced separately.</p>')+(e.seats?'<p style="font-size:.9rem">'+e.seats+'</p>':'')+(e.a&&e.a.length?'<p style="margin-top:4px">'+e.a.map(id=>{const x=ARTISTS.find(q=>q.id===id);return x?'<a class="lnk" href="#/a/'+x.id+'">About '+x.n+'</a>':''}).join(' ')+'</p>':'')+'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="sm" type="button" data-star="'+e.id+'" aria-pressed="'+on+'">'+(on?'In your plan':'Add to plan')+'</button><a class="sm" style="text-decoration:none;display:inline-flex;align-items:center" href="#/events/'+e.d+'" data-focus="'+e.id+'">See in programme</a></div></div>'}).join('');
 injectImgs($('#wsgrid'));
}

function renderArtists(){
 $('#artchips').innerHTML=ACAT.map(c=>'<button class="fc" type="button" data-acat="'+c[0]+'" aria-pressed="'+(S.acat===c[0])+'">'+c[1]+'</button>').join('');
 const PRI=['mallika','vyjayanthi','bickram','ghatam','anuradha','nimishambha','agam','harish','atha','sumanth','labonee','aagnika','shruthi'],rk=k=>{const i=PRI.indexOf(k);return i<0?(ARTISTS.some(a=>a.id===k)?50:60):i};
 const L=ARTISTS.filter(a=>S.acat==='all'||a.c===S.acat),Q=SOON.filter(a=>S.acat==='all'||a[2]===S.acat);
 const FULL=a=>a.img.length?'<a class="artist" href="#/a/'+a.id+'"><img class="pic" data-img="'+a.img[0]+'" style="object-position:'+(a.pos||'50% 30%')+'" alt="'+a.n+'"><h4>'+a.n+'</h4><p>'+a.r+'</p></a>':'<a class="artist" href="#/a/'+a.id+'"><div class="ph">Photo to come</div><h4>'+a.n+'</h4><p>'+a.r+'</p></a>';
 const SOONH=a=>'<div class="artist">'+(a[5]?'<div style="aspect-ratio:4/5;background:#fff;border:1px solid var(--line);border-radius:var(--r);display:grid;place-items:center;padding:18px"><img data-img="'+a[5]+'" alt="'+a[0]+', The Contemporary Art Gallery" style="width:100%;height:auto;display:block" width="600" height="260"></div>':'<div class="ph">Photo to come</div>')+'<h4>'+a[0]+'</h4><p>'+a[1]+'</p>'+(a[3]?contactRow({ct:{ig:a[3],ig2:a[4]}}):'')+'</div>';
 const items=L.map(a=>({k:a.id,h:FULL(a)})).concat(Q.map(a=>({k:a[0],h:SOONH(a)})));
 items.forEach((x,i)=>x.i=i);items.sort((p,q)=>rk(p.k)-rk(q.k)||p.i-q.i);
 $('#artgrid').innerHTML=items.map(x=>x.h).join('');
 injectImgs($('#artgrid'));
}
function contactRow(a){
 const c=a.ct||{};
 const ICO={ig:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor"><path d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077"/></svg>',
  ph:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>',
  em:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
  web:'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'};
 const lk=(k,href,label,ext)=>'<a class="cico" href="'+href+'"'+(ext?' target="_blank" rel="noopener"':'')+' aria-label="'+label+'" title="'+label+'">'+ICO[k]+'</a>';
 let h=c.ig?lk('ig','https://www.instagram.com/'+c.ig+'/','Instagram @'+c.ig+' (opens in a new tab)',1):'<span class="cico off" role="img" aria-label="Instagram to come" title="Instagram to come">'+ICO.ig+'</span>';
 if(c.web)h+=lk('web','https://'+c.web,'Website '+c.web+' (opens in a new tab)',1);
 if(c.ig2)h+=lk('ig','https://www.instagram.com/'+c.ig2+'/','Instagram @'+c.ig2+' (opens in a new tab)',1);
 if(c.ph)h+=lk('ph','https://wa.me/'+c.ph.replace(/[^\d]/g,''),(c.phl||'WhatsApp '+c.ph)+' (opens in a new tab)',1);
 if(c.em)h+=lk('em','mailto:'+c.em,'Email '+c.em);
 return '<div class="crow" role="group" aria-label="Contact">'+h+'</div>';
}
function renderArtist(id){
 const a=ARTISTS.find(x=>x.id===id)||ARTISTS[0];
 $('#a-name').textContent=a.n;$('#a-role').textContent=a.r;
 const evs=(a.ev||[]).map(byId).filter(Boolean).sort((x,y)=>DAYS.findIndex(d=>d.id===x.d)-DAYS.findIndex(d=>d.id===y.d)||x.s-y.s);
 let h='<div class="grid g2" style="grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:28px" id="a-cols"><div>'+a.bio.map(p=>'<p class="lead" style="margin-bottom:12px">'+p+'</p>').join('')+contactRow(a)+(a.logo?'<a class="logotile" href="'+a.logo.href+'" target="_blank" rel="noopener" style="margin:14px 0 6px;display:inline-flex" aria-label="'+a.logo.alt+' (opens in a new tab)"><img data-img="'+a.logo.img+'" alt="'+a.logo.alt+'" width="600" height="260"></a>':'')+(a.cred?'<p class="note">'+a.cred+'</p>':'')+
  '<h3 class="mt">At RASA</h3><div class="when">'+evs.map(e=>'<a href="#/events/'+e.d+'" data-focus="'+e.id+'"><b>'+dayOf(e.d).short+' '+dayOf(e.d).num+', '+(e.tl||fmt(e.s))+'</b><span>'+e.t+(e.v?', '+e.v:'')+'</span></a>').join('')+'</div></div><div>'+
  (a.img.length?'<img class="pic" data-img="'+a.img[0]+'" style="aspect-ratio:4/5;object-position:'+(a.pos||'50% 30%')+'" alt="'+(a.altn||a.n)+'">':'<div class="ph">Photo to come</div>')+'</div></div>';
 if(a.img.length>1)h+='<div class="gal">'+a.img.slice(1).map((k,i)=>'<img class="pic'+((a.land&&!['lourd-5','lourd-bw','lourd-cert','mal-9','mal-5','mal-7'].includes(k))||['vk-1','vk-2','mal-3','nim-stage','nim-three','banjo-hand','banjo-live','ws-action','ws-stage','ws-group','venkat-stage','venkat-stage2','quinten-b','ghatam-pots','ghatam-three-pots'].includes(k)?' w':'')+'" data-img="'+k+'" style="object-position:50% 30%" alt="'+(a.altn||a.n)+', photo '+(i+2)+'">').join('')+'</div>';
 h+='<p class="note"><a class="lnk" href="#/artists">All artists</a></p>';
 $('#a-body').innerHTML=h;injectImgs($('#a-body'));
}

function renderFaq(){
 $('#faq').innerHTML=FAQ.map(f=>'<details><summary>'+f[0]+'</summary><p>'+f[1]+'</p></details>').join('')+POLICY.map(p=>'<details class="policy"><summary>'+p[0]+'</summary>'+p[1].map(t=>'<p>'+t+'</p>').join('')+(p[2]?'<ol>'+p[2].map(t=>'<li>'+t+'</li>').join('')+'</ol>':'')+'</details>').join('');
}

function injectImgs(root){const M=window.IMG||{};$$('[data-img]',root||document).forEach(e=>{const v=M[e.dataset.img];if(v&&e.getAttribute('src')!==v)e.src=v})}

const SUBS={festival:[['events','Programme'],['workshops','Workshops'],['artists','Artists'],['exhibitions','Art Exhibitions'],['stalls','Stalls']],booking:[['booking','Tickets'],['faq','FAQ and policies']],about:[['about','Why RASA'],['team','Team']]};
let lastPage=null;
function route(){
 const raw=location.hash.replace(/^#\/?/,'')||'home',parts=raw.split('/');
 let name=parts[0];
 if(name==='a'){name='artist';if(!ARTISTS.some(a=>a.id===parts[1])){location.replace('#/artists');return}}
 let page=document.getElementById('p-'+name);if(!page){location.replace('#/home');return}
 if(name==='events'&&focusEv)S.type='all';
 if(name==='events'&&parts[1]&&DAYS.some(d=>d.id===parts[1])){S.day=parts[1];store.set('rasa-day',S.day);S.openEv=null}
 if(name==='artist')renderArtist(parts[1]);
 $$('.page').forEach(p=>p.classList.toggle('show',p===page));
 const g=page.dataset.g,sub=page.dataset.sub||name;
 $$('#mainnav a[data-g]').forEach(a=>a.classList.toggle('on',a.dataset.g===g));
 const bmap={home:'home',events:'festival',workshops:'festival',exhibitions:'festival',stalls:'festival',artists:'artists',artist:'artists',booking:'booking',faq:'booking'}[name];
 $$('#bnav a').forEach(a=>a.classList.toggle('on',a.dataset.g===bmap));
 $('#morebtn').classList.toggle('on',!bmap);
 $$('#sheetp a').forEach(a=>a.classList.toggle('on',a.getAttribute('href')==='#/'+name));
 const sn=$('#subnav');
 if(SUBS[g]){$('#subin').innerHTML=SUBS[g].map(x=>'<a href="#/'+x[0]+'"'+(x[0]===sub?' class="on"':'')+'>'+x[1]+'</a>').join('');sn.classList.add('show')}else{sn.classList.remove('show');$('#subin').innerHTML=''}
 if(name==='events')renderEvents();
 if(name==='workshops')renderWorkshops();
 if(name==='artists')renderArtists();
 const titles={home:'Home',events:'Programme',workshops:'Workshops',exhibitions:'Art Exhibitions',stalls:'Stalls',artists:'Artists',artist:$('#a-name').textContent,booking:'Tickets',faq:'FAQ',about:'Why RASA',team:'Team',sponsors:'Sponsors',partners:'Make a difference'};
 document.title=(titles[name]||'RASA')+' | RASA, Roots to Rhythm';
 if(lastPage!==name+(name==='artist'?parts[1]:''))window.scrollTo(0,0);
 lastPage=name+(name==='artist'?parts[1]:'');
 injectImgs(page);
 closeSheet();
 const f=focusEv;if(f&&name==='events'){focusEv=null;S.type='all';const el=document.getElementById('ev-'+f);if(el){S.openEv=f;renderEvents();const e2=document.getElementById('ev-'+f);e2&&setTimeout(()=>e2.scrollIntoView({block:'center',behavior:'smooth'}),60)}}
}
let focusEv=null;
function closeSheet(){$('#sheet').classList.remove('show')}

document.addEventListener('click',ev=>{
 const el=ev.target.closest('button,a');if(!el)return;
 if(el.dataset.focus){focusEv=el.dataset.focus}
  if(el.dataset.star){ev.preventDefault();toggleStar(el.dataset.star);return}
 if(el.dataset.open){const id=el.dataset.open;S.openEv=S.openEv===id?null:id;const art=document.getElementById('ev-'+id);$$('.ev').forEach(a=>{const o=a.id==='ev-'+S.openEv;a.classList.toggle('open',o);const b=$('.bd',a);b&&b.setAttribute('aria-expanded',o)});return}
 if(el.dataset.day){S.day=el.dataset.day;store.set('rasa-day',S.day);S.openEv=null;renderEvents();return}
 if(el.dataset.type){S.type=el.dataset.type;renderEvents();return}
 if(el.dataset.wsday){S.wsday=el.dataset.wsday;renderWorkshops();return}
 if(el.dataset.acat){S.acat=el.dataset.acat;renderArtists();return}
 if(el.dataset.copy){const t=el.dataset.copy;const done=()=>toast('UPI ID copied');if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done,()=>fb(t,done))}else fb(t,done);return}
 if(el.dataset.book==='proposal'){window.open('/pdf/RASA-Sponsorship-Proposal.pdf','_blank');return}
 if(el.id==='clearplan'){S.plan=[];savePlan();renderEvents();renderWorkshops();return}
 if(el.id==='copyplan'){const txt=planText();const done=()=>toast('Plan copied');if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(done,()=>fb(txt,done))}else fb(txt,done);return}
 if(el.id==='planfab'){const p=$('#plan');p.classList.toggle('show');if(p.classList.contains('show'))p.scrollIntoView({behavior:'smooth',block:'start'});return}
 if(el.id==='morebtn'){$('#sheet').classList.add('show');return}
});
function fb(txt,done){const t=document.createElement('textarea');t.value=txt;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();try{document.execCommand('copy');done()}catch(e){toast('Copy is blocked in this browser')}t.remove()}
$('#sheet').addEventListener('click',e=>{if(e.target.id==='sheet')closeSheet()});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape')closeSheet();
 const g=e.target.closest&&e.target.closest('.band-s');
 if(g&&(e.key==='Enter'||e.key===' ')){e.preventDefault();g.dispatchEvent(new MouseEvent('click',{bubbles:true}))}
});

window.addEventListener('hashchange',route);window.__ii=()=>injectImgs(document);

renderHome();renderFaq();renderEvents();renderWorkshops();renderArtists();
$$('[data-ig]').forEach(e=>{e.innerHTML=contactRow({ct:{ig:e.dataset.ig}})});
$('#fico').innerHTML=contactRow({ct:{ig:'rasarootsrhythm',ph:'+91 96637 27663',phl:'WhatsApp, contact HCG Foundation',em:'rasarootsfestival@gmail.com'}});
injectImgs(document);
(function(){const lb=document.createElement('div');lb.className='lb';lb.setAttribute('role','dialog');lb.setAttribute('aria-label','Poster enlarged');lb.innerHTML='<img alt=""><button type="button" aria-label="Close poster">Close</button>';document.body.appendChild(lb);const im=lb.querySelector('img');const open=s=>{im.src=s.src;im.alt=s.alt.replace('. Tap to enlarge.','');lb.classList.add('on');lb.querySelector('button').focus()};const close=()=>{lb.classList.remove('on');im.removeAttribute('src')};document.addEventListener('click',e=>{const z=e.target.closest('img.zoomable');if(z){open(z);return}if(e.target.closest('.lb'))close()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&lb.classList.contains('on'))close();if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('img.zoomable')){e.preventDefault();open(e.target)}})})();
route();
})();
