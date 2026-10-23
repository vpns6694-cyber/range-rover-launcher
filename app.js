'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const B=window.AndroidSystemBridge||null;
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2200)};
// ---------- Audio: JLR-style harmonic chimes ----------
let AC;const ac=()=>AC||(AC=new (window.AudioContext||window.webkitAudioContext)());
function chime(kind='info'){if(!$('#chimesOn').checked)return;try{const c=ac(),now=c.currentTime;
 const seq=kind==='warn'?[880,880]:kind==='ok'?[659,988]:[784,1175];
 seq.forEach((f,i)=>[1,2,3].forEach((h,k)=>{const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f*h;const t=now+i*.22;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.18/(k+1)/h,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+1.1);o.connect(g).connect(c.destination);o.start(t);o.stop(t+1.2)}))}catch(e){}}
// ---------- Clock / navigation ----------
function tick(){const d=new Date();$('#clock').textContent=d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});$('#date').textContent=d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
 const h=d.getHours();$('#greet').textContent=`Good ${h<12?'morning':h<18?'afternoon':'evening'}, Abdalla`}
tick();setInterval(tick,10000);
function go(id){$$('.pivi-screen').forEach(s=>s.classList.toggle('active',s.id==='screen-'+id));$$('[data-go]').forEach(b=>b.classList&&b.matches('.side-nav-btn,.dock-item')&&b.classList.toggle('active',b.dataset.go===id));
 if(id==='nav')setTimeout(initMap,60);if(id==='iptv'&&!cur)play(channels[0])}
document.addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(g)go(g.dataset.go);const a=e.target.closest('[data-act]');if(a)sys(a.dataset.act);
 const l=e.target.closest('[data-layout]');if(l)setLayout(l.dataset.layout);const th=e.target.closest('[data-theme]');if(th){document.body.classList.remove('theme-blue','theme-gold');th.dataset.theme&&document.body.classList.add(th.dataset.theme);
 $$('[data-theme]').forEach(x=>x.classList.toggle('active',x===th));localStorage.rrTheme=th.dataset.theme}});
function setLayout(m){document.body.classList.remove('layout-grid','layout-cockpit');document.body.classList.add('layout-'+m);$$('[data-layout]').forEach(x=>x.classList.toggle('active',x.dataset.layout===m));localStorage.rrLayout=m}
setLayout(localStorage.rrLayout||'grid');if(localStorage.rrTheme)document.body.classList.add(localStorage.rrTheme);
let lr=false;$('#brandSwitch').onclick=()=>{lr=!lr;$('#brandImg').src=lr?'assets/land-rover-oval.png':'assets/range-rover-wordmark.png'};
// ---------- Android bridge ----------
function sys(a){const map={wifi:'openWifi',bt:'openBluetooth',hotspot:'openHotspot',dialer:'openDialer',home:'openHomeSettings',system:'openSettings',carplay:'openAndroidAuto'};
 if(B&&B[map[a]]){B[map[a]]();toast('Opening '+a)}else toast('Android system action: '+a+' (available in the APK)')}
$('#sbWifi').onclick=()=>sys('wifi');$('#sbBt').onclick=()=>sys('bt');
$('#bright').oninput=e=>{const v=e.target.value/100;document.documentElement.style.setProperty('--ui-brightness',v);B&&B.setBrightness&&B.setBrightness(Math.round(v*255))};
$('#testChime').onclick=()=>chime('ok');
function loadApps(){let apps=[];try{apps=B&&B.getInstalledApps?JSON.parse(B.getInstalledApps()):[]}catch(e){}
 if(!apps.length)apps=['YouTube','Spotify','WhatsApp','Waze','Chrome','Camera'].map(n=>({name:n,pkg:''}));
 $('#apps').innerHTML=apps.slice(0,40).map(a=>`<div class="cp-app-tile" data-pkg="${a.pkg}"><div class="cp-app-icon">${a.name[0]}</div>${a.name}</div>`).join('');
 $$('#apps [data-pkg]').forEach(t=>t.onclick=()=>B&&t.dataset.pkg?B.launchApp(t.dataset.pkg):toast('App launch works inside the APK'))}
loadApps();
let gate=false;$('#gateBtn').onclick=()=>{gate=!gate;$('#gateTxt').textContent='Smart Gate: '+(gate?'Open':'Closed');chime('ok')};
// ---------- IPTV ----------
const DEMO='https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',DEMO2='https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8';
let channels=[{n:'Sky News (Demo feed)',c:'news',u:DEMO},{n:'Sports Live (Demo feed)',c:'sports',u:DEMO2},{n:'BBC Documentary (Demo feed)',c:'docs',u:DEMO},{n:'Dubai Channel (Demo feed)',c:'news',u:DEMO2}];
let cur=null,hls=null,mp=null,cat='all';
function attach(v,u){if(/\.ts(\?|$)/.test(u)&&window.mpegts&&mpegts.isSupported()){const p=mpegts.createPlayer({type:'mpegts',isLive:true,url:u});p.attachMediaElement(v);p.load();p.play();return p}
 if(v.canPlayType('application/vnd.apple.mpegurl')&&/iPhone|iPad|Macintosh/.test(navigator.userAgent)&&!/Chrome/.test(navigator.userAgent)){v.src=u;v.play().catch(()=>{});return null}
 if(window.Hls&&Hls.isSupported()){const h=new Hls({liveSyncDurationCount:3,maxBufferLength:20});h.loadSource(u);h.attachMedia(v);h.on(Hls.Events.MANIFEST_PARSED,()=>v.play().catch(()=>{}));
  h.on(Hls.Events.ERROR,(e,d)=>{if(d.fatal){d.type==='networkError'?h.startLoad():h.recoverMediaError()}});return h}v.src=u;v.play().catch(()=>{});return null}
function stopMain(){hls&&hls.destroy&&hls.destroy();mp&&mp.destroy&&mp.destroy();hls=mp=null}
function play(ch){if(!ch)return;cur=ch;stopMain();const v=$('#mainVideo');const p=attach(v,ch.u);if(p&&p.loadSource)hls=p;else mp=p;
 $('#nowCh').textContent=ch.n;$('#nowSub').textContent=ch.c.toUpperCase();renderCh()}
function renderCh(){const list=channels.filter(c=>cat==='all'||c.c===cat).slice(0,300);
 $('#chList').innerHTML=list.map((c,i)=>`<div class="channel-row${c===cur?' active':''}" data-i="${channels.indexOf(c)}"><div class="ch-left"><span class="ch-num">${i+1}</span>${c.n.replace(/</g,'&lt;')}</div><span class="ch-badge">${c.c}</span></div>`).join('');
 $$('#chList .channel-row').forEach(r=>r.onclick=()=>play(channels[r.dataset.i]))}
$$('#catTabs .pill-tab').forEach(t=>t.onclick=()=>{cat=t.dataset.cat;$$('#catTabs .pill-tab').forEach(x=>x.classList.toggle('active',x===t));renderCh()});
let quadP=[];$('#quadBtn').onclick=()=>{const q=$('#quad'),on=!q.classList.contains('active');q.classList.toggle('active',on);quadP.forEach(p=>p&&p.destroy&&p.destroy());quadP=[];q.innerHTML='';
 if(on){const four=[...channels.slice(0,4)];four.forEach(c=>{const d=document.createElement('div');d.className='quad-cell';d.innerHTML=`<video class="iptv-video-el" muted playsinline autoplay></video><span class="quad-label">${c.n}</span>`;q.appendChild(d);quadP.push(attach(d.querySelector('video'),c.u))})}};
renderCh();
// Xtream client (credentials only kept in this device's local storage, never in code)
function cleanServer(u){u=(u||'').trim().replace(/^\*\./,'').replace(/^(https?:\/\/)\*\./,'$1');if(!/^https?:\/\//.test(u))u='http://'+u;const x=new URL(u);if(!x.port&&x.protocol==='http:')x.port='80';return x.origin}
async function get(u){if(B&&B.httpGet){const r=B.httpGet(u);if(r===null||r==='')throw new Error('empty');return r}const r=await fetch(u);if(!r.ok)throw new Error('HTTP '+r.status);return r.text()}
async function xtConnect(server,user,pass,fallbacks=[]){const hosts=[cleanServer(server),...fallbacks.map(cleanServer)];let err;
 for(const h of hosts){try{const api=`${h}/player_api.php?username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`;const info=JSON.parse(await get(api));
  if(!info.user_info||info.user_info.auth==0)throw new Error('Authentication failed');
  const cats=JSON.parse(await get(api+'&action=get_live_categories'));const cm={};cats.forEach(c=>cm[c.category_id]=c.category_name);
  const live=JSON.parse(await get(api+'&action=get_live_streams'));
  channels=live.map(s=>({n:s.name,c:(cm[s.category_id]||'live').slice(0,18),u:`${h}/live/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${s.stream_id}.m3u8`}));
  try{const vod=JSON.parse(await get(api+'&action=get_vod_streams'));window.vod=vod.slice(0,60).map(v=>({n:v.name,img:v.stream_icon,u:`${h}/movie/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${v.stream_id}.${v.container_extension||'mp4'}`}));renderMovies()}catch(e){}
  return {host:h,count:channels.length,exp:info.user_info.exp_date}}catch(e){err=e}}throw err}
const FALLBACK={'business-cloud-neo.com':['http://194.120.144.8:80']};
function fallbackFor(u){for(const k in FALLBACK)if((u||'').includes(k))return FALLBACK[k];return[]}
window.RR={fallbackFor,cleanServer,xtConnect,channels:()=>channels};
async function parseM3U(u){const t=await get(u),out=[];let n='';t.split(/\r?\n/).forEach(l=>{if(l.startsWith('#EXTINF'))n=l.split(',').pop();else if(/^https?:/.test(l))out.push({n:n||'Channel',c:'live',u:l.trim()})});channels=out}
$('#xtOpen').onclick=()=>$('#xtModal').classList.add('open');$('#xtClose').onclick=()=>$('#xtModal').classList.remove('open');
$('#xtGo').onclick=async()=>{const s=$('#xtStatus');s.textContent='Connecting…';try{
 if($('#xtM3u').value){await parseM3U($('#xtM3u').value)}else{const r=await xtConnect($('#xtUrl').value,$('#xtUser').value,$('#xtPass').value,fallbackFor($('#xtUrl').value));
  localStorage.rrXt=JSON.stringify({s:$('#xtUrl').value,u:$('#xtUser').value,p:$('#xtPass').value})}
 s.textContent=`Connected · ${channels.length} channels`;$('#iptvPill').textContent='IPTV ● LIVE';chime('ok');renderCh();play(channels[0]);setTimeout(()=>$('#xtModal').classList.remove('open'),900)}
 catch(e){s.textContent='Connection failed: '+e.message+(B?'':' (browser CORS — use the APK)');chime('warn')}};
if(localStorage.rrXt){try{const x=JSON.parse(localStorage.rrXt);xtConnect(x.s,x.u,x.p,fallbackFor(x.s)).then(()=>{$('#iptvPill').textContent='IPTV ● LIVE';renderCh()}).catch(()=>{})}catch(e){}}
// ---------- Movies / Series ----------
const posters=['dune','interstellar','inception','batman','topgun','horizon','journey','shadows','silent','beyond'];
function renderMovies(){const list=window.vod&&vod.length?vod:posters.map(p=>({n:p[0].toUpperCase()+p.slice(1),img:`assets/poster-${p}.jpg`,u:DEMO}));
 $('#moviesRow').innerHTML=list.map((m,i)=>`<div class="movie-card" data-i="${i}"><img src="${m.img||'assets/poster-dune.jpg'}" alt="" style="width:100%"><div class="movie-card-meta"><div class="movie-card-title">${m.n}</div><div class="movie-card-sub">4K · HDR</div></div></div>`).join('');
 $$('#moviesRow .movie-card').forEach(c=>c.onclick=()=>{const m=list[c.dataset.i];go('iptv');play({n:m.n,c:'movie',u:m.u})})}
renderMovies();
let spatial=null;$$('.cinema-mode-btn').forEach(b=>b.onclick=()=>{const on=!b.classList.contains('active');b.classList.toggle('active',on);const m=b.dataset.cm;
 if(m==='theater'){document.documentElement.style.setProperty('--ui-brightness',on?.55:1)}
 if(m==='hall'||m==='atmos'){try{const c=ac();if(on&&!spatial){const v=$('#mainVideo');spatial=c.createMediaElementSource(v);const cv=c.createConvolver(),len=c.sampleRate*2.2,buf=c.createBuffer(2,len,c.sampleRate);
  for(let ch=0;ch<2;ch++){const d=buf.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6)}cv.buffer=buf;const g=c.createGain();g.gain.value=.4;spatial.connect(c.destination);spatial.connect(cv).connect(g).connect(c.destination)}}catch(e){}}
 toast(b.textContent+(on?' ON':' OFF'));chime(on?'ok':'info')});
const series={tlou:{t:'The Last of Us',img:'assets/series-tlou.jpg'},frontier:{t:'The Frontier',img:'assets/series-frontier.jpg'}};
function renderSeries(k){const s=series[k];$('#seriesTitle').textContent=s.t;$('#seriesHero').style.backgroundImage=`url(${s.img})`;
 $('#epList').innerHTML=Array.from({length:8},(_,i)=>`<div class="episode-row" data-e="${i}">S1 · E${i+1} — Episode ${i+1}<span class="tile-sub"> ${42+i} min</span></div>`).join('');
 $$('#epList .episode-row').forEach(r=>r.onclick=()=>{go('iptv');play({n:`${s.t} S1E${+r.dataset.e+1}`,c:'series',u:DEMO})})}
$$('[data-sr]').forEach(b=>b.onclick=()=>{$$('[data-sr]').forEach(x=>x.classList.toggle('active',x===b));renderSeries(b.dataset.sr)});renderSeries('tlou');
// ---------- Music (Web Audio synth + visualiser) ----------
const tracks=[{t:'Desert Horizon',a:'Pivi Synth Ensemble',img:'assets/album-horizon.jpg',n:[220,277,330,415]},{t:'Night Drive',a:'Meridian Lounge',img:'assets/album-weeknd.jpg',n:[196,247,294,370]}];
let ti=0,mus=null,an=null;
$('#playlist').innerHTML=tracks.map((t,i)=>`<div class="music-rich-tile" data-t="${i}"><img class="music-tile-art" src="${t.img}" alt=""><div class="music-tile-meta"><b>${t.t}</b><br>${t.a}</div></div>`).join('');
$$('#playlist .music-rich-tile').forEach(x=>x.onclick=()=>{ti=+x.dataset.t;stopMusic();startMusic()});
function startMusic(){const c=ac(),t=tracks[ti];$('#npTitle').textContent=t.t;$('#npArtist').textContent=t.a;$('#npArt').src=t.img;an=c.createAnalyser();an.fftSize=256;const g=c.createGain();g.gain.value=.08;g.connect(an).connect(c.destination);
 let step=0;const beat=()=>{const now=c.currentTime,o=c.createOscillator(),e=c.createGain();o.type='triangle';o.frequency.value=t.n[step++%4]*(step%8<4?1:1.5);e.gain.setValueAtTime(.9,now);e.gain.exponentialRampToValueAtTime(.01,now+.45);o.connect(e).connect(g);o.start();o.stop(now+.5)};
 beat();mus=setInterval(beat,375);$('#mPlay').textContent='⏸';B&&B.mediaState&&B.mediaState(t.t,true)}
function stopMusic(){clearInterval(mus);mus=null;$('#mPlay').textContent='▶'}
$('#mPlay').onclick=()=>mus?stopMusic():startMusic();$('#mNext').onclick=()=>{ti=(ti+1)%tracks.length;stopMusic();startMusic()};$('#mPrev').onclick=()=>{ti=(ti+tracks.length-1)%tracks.length;stopMusic();startMusic()};
(function draw(){const cv=$('#wave'),x=cv.getContext('2d');x.clearRect(0,0,cv.width,cv.height);const acc=getComputedStyle(document.body).getPropertyValue('--accent');x.fillStyle=acc;
 const d=new Uint8Array(64);if(an&&mus)an.getByteFrequencyData(d);for(let i=0;i<64;i++){const h=Math.max(3,(d[i]/255)*cv.height);x.fillRect(i*9.4,cv.height-h,6,h)}requestAnimationFrame(draw)})();
// ---------- Navigation + Range Rover cluster ----------
let map,marker,mapped=false;
function initMap(){if(mapped||!window.L)return map&&map.invalidateSize();mapped=true;map=L.map('piviMapContainer',{zoomControl:false,attributionControl:true}).setView([25.1972,55.2744],14);
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);
 marker=L.circleMarker([25.1972,55.2744],{radius:9,color:'#fff',fillColor:'#d41c2c',fillOpacity:1}).addTo(map);
 L.polyline([[25.1972,55.2744],[25.205,55.27],[25.218,55.282],[25.23,55.30]],{color:'#d41c2c',weight:5,opacity:.85}).addTo(map)}
function dial(id,val,max,label,ticks,red){const cv=$(id),x=cv.getContext('2d'),W=cv.width,r=W/2-14,c=W/2,a0=Math.PI*.75,a1=Math.PI*2.25;x.clearRect(0,0,W,W);
 const acc=getComputedStyle(document.body).getPropertyValue('--accent').trim();x.lineCap='round';
 x.lineWidth=W/30;x.strokeStyle='rgba(255,255,255,.08)';x.beginPath();x.arc(c,c,r,a0,a1);x.stroke();
 const a=a0+(a1-a0)*Math.min(val/max,1);const g=x.createLinearGradient(0,W,W,0);g.addColorStop(0,'#fff');g.addColorStop(1,acc);x.strokeStyle=g;x.beginPath();x.arc(c,c,r,a0,a);x.stroke();
 x.fillStyle='#9aa3b2';x.font=`${W/22}px sans-serif`;x.textAlign='center';x.textBaseline='middle';
 for(let i=0;i<=ticks;i++){const t=a0+(a1-a0)*i/ticks,v=Math.round(max*i/ticks);x.strokeStyle=red&&v>=red?acc:'rgba(255,255,255,.5)';x.lineWidth=2;x.beginPath();x.moveTo(c+Math.cos(t)*(r-12),c+Math.sin(t)*(r-12));x.lineTo(c+Math.cos(t)*(r-22),c+Math.sin(t)*(r-22));x.stroke();
  if(W>200)x.fillText(v,c+Math.cos(t)*(r-38),c+Math.sin(t)*(r-38))}
 x.strokeStyle=acc;x.lineWidth=3;x.shadowColor=acc;x.shadowBlur=12;x.beginPath();x.moveTo(c,c);x.lineTo(c+Math.cos(a)*(r-8),c+Math.sin(a)*(r-8));x.stroke();x.shadowBlur=0;
 if(label){x.fillStyle='#fff';x.font=`${W/12}px sans-serif`;x.fillText(label,c,c+r*.62)}}
let speed=0,target=0,limit=120,over=false,drive=null,dist=300;
function render(){speed+=(target-speed)*.08;const rpm=speed<1?0.8:Math.min(6.5,1.2+(speed%45)/12);dial('#speedo',speed,260,'',13);dial('#rpm',rpm,8,`${rpm.toFixed(1)}`,8,6.5);
 $('#kmh').textContent=Math.round(speed);$('#gear').textContent=speed<1?'P':speed>110?'S':'D';const o=speed>limit;$('#limit').style.boxShadow=o?'0 0 24px #dc2626':'';
 if(o&&!over)chime('warn');over=o;requestAnimationFrame(render)}
render();
$('#demoDrive').onclick=()=>{if(drive){clearInterval(drive);drive=null;target=0;return}let t=0;dist=300;toast('Demo Drive: 0–140 km/h');chime('info');
 drive=setInterval(()=>{t++;target=t<40?t*3.5:t<70?140:t<90?110:0;dist=Math.max(0,dist-speed/20);$('#turnDist').textContent=Math.round(dist)+' m';
  if(Math.round(dist)===100||(dist<=0&&t%40===0))chime('info');if(marker&&map){const p=marker.getLatLng();marker.setLatLng([p.lat+speed/1e6,p.lng+speed/2e6])}if(t>100){clearInterval(drive);drive=null;target=0}},200)};
$('#gpsDrive').onclick=()=>{if(!navigator.geolocation)return toast('GPS unavailable');navigator.geolocation.watchPosition(p=>{target=(p.coords.speed||0)*3.6;initMap();marker&&marker.setLatLng([p.coords.latitude,p.coords.longitude]);map&&map.panTo([p.coords.latitude,p.coords.longitude])},()=>toast('Location permission needed'),{enableHighAccuracy:true});toast('Live GPS speed active')};
$('#aiRoute').onclick=()=>{toast('AI Route: fastest via E11 · avoiding 2 congestion zones');$('#eta').textContent='16 min';chime('ok')};
// ---------- Vehicle ----------
const temps={L:22,R:22};$$('.metallic-bezel-dial').forEach(d=>{let y0=null;d.onwheel=e=>{e.preventDefault();adj(d.dataset.zone,e.deltaY<0?.5:-.5)};d.onclick=e=>{const r=d.getBoundingClientRect();adj(d.dataset.zone,e.clientY<r.top+r.height/2?.5:-.5)}});
function adj(z,dv){temps[z]=Math.min(28,Math.max(16,temps[z]+dv));$('#t'+z).textContent=temps[z].toFixed(1)+'°C';$('#cabinTemp').textContent=$('#dockTemp').textContent=(z==='L'?'❄ ':'')+temps.L.toFixed(1)+'°C';$('#cabinTemp').textContent=temps.L.toFixed(1)+'°C'}
$$('.seat-zone').forEach(z=>z.onclick=()=>{z.classList.toggle('on');const on=$$('.seat-zone.on').map(x=>x.dataset.z);$('#seatInfo').textContent=on.length?'Massage + Ventilation: '+on.join(', '):'Tap a zone'});
$$('[data-h]').forEach(b=>b.onclick=()=>{$$('[data-h]').forEach(x=>x.classList.toggle('active',x===b));$('#suspCar').style.transform=`translateY(${-b.dataset.h}px)`;chime('info')});
// ---------- Automated workflows ----------
const WF={commute:['❄ Pre-cool cabin to 21°C','➤ Traffic route optimised','♪ Play Evening Playlist','✉ Send arrival ETA'],arrival:['📡 V2X handshake with home','⛩ Smart Gate opening','🏠 Home AC set to 22°C','💡 Driveway lights on'],cinema:['🎬 Theater Mode','🔅 Ambient lighting dimmed','🔊 Dolby Atmos immersive','📺 Launching cinema']};
$('#wfOpen').onclick=$('#wfOpen2').onclick=()=>$('#wf').classList.toggle('open');
$$('[data-wf]').forEach(b=>b.onclick=()=>runWF(b.dataset.wf));
async function runWF(k){const steps=WF[k];$('#wfSteps').innerHTML=steps.map(s=>`<div class="wf-step-item"><span class="wf-step-icon">○</span>${s}</div>`).join('');const banner=$('#cmdBanner');banner.style.display='flex';
 const items=$$('#wfSteps .wf-step-item');for(let i=0;i<steps.length;i++){$('#cmdText').textContent='AutoMotion · '+steps[i];items[i].classList.add('focused');chime('info');await new Promise(r=>setTimeout(r,900));items[i].classList.remove('focused');items[i].classList.add('done');items[i].querySelector('.wf-step-icon').textContent='✓'}
 if(k==='commute'){adj('L',-1);go('nav')}if(k==='arrival'){gate=true;$('#gateTxt').textContent='Smart Gate: Open';go('connectivity')}if(k==='cinema'){$('.cinema-mode-btn[data-cm=theater]').click();go('movies')}
 chime('ok');$('#cmdText').textContent='AutoMotion complete';setTimeout(()=>banner.style.display='none',1800)}
// Galaxy Z Fold: re-layout on fold/unfold without stopping playback
addEventListener('resize',()=>{map&&map.invalidateSize()});
window.onAndroidResume=()=>loadApps();
