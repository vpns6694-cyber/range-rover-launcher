'use strict';
// ================= v3: glow toggle · profile · radio · Netflix cinema · Live TV fullscreen · back =================
// ---- glow (off by default) ----
const glowOn=()=>LS.rrGlow==='1';
function applyGlow(){document.body.classList.toggle('glow-enabled',glowOn());$('#glowSw')&&$('#glowSw').classList.toggle('on',glowOn())}
$('#glowSw').onclick=()=>{LS.rrGlow=glowOn()?'0':'1';applyGlow();toast('Frame & Dial Glow '+(glowOn()?'ON':'OFF'));chime('info')};applyGlow();
// ---- profile photo ----
function applyPhoto(){const src=LS.rrPhoto||'assets/abdalla-avatar.png';$$('.uPhoto').forEach(i=>i.src=src)}
$('#pfFile').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas'),s=360;c.width=c.height=s;const x=c.getContext('2d'),m=Math.min(im.width,im.height);
 x.drawImage(im,(im.width-m)/2,(im.height-m)/2,m,m,0,0,s,s);try{LS.rrPhoto=c.toDataURL('image/jpeg',.88)}catch(_){toast('Photo too large')}applyPhoto();toast('Profile photo updated');chime('ok')};im.src=r.result};r.readAsDataURL(f)};
$('#pfReset').onclick=()=>{delete LS.rrPhoto;applyPhoto();toast('Default photo restored')};
hooks['m-profile']=()=>{$('#pfSt').textContent=(stations()[+LS.rrStIdx||0]||{}).n||'—';$('#pfAmb').textContent=LS.rrAmbName||'Gold'};applyPhoto();

// ================= MERIDIAN RADIO =================
// Every URL below was tested live with curl (HTTP 200 audio / HLS with CORS *) before bundling.
const ADM='https://admn-radio-cdn-lb.starzplayarabia.com/out/v1/admn_radio_enc/';
const BASE_ST=[
 {id:'emarat',n:'Emarat FM',f:95.8,c:'Abu Dhabi Media · UAE',u:[ADM+'emarat_fm/emarat_fm_hls_nd/index_emaratfm_audio_enc_ara.m3u8',ADM+'emarat_fm/emarat_fm_hls_nd/index.m3u8']},
 {id:'quran',n:'Holy Quran Radio',f:98.2,c:'إذاعة القرآن الكريم',u:[ADM+'quran/quran_hls_nd/index_quranfm_audio_enc_ara.m3u8','https://jrtv-live.ercdn.net/jrradio/quranradio.m3u8','https://l3.itworkscdn.net/smcquranlive/quranradiolive/icecast.audio','https://backup.qurango.net/radio/mix']},
 {id:'jordan',n:'Jordan FM',f:99.0,c:'Jordan Radio · Amman',u:['https://jrtv-live.ercdn.net/jrradio/jordanradio.m3u8','https://jrtv-live.ercdn.net/jrradio/jordanradiovideo.m3u8']},
 {id:'wakeel',n:'Al Wakeel · Radio Hala',f:102.1,c:'برنامج الوكيل · 7–10 AM',u:['https://hala-alrayamedia.radioca.st/;','https://hala-alrayamedia.radioca.st/stream']},
 {id:'adfm',n:'Abu Dhabi FM',f:95.1,c:'Abu Dhabi Media',u:[ADM+'abudhabi_fm/abudhabi_fm_hls_nd/index_adfm_audio_enc_ara.m3u8']},
 {id:'adclassic',n:'Abu Dhabi Classic FM',f:91.6,c:'Classical · UAE',u:[ADM+'classic_fm/classic_fm_hls_nd/index_classicfm_audio_enc_ara.m3u8']},
 {id:'star',n:'Star FM',f:101.0,c:'Abu Dhabi Media',u:[ADM+'star_fm/star_fm_hls_nd/index_starfm_audio_enc_ara.m3u8']},
 {id:'sharjahq',n:'Quran Radio Sharjah',f:102.7,c:'Sharjah · UAE',u:['https://l3.itworkscdn.net/smcquranlive/quranradiolive/icecast.audio']},
 {id:'tarateel',n:'Quran Tarateel',f:88.4,c:'Mp3Quran',u:['https://qurango.net/radio/tarateel','https://backup.qurango.net/radio/mix']},
 {id:'skyar',n:'Sky News Arabia Radio',f:90.3,c:'News · Abu Dhabi',u:['https://stream.skynewsarabia.com/hls/sna.m3u8']}];
const custom=()=>{try{return JSON.parse(LS.rrSt||'[]')}catch(e){return[]}};
const stations=()=>[...BASE_ST,...custom()];
const rau=$('#rau');let rIdx=-1,rHls=null,rTry=0,rRound=0,rTimer=null,rOn=false;
function rStat(t){$('#rdStat').textContent=t}
function rStop(){clearTimeout(rTimer);if(rHls){rHls.destroy();rHls=null}rau.pause();rau.removeAttribute('src');rau.load();rOn=false;$('#rdPlay').textContent='▶';$('#onair').className='onair';$('#onair').innerHTML='<i></i>OFF AIR'}
function rLoad(u){if(rHls){rHls.destroy();rHls=null}if(/\.m3u8/.test(u)&&window.Hls&&Hls.isSupported()){rHls=new Hls({enableWorker:true});rHls.on(Hls.Events.ERROR,(e,d)=>{if(d.fatal)rFail()});rHls.loadSource(u);rHls.attachMedia(rau)}else{rau.src=u;rau.load()}rau.play().catch(()=>{})}
function rFail(){const s=stations()[rIdx];if(!s)return;clearTimeout(rTimer);rTry++;if(rTry<s.u.length){rStat(`Failover → source ${rTry+1}/${s.u.length}…`);rLoad(s.u[rTry]);rTimer=setTimeout(()=>!rOn&&rFail(),15000)}else if(!rRound){rRound=1;rTry=-1;rStat('Retrying…');setTimeout(()=>{rTry=0;rLoad(s.u[0]);rTimer=setTimeout(()=>!rOn&&rFail(),15000)},1500)}else{rStop();rStat('✗ Station offline on all sources');toast(s.n+' is offline right now')}}
function radioPlay(i){const s=stations()[i];if(!s)return;rStop();rIdx=i;rTry=0;rRound=0;LS.rrStIdx=i;$('#rdName').textContent=s.n;$('#rdSub').textContent=s.f.toFixed(1)+' MHz · '+(s.c||'Custom');$('#tileSt').textContent=s.n+' '+s.f.toFixed(1);
 needle(s.f);rStat('Tuning '+s.f.toFixed(1)+' MHz…');$('#rdPlay').textContent='⏸';renderRadio();rLoad(s.u[0]);rTimer=setTimeout(()=>!rOn&&rFail(),15000);chime('info')}
window.radioPlay=radioPlay;
rau.addEventListener('playing',()=>{rOn=true;clearTimeout(rTimer);const s=stations()[rIdx];rStat(`● Live · source ${rTry+1}/${s.u.length} · ${/m3u8/.test(s.u[rTry])?'HLS':'Icecast'}`);$('#onair').className='onair live';$('#onair').innerHTML='<i></i>LIVE ON AIR';B&&B.mediaState&&B.mediaState(s.n,true)});
rau.addEventListener('error',()=>{if(rIdx>=0&&rau.getAttribute('src'))rFail()});
rau.volume=(+LS.rrRVol||80)/100;$('#rdVol').value=Math.round(rau.volume*100);$('#rdVol').oninput=e=>{rau.volume=e.target.value/100;LS.rrRVol=e.target.value};
$('#rdPlay').onclick=()=>rOn||rau.getAttribute('src')?rStop():radioPlay(rIdx<0?(+LS.rrStIdx||0):rIdx);
const sorted=()=>stations().map((s,i)=>({s,i})).sort((a,b)=>a.s.f-b.s.f);
function seek(d){const L=sorted();const cur=rIdx<0?88:stations()[rIdx].f;let n=d>0?L.find(x=>x.s.f>cur+.01):[...L].reverse().find(x=>x.s.f<cur-.01);if(!n)n=d>0?L[0]:L[L.length-1];radioPlay(n.i)}
$('#rdSeekL').onclick=()=>seek(-1);$('#rdSeekR').onclick=()=>seek(1);
$('#m3d').onclick=e=>{e.currentTarget.classList.toggle('on');toast('Meridian 3D Surround '+(e.currentTarget.classList.contains('on')?'ON':'OFF'))};
const fx=f=>((f-87.5)/(108-87.5))*100;
function needle(f){$('#needle').style.left=fx(f)+'%'}
function drawScale(){const c=$('#fmScale'),x=c.getContext('2d'),W=c.width,H=c.height;x.clearRect(0,0,W,H);x.font='20px Michroma';x.textAlign='center';
 for(let f=875;f<=1080;f+=1){const X=(f-875)/(1080-875)*W;const big=f%10===0;x.strokeStyle=big?'rgba(255,255,255,.85)':'rgba(255,255,255,.3)';x.lineWidth=big?2:1;x.beginPath();x.moveTo(X,H-8);x.lineTo(X,H-(big?34:f%5===0?24:16));x.stroke();if(big&&f<1080)x.fillStyle='rgba(242,228,198,.9)',x.fillText((f/10).toFixed(0),X,30)}
 stations().forEach(s=>{const X=fx(s.f)/100*W;x.fillStyle='#d4b483';x.beginPath();x.arc(X,46,4,0,7);x.fill()})}
function renderRadio(){const S=stations(),cur=rIdx;const card=(s,i)=>`<div class="rd-card${i===cur?' on':''}" data-r="${i}"><div><small>${esc(s.c||'Custom station')}</small><div class="mhz">${s.f.toFixed(1)}</div></div><div class="nm">${esc(s.n)}</div>${s.custom?`<div class="ed"><button data-ed="${i}">✎</button><button data-del="${i}">🗑</button></div>`:''}</div>`;
 $('#rdTop').innerHTML=S.slice(0,4).map(card).join('')+`<div class="rd-card rd-add" data-add>＋</div>`;$('#rdList').innerHTML=S.map(card).join('');
 $$('#s-radio [data-r]').forEach(d=>d.onclick=e=>{if(e.target.dataset.ed!=null){stEdit(+e.target.dataset.ed);return}if(e.target.dataset.del!=null){stDel(+e.target.dataset.del);return}radioPlay(+d.dataset.r)});
 $$('#s-radio [data-add]').forEach(d=>d.onclick=()=>stEdit(-1));drawScale()}
let stEd=-1;$('#rdAddBtn').onclick=()=>stEdit(-1);
function stEdit(i){stEd=i;const s=i>=0?stations()[i]:{n:'',f:'',u:['']};$('#stT').textContent=i>=0?'Edit Station':'Add Station';$('#stName').value=s.n;$('#stMhz').value=s.f;$('#stUrl').value=s.u[0];$('#stStat').textContent='';openM('station')}
function stDel(i){const c=custom();const k=i-BASE_ST.length;if(k<0)return;const n=c[k].n;c.splice(k,1);LS.rrSt=JSON.stringify(c);if(rIdx===i)rStop();renderRadio();toast(n+' removed')}
$('#stTest').onclick=()=>{const u=$('#stUrl').value.trim();if(!/^https?:\/\//.test(u)){$('#stStat').textContent='Enter an http(s) stream URL';return}$('#stStat').textContent='Testing…';const a=new Audio();a.volume=.01;let h=null;
 const done=ok=>{$('#stStat').textContent=ok?'✓ Stream is live':'✗ Could not play this URL';try{h&&h.destroy()}catch(e){}a.pause();a.removeAttribute('src')};
 a.onplaying=()=>done(true);a.onerror=()=>done(false);if(/\.m3u8/.test(u)&&window.Hls&&Hls.isSupported()){h=new Hls();h.loadSource(u);h.attachMedia(a)}else a.src=u;a.play().catch(()=>{});setTimeout(()=>{if($('#stStat').textContent==='Testing…')done(false)},15000)};
$('#stSave').onclick=()=>{const n=$('#stName').value.trim(),f=parseFloat($('#stMhz').value),u=$('#stUrl').value.trim();
 if(!n||!(f>=87.5&&f<=108)||!/^https?:\/\//.test(u)){$('#stStat').textContent='Name, a frequency 87.5–108.0 and an http(s) URL are required';return}
 const c=custom(),o={id:'c'+Date.now(),n,f,c:'Custom station',u:[u],custom:true};if(stEd>=BASE_ST.length)c[stEd-BASE_ST.length]=o;else c.push(o);LS.rrSt=JSON.stringify(c);$('#m-station').classList.remove('open');renderRadio();toast(n+' saved');chime('ok')};
// spectrum visualiser (animated; cross-origin streams can't be tapped by Web Audio without muting them)
(function spec(){if(curScreen==='radio'){const c=$('#spec'),x=c.getContext('2d'),W=c.width,H=c.height,n=64,bw=W/n;x.clearRect(0,0,W,H);const t=performance.now()/1000;
 for(let i=0;i<n;i++){const v=rOn&&!rau.paused?(.25+.55*Math.abs(Math.sin(t*2.1+i*.37)*Math.cos(t*1.3+i*.11))+Math.random()*.2)*rau.volume:.03;const h=v*H;const g=x.createLinearGradient(0,H,0,H-h);g.addColorStop(0,'rgba(212,180,131,.9)');g.addColorStop(1,'rgba(255,255,255,.9)');x.fillStyle=g;x.fillRect(i*bw+2,H-h,bw-4,h)}}requestAnimationFrame(spec)})();
hooks.radio=()=>{renderRadio();if(rIdx<0){const s=stations()[+LS.rrStIdx||0];$('#rdName').textContent=s.n;$('#rdSub').textContent=s.f.toFixed(1)+' MHz · '+s.c;needle(s.f)}};
// stop the old synth music if something still calls it
window.musicStart=()=>radioPlay(+LS.rrStIdx||0);

// ================= NETFLIX-STYLE CINEMA =================
const NFC=[['#7a0b12','#1a0204'],['#0c3b5e','#020b14'],['#4b2a73','#0e0618'],['#6b4a12','#140c02'],['#114d3a','#02100b'],['#5a1238','#12020b'],['#283244','#07090d']];
const hash=s=>{let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))|0;return Math.abs(h)};
function genPoster(x,k){const t=cleanName(x.name),cat=vcName(k,x.category_id)||(k==='m'?'Film':'Series'),r=+x.rating||+(x.rating_5based*2)||0,[a,b]=NFC[hash(t)%NFC.length];
 return `<div class="gp" style="background:radial-gradient(120% 80% at 30% 10%,${a},${b})"><div><div class="gn">N</div><div class="gc">${esc(cat).slice(0,28)}</div></div><div><div class="gt">${esc(t)}</div>${r?`<div class="gr">★ ${r.toFixed(1)}</div>`:''}</div></div>`}
const vcName=(k,id)=>((k==='m'?X.vcats:X.scats).find(c=>c.category_id==id)||{}).category_name;
const artOf=(x,k)=>x._img||(k==='m'?x.stream_icon:x.cover)||'';
function cardEl(x,k,rank){const d=document.createElement('div');d.className='nf-card';const img=artOf(x,k);
 d.innerHTML=`<div class="nf-art">${genPoster(x,k)}<span class="nfe">N</span></div><div class="t">${esc(cleanName(x.name))}</div>`;
 if(img&&/^(https?:|assets\/)/.test(img)){const im=new Image();im.referrerPolicy='no-referrer';im.loading='lazy';im.alt='';im.onload=()=>{if(im.naturalWidth>20){const a=d.querySelector('.nf-art');a.querySelector('.gp')?.remove();a.prepend(im)}};im.src=img}
 d.onclick=()=>x.demo?openM('xt'):openDetail(x,k);if(rank){const w=document.createElement('div');w.className='nf-rank';w.innerHTML=`<span class="num">${rank}</span>`;w.appendChild(d);return w}return d}
function row(title,items,k,ranked){if(!items.length)return null;const r=document.createElement('div');r.className='nf-row';r.innerHTML=`<h3>${title}</h3><div class="nf-strip"></div>`;const s=r.lastChild;items.forEach((x,i)=>s.appendChild(cardEl(x,k,ranked?i+1:0)));return r}
const NF={m:{cat:'all',q:''},s:{cat:'all',q:''}};
const demoList=k=>DEMO[k].map((d,i)=>({name:d[0],_img:'assets/'+d[1],demo:1,rating:8.9-i*.3,category_id:'demo'}));
function lib(k){return k==='m'?X.vod:X.ser}
const rate=x=>+x.rating||(+x.rating_5based||0)*2;
function vodInit(k){const cats=k==='m'?X.vcats:X.scats,box=$('#'+k+'cats');const top=cats.slice(0,60);
 box.innerHTML=`<button class="nf-pill on" data-vc="all">🏠 Home</button><button class="nf-pill" data-vc="top">🔥 Top Rated</button>`+top.map(c=>`<button class="nf-pill" data-vc="${esc(c.category_id)}">${esc(unsup(c.category_name).trim())}</button>`).join('');
 box.querySelectorAll('[data-vc]').forEach(b=>b.onclick=()=>{NF[k].cat=b.dataset.vc;box.querySelectorAll('[data-vc]').forEach(x=>x.classList.toggle('on',x===b));vodFilter(k)});vodFilter(k)}
let gridList={m:[],s:[]},gridShown={m:0,s:0};
function vodFilter(k){const st=NF[k];st.q=(V[k].q||'').trim();let a=lib(k);const home=$('#'+k+'home'),grid=$('#'+k+'grid');home.innerHTML='';grid.innerHTML='';
 if(!a.length){home.appendChild(hero(demoList(k)[0],k));home.appendChild(row(k==='m'?'Top 10 Today':'Top 10 Series Today',demoList(k),k,true));
  const n=document.createElement('div');n.className='muted';n.style.padding='10px 4px';n.textContent=`Connect your IPTV subscription to load your ${k==='m'?'movies':'series'} library.`;home.appendChild(n);return}
 if(st.q||st.cat!=='all'){if(st.cat==='top')a=[...a].sort((x,y)=>rate(y)-rate(x)).slice(0,300);else if(st.cat!=='all')a=a.filter(x=>x.category_id==st.cat);if(st.q)a=a.filter(x=>unsup(x.name).toUpperCase().includes(st.q));
  gridList[k]=a;gridShown[k]=0;if(!a.length){home.innerHTML='<div class="muted" style="padding:20px">No titles match.</div>'}vodMore(k);k==='s'&&($('#sInfo').textContent=a.length.toLocaleString()+' series');return}
 const recent=[...a].sort((x,y)=>(+y.added||+y.last_modified||0)-(+x.added||+x.last_modified||0));
 const top=[...recent.slice(0,400)].sort((x,y)=>rate(y)-rate(x)).filter(x=>artOf(x,k)).slice(0,10);const T=top.length?top:recent.slice(0,10);
 home.appendChild(hero(T[0],k));home.appendChild(row(k==='m'?'Top 10 Movies Today':'Top 10 Series Today',T,k,true));
 const cw=JSON.parse(LS['rrCW'+k]||'[]').map(id=>a.find(x=>(x.stream_id||x.series_id)==id)).filter(Boolean);
 const add=(t,l)=>{const r=row(t,l.slice(0,30),k);r&&home.appendChild(r)};
 add(cw.length?'Continue Watching':'Featured · New Arrivals',cw.length?cw:recent.slice(10,40));if(cw.length)add('Featured · New Arrivals',recent.slice(10,40));
 const cats=k==='m'?X.vcats:X.scats;const byCat=re=>{const ids=new Set(cats.filter(c=>re.test(unsup(c.category_name))).map(c=>c.category_id));return recent.filter(x=>ids.has(x.category_id)||re.test(x.name))};
 add('Arabic · عربي',byCat(/(\bAR\b|ARAB|عرب|EGYPT|مصر|KHALEEJ|خليج|SYRIA|سوري)/i));
 add('Action & Blockbusters',byCat(/(ACTION|أكشن|اكشن|BLOCKBUSTER|ADVENTURE|مغامر|THRILLER)/i));
 cats.slice(0,8).forEach(c=>{const l=recent.filter(x=>x.category_id==c.category_id);l.length>=5&&add(esc(unsup(c.category_name).trim()),l)});
 k==='s'&&($('#sInfo').textContent=a.length.toLocaleString()+' series')}
function vodMore(k){const g=$('#'+k+'grid'),L=gridList[k],f=document.createDocumentFragment();L.slice(gridShown[k],gridShown[k]+60).forEach(x=>f.appendChild(cardEl(x,k)));gridShown[k]+=60;g.querySelector('.more')?.remove();g.appendChild(f);
 if(gridShown[k]<L.length){const m=document.createElement('div');m.className='more';m.style.gridColumn='1/-1';m.textContent='Loading more…';m.onclick=()=>vodMore(k);g.appendChild(m);vio.observe(m)}}
function hero(x,k){const d=document.createElement('div');d.className='nf-hero glass';const img=artOf(x,k);const q=(quals(x.name)[0])||'HD';
 d.innerHTML=`<div class="bg" style="${img?`background-image:url('${String(img).replace(/'/g,'')}')`:'background:radial-gradient(circle at 70% 30%,#7a0b12,#090909)'}"></div>${img?`<div class="side"><img src="${esc(img)}" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover" alt=""></div>`:''}
 <div class="in"><div class="row" style="gap:8px"><span class="nf-n" style="font-size:30px">N</span><span class="cap">${k==='m'?'FILM':'SERIES'} · RANGE ROVER CINEMA</span></div><h1>${esc(cleanName(x.name))}</h1>
 <div class="nf-meta"><span class="nf-match">98% Match</span>${x.year?`<span>${esc(x.year)}</span>`:''}${rate(x)?`<span>★ ${rate(x).toFixed(1)}</span>`:''}<span class="nf-q4">4K ULTRA HD · DOLBY ATMOS</span><span class="nf-q4">${q}</span></div>
 <div class="nf-syn" id="${k}heroSyn">${esc(x.plot||'Experience it in Range Rover Cinema — Meridian 3D surround, cabin ambient dimmed, the road behind you.')}</div>
 <button class="nf-btn play">▶ PLAY NOW</button><button class="nf-btn info">ℹ MORE INFO</button></div>`;
 d.querySelector('.play').onclick=()=>x.demo?openM('xt'):(k==='m'?playMovie(x):openDetail(x,k));d.querySelector('.info').onclick=()=>x.demo?openM('xt'):openDetail(x,k);
 if(!x.demo&&k==='m'&&x.stream_id)api('get_vod_info','&vod_id='+x.stream_id).then(j=>{const p=j&&j.info&&(j.info.plot||j.info.description);if(p)d.querySelector('.nf-syn').textContent=p;const bd=j&&j.info&&j.info.backdrop_path&&j.info.backdrop_path[0];if(bd)d.querySelector('.bg').style.backgroundImage=`url('${bd.replace(/'/g,'')}')`}).catch(()=>{});
 if(!x.demo&&k==='s'&&x.plot)d.querySelector('.nf-syn').textContent=x.plot;return d}
function cwAdd(k,id){const l=JSON.parse(LS['rrCW'+k]||'[]').filter(v=>v!=id);l.unshift(id);LS['rrCW'+k]=JSON.stringify(l.slice(0,20))}
function playMovie(x,fs){cwAdd('m',x.stream_id);playVod(x);if(fs){const v=$('#vp');(v.requestFullscreen||v.webkitRequestFullscreen||(()=>{})).call(v)}}
async function openDetail(x,k){const box=$('#dtBox');const q=quals(x.name)[0]||'HD';const img=artOf(x,k);
 box.innerHTML=`<div class="row"><span class="nf-n" style="font-size:32px">N</span><span class="nf-tag ${k==='m'?'gold':'red'}">${k==='m'?'N FILM':'N SERIES'}</span><span class="sp"></span><button class="btn" data-close>✕</button></div>
 <div class="dh" style="margin-top:12px"><div class="nf-art" id="dtArt">${genPoster(x,k)}</div><div><h1 style="font-family:Bebas;font-weight:400;font-size:44px;line-height:.95">${esc(cleanName(x.name))}</h1>
 <div class="nf-meta"><span class="nf-match">98% Match</span><span class="nf-q4">${q}</span><span class="nf-q4">DOLBY ATMOS</span>${rate(x)?`<span>★ ${rate(x).toFixed(1)}</span>`:''}<span class="muted">${esc(vcName(k,x.category_id)||'')}</span></div>
 <p class="nf-syn" id="dtPlot" style="-webkit-line-clamp:6">${esc(x.plot||'Loading details…')}</p>
 ${k==='m'?`<button class="nf-btn play" id="dtPlay">▶ PLAY MOVIE</button><button class="nf-btn" id="dtFs">⛶ FULLSCREEN</button>`:''}</div></div>
 ${k==='s'?`<div class="row" id="dtSeasons" style="margin-top:14px"></div><div id="dtEps" style="margin-top:8px"><div class="muted">Loading episodes…</div></div>`:''}<div id="dtSim"></div>`;
 if(img){const im=new Image();im.referrerPolicy='no-referrer';im.style.cssText='width:100%;height:100%;object-fit:cover';im.onload=()=>{const a=$('#dtArt');a.innerHTML='';a.appendChild(im)};im.src=img}
 openM('detail');const sim=lib(k).filter(y=>y.category_id==x.category_id&&y!==x).slice(0,20);const r=row('More Like This',sim,k);r&&$('#dtSim').appendChild(r);
 if(k==='m'){$('#dtPlay').onclick=()=>{$('#m-detail').classList.remove('open');playMovie(x)};$('#dtFs').onclick=()=>{$('#m-detail').classList.remove('open');playMovie(x,true)};
  try{const j=await api('get_vod_info','&vod_id='+x.stream_id);const i=j.info||{};$('#dtPlot').textContent=i.plot||i.description||'No synopsis available.'}catch(e){$('#dtPlot').textContent='No synopsis available.'}}
 else{cwAdd('s',x.series_id);try{const info=await api('get_series_info','&series_id='+x.series_id);$('#dtPlot').textContent=(info.info&&info.info.plot)||x.plot||'';const eps=info.episodes||{};const ss=Object.keys(eps);
  const show=s=>{$$('#dtSeasons .chip').forEach(b=>b.classList.toggle('on',b.dataset.s==s));$('#dtEps').innerHTML=(eps[s]||[]).map(e=>`<div class="ep" data-e="${esc(e.id)}" data-x="${esc(e.container_extension||'mp4')}"><b>${e.episode_num}</b><span class="sp">${esc(e.title||'Episode '+e.episode_num)}</span><span>▶</span></div>`).join('');
   $$('#dtEps [data-e]').forEach(p=>p.onclick=()=>{const c=cfg();$('#m-detail').classList.remove('open');vpOpen(`${H||hostsOf(c)[0]}/series/${c.user}/${c.pass}/${p.dataset.e}.${p.dataset.x}`)})};
  $('#dtSeasons').innerHTML=ss.map(s=>`<button class="chip" data-s="${s}">Season ${s}</button>`).join('');$$('#dtSeasons .chip').forEach(b=>b.onclick=()=>show(b.dataset.s));ss.length?show(ss[0]):$('#dtEps').innerHTML='<div class="muted">No episodes.</div>'}
  catch(e){$('#dtEps').innerHTML='<div class="muted">Could not load episodes.</div>'}}}
window.openSeries=x=>openDetail(x,'s');

// ================= LIVE TV FULLSCREEN =================
const PL=$('#s-iptv .player'),MV=$('#mv');let idleT=null;
const isFs=()=>PL.classList.contains('fs');
function fsEnter(){PL.classList.add('fs');document.body.appendChild(PL);try{(PL.requestFullscreen||PL.webkitRequestFullscreen).call(PL).catch?.(()=>{})}catch(e){}poke();chime('info')}
function fsExit(){PL.classList.remove('fs','idle');$('#fsd').classList.remove('on');$('#s-iptv .hub .cats').after(PL);try{if(document.fullscreenElement)document.exitFullscreen()}catch(e){}}
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&isFs())fsExit()});
function poke(){PL.classList.remove('idle');clearTimeout(idleT);idleT=setTimeout(()=>isFs()&&!$('#fsd').classList.contains('on')&&PL.classList.add('idle'),3500)}
$('#fsBtn').onclick=()=>isFs()?fsExit():fsEnter();$$('[data-fs]').forEach(b=>b.onclick=e=>{e.stopPropagation();fsEnter()});$('#fsExit').onclick=e=>{e.stopPropagation();fsExit()};
let lastTap=0;MV.addEventListener('click',()=>{const n=Date.now();if(n-lastTap<320){isFs()?fsExit():fsEnter();lastTap=0;return}lastTap=n;if(!isFs())setTimeout(()=>{if(lastTap===n&&!isFs())fsEnter()},330);else poke()});
PL.addEventListener('mousemove',()=>isFs()&&poke());PL.addEventListener('touchstart',()=>isFs()&&poke(),{passive:true});
function step(d){if(!view.length)return;let i=view.indexOf(curCh);i=(i+d+view.length)%view.length;play(view[i]);poke();toast(view[i]._n)}
$('#fsPrev').onclick=()=>step(-1);$('#fsNext').onclick=()=>step(1);
$('#fsDrw').onclick=()=>{const d=$('#fsd');d.classList.toggle('on');if(d.classList.contains('on')){d.innerHTML='<div class="cap" style="padding:6px 4px 10px;display:flex;justify-content:space-between;align-items:center">Channels<button class="chip" id="fsdX">✕</button></div>'+view.slice(0,300).map((s,i)=>`<div class="ch${s===curCh?' on':''}" data-i="${i}"><div class="mono">${mono(s.name)}</div><div class="nm"><div>${esc(s._n)}</div></div>${qb(s._q)}</div>`).join('');
$('#fsdX').onclick=e=>{e.stopPropagation();d.classList.remove('on');poke()}; d.querySelectorAll('[data-i]').forEach(c=>c.onclick=()=>{play(view[+c.dataset.i]);d.classList.remove('on');poke()})}poke()};
$$('[data-ar]').forEach(b=>b.onclick=()=>{$$('[data-ar]').forEach(x=>x.classList.toggle('on',x===b));PL.classList.remove('ar-fill','ar-169');b.dataset.ar!=='fit'&&PL.classList.add('ar-'+b.dataset.ar);poke()});
$('#fsMute').onclick=()=>{MV.muted=!MV.muted;$('#fsMute').textContent=MV.muted?'🔇':'🔊';poke()};$('#fsVol').oninput=e=>{MV.volume=e.target.value/100;MV.muted=false;$('#fsMute').textContent='🔊'};

// ================= ANDROID BACK =================
window.rrBack=function(){if(isFs()){fsExit();return 'fs'}if($('#vp').classList.contains('on')){$('#vpX').click();return 'vp'}const m=document.querySelector('.modal.open');if(m){m.classList.remove('open');return 'modal'}if(curScreen!=='home'){go('home');return 'home'}return 'none'};
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&isFs())fsExit()});
window.addEventListener('load',()=>{renderRadio();hooks.radio();applyPhoto()});
