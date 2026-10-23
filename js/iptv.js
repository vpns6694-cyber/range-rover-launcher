'use strict';
// ===== IPTV (Xtream / M3U) — credentials only in device localStorage =====
const FALLBACK={'business-cloud-neo.com':['http://194.120.144.8:80']};
const SEP=/(#{3,}|-{3,}|={3,}|\*{3,}|_{4,}|•{3,}|★{3,})/;
const SUPM={'ᴬ':'A','ᴮ':'B','ᶜ':'C','ᴰ':'D','ᴱ':'E','ᶠ':'F','ᴳ':'G','ᴴ':'H','ᴵ':'I','ᴶ':'J','ᴷ':'K','ᴸ':'L','ᴹ':'M','ᴺ':'N','ᴼ':'O','ᴾ':'P','ᴿ':'R','ˢ':'S','ᵀ':'T','ᵁ':'U','ⱽ':'V','ᵂ':'W','ᵛ':'V','ᵃ':'A','ʰ':'H','ᵈ':'D','ʳ':'R','ʷ':'W','⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁺':'+'};
const SUPRE=new RegExp('['+Object.keys(SUPM).join('')+']+','g');const unsup=t=>String(t||'').replace(SUPRE,m=>' '+[...m].map(c=>SUPM[c]).join('')+' ');
const QRE=/\b(RAW|FHD|UHD|4K|HEVC|H265|HD|SD)\b/gi;
const SMART=[['fav','⭐ Favorites',null],['gulf','🇦🇪 UAE & Gulf',/\b(UAE|EMIRAT|DUBAI|ABU ?DHABI|SHARJAH|AJMAN|SAUDI|KSA|QATAR|KUWAIT|BAHRAIN|OMAN|GULF|KHALEEJ|AD ?TV|SAMA)\b/i],
 ['ar','📺 Arabic · MBC · OSN',/(\bAR\b|^AR[\s|:-]|ARAB|MBC|OSN|ROTANA|ART\b|SHAHID|ALJAZEERA|AL ?JAZEERA|LBC|MTV LEB|NILE|CBC|عرب|ام بي سي)/i],
 ['sport','⚽ beIN & Sports',/(BEIN|SPORT|SSC|ESPN|DAZN|SKY SPORT|ALKASS|AL KASS|AD SPORT|EUROSPORT|NBA|NFL|UFC|F1|MOTOR)/i],
 ['news','🌍 International News',/(NEWS|CNN|BBC WORLD|AL ARABIYA|ALARABIYA|SKY NEWS|FRANCE ?24|DW|EURONEWS|CNBC|BLOOMBERG|ASHARQ|ALHADATH|AL HADATH)/i],
 ['ukus','🇬🇧 UK / US',/(^UK|\bUK\b|^US|\bUSA?\b|\bGB\b|BRITISH|AMERICA|SKY\b|BBC|ITV|FOX|NBC|ABC\b|CBS|HBO)/i]];
const X={live:[],cats:[],vod:[],vcats:[],ser:[],scats:[],ok:false};
const cfg=()=>{try{return JSON.parse(LS.rrXt||'null')}catch(e){return null}};
const favs=new Set(JSON.parse(LS.rrFav||'[]'));
function hostsOf(c){const h=[c.url.replace(/\/+$/,'')];for(const k in FALLBACK)if(c.url.includes(k))h.push(...FALLBACK[k]);return h}
function cleanName(n){return unsup(n).replace(QRE,'').replace(/[|\[\]()]+/g,' ').replace(/^\s*[A-Z]{2,3}\s*[:|-]\s*/,'').replace(/\s{2,}/g,' ').trim()}
function quals(n){const s=new Set();(unsup(n).match(QRE)||[]).forEach(q=>{q=q.toUpperCase();s.add(q==='H265'?'HEVC':q==='UHD'?'4K':q)});return [...s]}
function mono(n){const w=cleanName(n).split(/\s+/).filter(Boolean);return ((w[0]||'?')[0]+((w[1]||w[0]||'')[w[1]?0:1]||'')).toUpperCase()}
async function getJ(u,ms=25000){try{const ct=new AbortController(),t=setTimeout(()=>ct.abort(),ms);const r=await fetch(u,{signal:ct.signal});clearTimeout(t);if(!r.ok)throw 0;return await r.json()}
 catch(e){if(B&&B.httpGet){const s=B.httpGet(u);if(s)try{return JSON.parse(s)}catch(_){}}throw new Error('net')}}
let H='';async function api(action,extra=''){const c=cfg();let last;for(const h of [H,...hostsOf(c)].filter(Boolean)){try{const j=await getJ(`${h}/player_api.php?username=${encodeURIComponent(c.user)}&password=${encodeURIComponent(c.pass)}${action?'&action='+action:''}${extra}`);H=h;return j}catch(e){last=e}}throw last}
function parseM3U(t){const out=[],cats={};let cur=null;t.split(/\r?\n/).forEach(l=>{if(l.startsWith('#EXTINF')){const g=(l.match(/group-title="([^"]*)"/)||[])[1]||'Other';cur={name:l.split(',').slice(1).join(',').trim(),stream_icon:(l.match(/tvg-logo="([^"]*)"/)||[])[1],category_id:g};cats[g]=1}
 else if(cur&&l.trim()&&!l.startsWith('#')){cur.url=l.trim();cur.stream_id=out.length;out.push(cur);cur=null}});return {live:out,cats:Object.keys(cats).map(k=>({category_id:k,category_name:k}))}}
async function xtLoad(){const c=cfg();if(!c){renderCats();return}const st=$('#xtStat');
 try{st&&(st.textContent='Connecting…');
  if(c.m3u){const t=await (await fetch(c.m3u)).text();const p=parseM3U(t);X.live=p.live;X.cats=p.cats}
  else{const info=await api('');if(!info.user_info||+info.user_info.auth!==1)throw new Error('auth');X.info=info.user_info;
   const [cats,live]=await Promise.all([api('get_live_categories'),api('get_live_streams')]);X.cats=cats||[];X.live=live||[]}
  X.live=X.live.filter(s=>s&&s.name&&!SEP.test(s.name)&&cleanName(s.name).length>1);X.cats=X.cats.filter(c=>!SEP.test(c.category_name));
  X.cats.forEach(c=>c.category_name=unsup(c.category_name).replace(QRE,m=>m).replace(/\s{2,}/g,' ').trim());X.live.forEach(s=>{s._n=cleanName(s.name);s._q=quals(s.name);s._k=(unsup(s.name)+' '+(catName(s.category_id)||'')).toUpperCase()});
  X.ok=true;st&&(st.textContent=`✓ Connected · ${X.live.length.toLocaleString()} channels`);renderCats();pickCat(LS.rrCat||'all');subInfo();chime('ok');
  if(!c.m3u)loadVod()}catch(e){X.ok=false;st&&(st.textContent='✗ Could not connect — check server / username / password');toast('IPTV connection failed');renderCats()}}
async function loadVod(){try{const [vc,v,sc,s]=await Promise.all([api('get_vod_categories'),api('get_vod_streams'),api('get_series_categories'),api('get_series')]);
 X.vcats=(vc||[]).filter(c=>!SEP.test(c.category_name));X.vod=(v||[]).filter(x=>x.name&&!SEP.test(x.name));X.scats=(sc||[]).filter(c=>!SEP.test(c.category_name));X.ser=(s||[]).filter(x=>x.name&&!SEP.test(x.name));
 vodInit('m');vodInit('s')}catch(e){}}
const catName=id=>(X.cats.find(c=>c.category_id==id)||{}).category_name;
// ---- categories ----
let curCat='all',query='',view=[],shown=0,curCh=null;
function renderCats(){const box=$('#cats');const cnt=k=>k==='all'?X.live.length:k==='fav'?X.live.filter(s=>favs.has(s.stream_id+'')).length:X.live.filter(s=>SMART.find(g=>g[0]===k)[2].test(s._k)).length;
 let h=`<div class="cat-h">Smart Groups</div><button class="cat" data-c="all">All Channels <small>${X.live.length}</small></button>`+SMART.map(([k,l])=>`<button class="cat" data-c="${k}">${l} <small>${X.ok?cnt(k):''}</small></button>`).join('')+
  `<button class="cat" data-go="movies">🎬 Movies (VOD) <small>${X.vod.length||''}</small></button><button class="cat" data-go="series">📺 Series <small>${X.ser.length||''}</small></button>`;
 if(X.cats.length)h+=`<div class="cat-h">Provider Categories</div>`+X.cats.map(c=>`<button class="cat" data-c="id:${esc(c.category_id)}">${esc(c.category_name)}</button>`).join('');
 if(!X.ok)h+=`<div style="padding:14px" class="muted">No subscription connected.<br><button class="btn pri" style="margin-top:10px" data-open="xt">Connect IPTV</button></div>`;
 box.innerHTML=h;$('#catSel').innerHTML=`<option value="all">All Channels</option>`+SMART.map(([k,l])=>`<option value="${k}">${l}</option>`).join('')+X.cats.map(c=>`<option value="id:${esc(c.category_id)}">${esc(c.category_name)}</option>`).join('');
 box.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>pickCat(b.dataset.c));markCat()}
function markCat(){$$('#cats [data-c]').forEach(b=>b.classList.toggle('on',b.dataset.c===curCat));$('#catSel').value=curCat}
$('#catSel').onchange=e=>pickCat(e.target.value);
function pickCat(k){curCat=k;LS.rrCat=k;markCat();filter()}
function filter(){const q=query.toUpperCase().trim();let a=X.live;
 if(curCat==='fav')a=a.filter(s=>favs.has(s.stream_id+''));else if(curCat.startsWith('id:')){const id=curCat.slice(3);a=a.filter(s=>s.category_id==id)}else if(curCat!=='all'){const re=SMART.find(g=>g[0]===curCat)[2];a=a.filter(s=>re.test(s._k))}
 if(q)a=a.filter(s=>s._k.includes(q));view=a;shown=0;$('#chl').innerHTML=view.length?'':`<div class="muted" style="padding:20px">${X.ok?'No channels match.':'Connect your subscription to load channels.'}</div>`;more()}
const qb=s=>s.map(q=>`<span class="badge ${q==='4K'||q==='RAW'?'s':''}">${q}</span>`).join('');
function more(){const f=document.createDocumentFragment();view.slice(shown,shown+60).forEach(s=>{const d=document.createElement('div');d.className='ch'+(curCh===s?' on':'');d.dataset.id=s.stream_id;
 d.innerHTML=`<div class="mono">${mono(s.name)}</div><div class="nm"><div>${esc(s._n)}</div><small>${esc(catName(s.category_id)||'')}</small></div>${qb(s._q)}<span class="star ${favs.has(s.stream_id+'')?'on':''}">★</span>`;
 if(s.stream_icon&&/^https?:/.test(s.stream_icon)){const im=new Image();im.onload=()=>{if(im.naturalWidth>8){const m=d.querySelector('.mono');m.textContent='';m.appendChild(im)}};im.referrerPolicy='no-referrer';im.src=s.stream_icon}
 d.onclick=e=>{if(e.target.classList.contains('star')){toggleFav(s,e.target);return}play(s)};f.appendChild(d)});shown+=60;
 $('#chl .more')?.remove();$('#chl').appendChild(f);if(shown<view.length){const m=document.createElement('div');m.className='more';m.textContent=`Loading more… (${shown} / ${view.length})`;m.onclick=more;$('#chl').appendChild(m);io.observe(m)}}
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){io.unobserve(e.target);more()}}),{root:$('#chl'),rootMargin:'300px'});
let qt;$('#q').oninput=e=>{clearTimeout(qt);qt=setTimeout(()=>{query=e.target.value;filter()},220)};
function toggleFav(s,el){const k=s.stream_id+'';favs.has(k)?favs.delete(k):favs.add(k);LS.rrFav=JSON.stringify([...favs]);el.classList.toggle('on',favs.has(k));toast(favs.has(k)?'Added to Favorites':'Removed from Favorites')}
// ---- smart player: HLS → MPEG-TS → alternate host ----
let hls=null,mts=null,stallT=null;
function stopP(v){clearTimeout(stallT);if(hls){hls.destroy();hls=null}if(mts){try{mts.destroy()}catch(e){}mts=null}v.removeAttribute('src');v.load()}
function candidates(s){const c=cfg();if(s.url)return [{u:s.url,t:/\.m3u8/.test(s.url)?'hls':'ts'}];const out=[];const hs=[...new Set([H,...hostsOf(c)].filter(Boolean))];
 hs.forEach(h=>{out.push({u:`${h}/live/${c.user}/${c.pass}/${s.stream_id}.m3u8`,t:'hls',h});out.push({u:`${h}/live/${c.user}/${c.pass}/${s.stream_id}.ts`,t:'ts',h})});return out}
function tryPlay(v,list,i,onFail,label){if(i>=list.length){onFail&&onFail();return}const c=list[i];stopP(v);let done=false;const next=()=>{if(done)return;done=true;stat(`Fallback ${i+2}/${list.length}…`);tryPlay(v,list,i+1,onFail,label)};
 stat(`${c.t.toUpperCase()} · ${c.h?c.h.replace(/^https?:\/\//,'').replace(/:.*/,''):'direct'} · connecting`);
 if(c.t==='hls'&&window.Hls&&Hls.isSupported()){hls=new Hls({enableWorker:true,lowLatencyMode:true,manifestLoadingTimeOut:6000,fragLoadingTimeOut:8000});hls.on(Hls.Events.ERROR,(e,d)=>{if(d.fatal)next()});hls.loadSource(c.u);hls.attachMedia(v)}
 else if(c.t==='hls'&&v.canPlayType('application/vnd.apple.mpegurl'))v.src=c.u;
 else if(c.t==='ts'&&window.mpegts&&mpegts.getFeatureList().mseLivePlayback){mts=mpegts.createPlayer({type:'mpegts',isLive:true,url:c.u},{enableStashBuffer:false,liveBufferLatencyChasing:true});mts.on(mpegts.Events.ERROR,next);mts.attachMediaElement(v);mts.load()}
 else v.src=c.u;
 v.onerror=next;stallT=setTimeout(()=>{if(v.readyState<3)next()},c.t==='hls'?4000:6000);v.onplaying=()=>{done=true;clearTimeout(stallT);stat(`● ${c.t.toUpperCase()} · ${v.videoWidth||''}${v.videoWidth?'×'+v.videoHeight:''}`)};v.play().catch(()=>{})}
const stat=t=>$('#pstat').textContent=t;
function play(s){curCh=s;$$('#chl .ch').forEach(d=>d.classList.toggle('on',d.dataset.id==s.stream_id));$('#nowName').textContent=s._n;$('#nowBad').innerHTML=qb(s._q);LS.rrLast=s.stream_id;
 if(quadOn){const q=$('.qc.sel video');if(q){tryPlay(q,candidates(s),0);$('.qc.sel .lab').textContent=s._n}return}
 tryPlay($('#mv'),candidates(s),0,()=>{stat('✗ Stream unavailable on all hosts — try another channel');toast('Stream unavailable')})}
let quadOn=false;$('#quadBtn').onclick=()=>{quadOn=!quadOn;const q=$('#quad');q.classList.toggle('on',quadOn);$('#quadBtn').classList.toggle('on',quadOn);
 if(quadOn){q.innerHTML=[0,1,2,3].map(i=>`<div class="qc ${i?'':'sel'}"><video muted playsinline autoplay></video><span class="lab">Cell ${i+1} — pick channel</span></div>`).join('');q.querySelectorAll('.qc').forEach(c=>c.onclick=()=>{q.querySelectorAll('.qc').forEach(x=>x.classList.toggle('sel',x===c));q.querySelectorAll('video').forEach(v=>v.muted=v!==c.querySelector('video'))});
  view.slice(0,4).forEach((s,i)=>tryPlay(q.querySelectorAll('video')[i],candidates(s),0))}else{q.querySelectorAll('video').forEach(v=>{v.pause();v.removeAttribute('src')});q.innerHTML=''}};
// ---- VOD & Series ----
const V={m:{cat:'all',q:'',shown:0,list:[]},s:{cat:'all',q:'',shown:0,list:[]}};
const DEMO={m:[['Interstellar','poster-interstellar.jpg'],['Dune','poster-dune.jpg'],['Inception','poster-inception.jpg'],['Top Gun','poster-topgun.jpg'],['The Batman','poster-batman.jpg'],['Beyond','poster-beyond.jpg']],s:[['The Last of Us','series-tlou.jpg'],['Frontier','series-frontier.jpg'],['Shadows','poster-shadows.jpg'],['Silent','poster-silent.jpg']]};
function vodInit(k){const cats=k==='m'?X.vcats:X.scats;const box=$('#'+k+'cats');box.innerHTML=`<div class="cat-h">${k==='m'?'Movie':'Series'} Categories</div><button class="cat on" data-vc="all">All <small>${(k==='m'?X.vod:X.ser).length||''}</small></button>`+cats.map(c=>`<button class="cat" data-vc="${esc(c.category_id)}">${esc(c.category_name)}</button>`).join('');
 box.querySelectorAll('[data-vc]').forEach(b=>b.onclick=()=>{V[k].cat=b.dataset.vc;box.querySelectorAll('[data-vc]').forEach(x=>x.classList.toggle('on',x===b));vodFilter(k)});vodFilter(k)}
function vodFilter(k){const st=V[k];let a=k==='m'?X.vod:X.ser;if(!a.length){$('#'+k+'grid').innerHTML=DEMO[k].map(d=>`<div class="poster" data-demo="1"><div class="art" style="background-image:url(assets/${d[1]})"></div><div class="t">${d[0]}</div></div>`).join('')+`<div class="muted" style="grid-column:1/-1;padding:10px">Connect your IPTV subscription in Settings to load your ${k==='m'?'movies':'series'} library.</div>`;
 $$('#'+k+'grid [data-demo]').forEach(p=>p.onclick=()=>openM('xt'));return}
 if(st.cat!=='all')a=a.filter(x=>x.category_id==st.cat);if(st.q)a=a.filter(x=>x.name.toUpperCase().includes(st.q));st.list=a;st.shown=0;$('#'+k+'grid').innerHTML='';vodMore(k);k==='s'&&($('#sInfo').textContent=a.length.toLocaleString()+' series')}
function vodMore(k){const st=V[k],g=$('#'+k+'grid'),f=document.createDocumentFragment();st.list.slice(st.shown,st.shown+60).forEach(x=>{const d=document.createElement('div');d.className='poster';const img=k==='m'?x.stream_icon:x.cover;
 d.innerHTML=`<div class="art"><span class="mono" style="width:100%;height:100%;border-radius:0;font-size:26px">${mono(x.name)}</span></div><div class="t">${esc(cleanName(x.name))}</div>`;
 if(img&&/^https?:/.test(img)){const im=new Image();im.onload=()=>{const a=d.querySelector('.art');a.innerHTML='';a.style.backgroundImage=`url("${img.replace(/"/g,'')}")`};im.src=img}
 d.onclick=()=>k==='m'?playVod(x):openSeries(x);f.appendChild(d)});st.shown+=60;g.querySelector('.more')?.remove();g.appendChild(f);
 if(st.shown<st.list.length){const m=document.createElement('div');m.className='more';m.style.gridColumn='1/-1';m.textContent='Loading more…';m.onclick=()=>vodMore(k);g.appendChild(m);vio.observe(m);vio.k=k}}
const vio=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){vio.unobserve(e.target);vodMore(e.target.parentElement.id[0])}}),{rootMargin:'400px'});
['m','s'].forEach(k=>{let t;$('#q'+k).oninput=e=>{clearTimeout(t);t=setTimeout(()=>{V[k].q=e.target.value.toUpperCase().trim();vodFilter(k)},250)}});
function vpOpen(u){const v=$('#vv');$('#vp').classList.add('on');stopP(v);const ext=(u.match(/\.(\w+)$/)||[])[1];if(ext==='m3u8'&&window.Hls&&Hls.isSupported()){hls=new Hls();hls.loadSource(u);hls.attachMedia(v)}else v.src=u;v.play().catch(()=>{})}
$('#vpX').onclick=()=>{stopP($('#vv'));$('#vp').classList.remove('on')};
function playVod(x){const c=cfg();vpOpen(`${H||hostsOf(c)[0]}/movie/${c.user}/${c.pass}/${x.stream_id}.${x.container_extension||'mp4'}`)}
async function openSeries(x){openM('eps');$('#epsT').textContent=cleanName(x.name);$('#eps').innerHTML='<div class="muted">Loading episodes…</div>';$('#seasons').innerHTML='';
 try{const info=await api('get_series_info','&series_id='+x.series_id);const eps=info.episodes||{};const ss=Object.keys(eps);
  const show=s=>{$$('#seasons .chip').forEach(b=>b.classList.toggle('on',b.dataset.s===s));$('#eps').innerHTML=eps[s].map(e=>`<div class="pc" data-e="${e.id}" data-x="${e.container_extension||'mp4'}"><span>E${e.episode_num} · ${esc(e.title||'')}</span><span>▶</span></div>`).join('');
   $$('#eps [data-e]').forEach(p=>p.onclick=()=>{const c=cfg();$('#m-eps').classList.remove('open');vpOpen(`${H||hostsOf(c)[0]}/series/${c.user}/${c.pass}/${p.dataset.e}.${p.dataset.x}`)})};
  $('#seasons').innerHTML=ss.map(s=>`<button class="chip" data-s="${s}">Season ${s}</button>`).join('');$$('#seasons .chip').forEach(b=>b.onclick=()=>show(b.dataset.s));ss.length?show(ss[0]):$('#eps').innerHTML='<div class="muted">No episodes.</div>'}
 catch(e){$('#eps').innerHTML='<div class="muted">Could not load episodes.</div>'}}
$$('[data-cine]').forEach(b=>b.onclick=()=>{b.classList.toggle('on');const m={theater:'Theater Mode — ambient dimmed',atmos:'Dolby Atmos immersive',hall:'Concert Hall acoustic'}[b.dataset.cine];toast(m+(b.classList.contains('on')?' ON':' OFF'));
 if(b.dataset.cine==='theater')document.documentElement.style.setProperty('--bri',b.classList.contains('on')?.7:(LS.rrBri||1));chime('info')});
// ---- subscription modal ----
hooks['m-xt']=()=>{const c=cfg()||{};$('#xtUrl').value=c.url||'';$('#xtUser').value=c.user||'';$('#xtPass').value=c.pass||'';$('#xtM3u').value=c.m3u||'';$('#xtStat').textContent=X.ok?'✓ Connected':''};
$('#xtGo').onclick=async()=>{let url=$('#xtUrl').value.trim(),m3u=$('#xtM3u').value.trim();if(url&&!/^https?:\/\//.test(url))url='http://'+url;
 if(!m3u&&!(url&&$('#xtUser').value&&$('#xtPass').value)){$('#xtStat').textContent='Enter server, username and password';return}
 LS.rrXt=JSON.stringify({url:url.replace(/\/+$/,''),user:$('#xtUser').value.trim(),pass:$('#xtPass').value,m3u});H='';await xtLoad();if(X.ok){setTimeout(()=>$('#m-xt').classList.remove('open'),700);go('iptv')}};
function subInfo(){const i=X.info||{},c=cfg();$('#subInfo').innerHTML=c?`<div><span>Status</span><b style="color:${X.ok?'var(--ok)':'var(--bad)'}">${X.ok?(i.status||'Active'):'Not connected'}</b></div><div><span>Server</span><b>${esc((H||c.url||'M3U').replace(/^https?:\/\//,''))}</b></div><div><span>Account</span><b>${esc((c.user||'').replace(/.(?=.{3})/g,'•'))}</b></div><div><span>Expires</span><b>${i.exp_date?new Date(i.exp_date*1000).toLocaleDateString('en-GB'):'—'}</b></div><div><span>Connections</span><b>${i.active_cons??'—'} / ${i.max_connections??'—'}</b></div><div><span>Live · Movies · Series</span><b>${X.live.length} · ${X.vod.length} · ${X.ser.length}</b></div>`:'<div><span>Status</span><b>Not connected</b></div>'}
$('#xtOff').onclick=()=>{delete LS.rrXt;Object.assign(X,{live:[],cats:[],vod:[],vcats:[],ser:[],scats:[],ok:false,info:null});stopP($('#mv'));renderCats();filter();subInfo();vodInit('m');vodInit('s');toast('Subscription removed from this device')};
$('#xtRe').onclick=()=>{xtLoad();toast('Reloading lists…')};
hooks.iptv=()=>{if(!cfg())openM('xt')};
window.addEventListener('load',()=>{renderCats();filter();vodInit('m');vodInit('s');subInfo();xtLoad()});
