'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const B=window.AndroidSystemBridge||null;const LS=localStorage;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2400)}
const ICONS={home:'M3 11l9-7 9 7v9h-6v-6H9v6H3z',tv:'M3 7h18v12H3zM8 3l4 4 4-4',film:'M3 4h18v16H3zM7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4',clap:'M4 9h16v11H4zM4 9l2-5 14 0-2 5M9 4l-2 5M15 4l-2 5',music:'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
map:'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',car:'M3 13l2-5h14l2 5v5h-3v-2H6v2H3zM6 13h12M7 16h1M16 16h1',phone:'M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2',carplay:'M7 3h10v18H7zM11 18h2',gear:'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-1-3-2 .3-1.5-1.5L17 4l-3-1-1 2h-2l-1-2-3 1 .5 2.8L6 8.3 4 8 3 11l2 1v0l-2 1 1 3 2-.3 1.5 1.5L7 20l3 1 1-2h2l1 2 3-1-.5-2.8 1.5-1.5 2 .3 1-3z',
wifi:'M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01',bt:'M7 7l10 10-5 4V3l5 4L7 17',signal:'M4 20v-3M9 20v-7M14 20v-11M19 20V5',gps:'M3 11l18-8-8 18-2-8z',thermo:'M14 14V5a2 2 0 1 0-4 0v9a4 4 0 1 0 4 0z'};
function icons(root=document){root.querySelectorAll('i[data-i]').forEach(i=>{i.outerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS[i.dataset.i]||''}"/></svg>`})}
icons();
// Audio + JLR chimes
let AC;const ac=()=>{if(!AC)AC=new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();return AC};
let chimesOn=LS.rrChime!=='0';
function chime(kind='info'){if(!chimesOn)return;try{const c=ac(),now=c.currentTime,seq={warn:[880,880,880],ok:[659.25,987.77],info:[783.99,1174.66],turn:[1046.5,783.99]}[kind]||[784];
 seq.forEach((f,i)=>[1,2,3,4.2].forEach((h,k)=>{const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f*h;const t=now+i*(kind==='warn'?.16:.24);
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.16/(k+1)/h,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+1.3);o.connect(g).connect(c.destination);o.start(t);o.stop(t+1.4)}))}catch(e){}}
function speak(t){if(LS.rrVoice==='0'||!window.speechSynthesis)return;try{const u=new SpeechSynthesisUtterance(t);u.lang='en-GB';u.rate=.98;speechSynthesis.cancel();speechSynthesis.speak(u)}catch(e){}}
function voice(t,ms=2200){$('#voiceT').textContent=t;$('#voice').classList.add('on');clearTimeout(voice.t);voice.t=setTimeout(()=>$('#voice').classList.remove('on'),ms)}
// clock
function tick(){const d=new Date();$('#clock').textContent=d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});$('#date').textContent=d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}tick();setInterval(tick,5000);
// navigation between screens
const hooks={};let curScreen='home';
function go(id){if(!$('#s-'+id))return;curScreen=id;$$('.screen').forEach(s=>s.classList.toggle('on',s.id==='s-'+id));$$('.dk').forEach(b=>b.classList.toggle('on',b.dataset.go===id));hooks[id]&&hooks[id]()}
function openM(id){const m=$('#m-'+id);if(!m)return;m.classList.add('open');hooks['m-'+id]&&hooks['m-'+id]()}
document.addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(g){go(g.dataset.go);chime.soft&&0}
 const o=e.target.closest('[data-open]');if(o)openM(o.dataset.open);
 if(e.target.closest('[data-close]'))e.target.closest('.modal').classList.remove('open');
 if(e.target.classList.contains('modal'))e.target.classList.remove('open')});
// ambient lighting
function ambient(c,pulse){document.documentElement.style.setProperty('--amb',c);const a=$('#ambient');if(pulse){a.classList.remove('pulse');void a.offsetWidth;a.classList.add('pulse')}}
// layout + logo
function setLayout(m){document.body.classList.toggle('lay-cockpit',m==='cockpit');document.body.classList.toggle('lay-grid',m!=='cockpit');$$('[data-lay]').forEach(x=>x.classList.toggle('on',x.dataset.lay===m));LS.rrLay=m;
 $('#brandImg').src=m==='cockpit'?'assets/pivi-pro-sport.svg':LOGOS[LS.rrLogo||'sport'];setTimeout(()=>{miniMaps.forEach(x=>x.invalidateSize())},300)}
const LOGOS={sport:'assets/range-rover-sport.svg',pivi:'assets/pivi-pro-sport.svg',white:'assets/range-rover-white-wordmark.png'};
$$('[data-lay]').forEach(b=>b.onclick=()=>setLayout(b.dataset.lay));
$$('[data-logo]').forEach(b=>b.onclick=()=>{LS.rrLogo=b.dataset.logo;$('#brandImg').src=LOGOS[b.dataset.logo];$$('[data-logo]').forEach(x=>x.classList.toggle('on',x===b))});
$('#brand').onclick=()=>setLayout(document.body.classList.contains('lay-cockpit')?'grid':'cockpit');
// quick toggles in settings tile
const quick={};$$('[data-q]').forEach(b=>b.onclick=e=>{e.stopPropagation();const k=b.dataset.q;quick[k]=!quick[k];b.classList.toggle('on',quick[k]);
 const msg={seatheat:'Seat heating',ac:'A/C',mass:'Seat massage',seatmem:'Seat memory 1 recalled'}[k];toast(msg+(k==='seatmem'?'':quick[k]?' ON':' OFF'));chime('info');
 if(k==='seatheat'||k==='mass')window.seatSet&&seatSet(k==='mass'?'mass':'heat',quick[k])});
// ---------- graphs ----------
function lineGraph(cv,fn,col){const x=cv.getContext('2d'),W=cv.width,H=cv.height;x.clearRect(0,0,W,H);x.strokeStyle=col||'#d4b483';x.lineWidth=2;x.beginPath();for(let i=0;i<=W;i+=3){const y=fn(i/W);i?x.lineTo(i,y*H):x.moveTo(i,y*H)}x.stroke();
 const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(212,180,131,.25)');g.addColorStop(1,'transparent');x.lineTo(W,H);x.lineTo(0,H);x.fillStyle=g;x.fill()}
lineGraph($('#rangeGraph'),t=>.2+t*.55+Math.sin(t*9)*.04);
let gT=0;(function gloop(){gT+=.03;const cv=$('#gGraph');if(document.body.classList.contains('lay-cockpit')){const x=cv.getContext('2d');x.clearRect(0,0,cv.width,cv.height);
 [['#e8cfa0',1,0],['rgba(255,255,255,.45)',.6,1.7]].forEach(([c,a,p])=>{x.strokeStyle=c;x.lineWidth=2;x.beginPath();for(let i=0;i<=400;i+=4){const y=70+Math.sin(i/30+gT+p)*28*a+Math.sin(i/11+gT*2)*10*a;i?x.lineTo(i,y):x.moveTo(i,y)}x.stroke()})}
 const sg=$('#suspGraph');if(curScreen==='vehicle'){const x=sg.getContext('2d');x.clearRect(0,0,500,120);x.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--amb');x.lineWidth=2;x.beginPath();
 for(let i=0;i<=500;i+=4){const y=60+Math.sin(i/22+gT*3)*suspAmp+Math.sin(i/7+gT*5)*suspAmp*.3;i?x.lineTo(i,y):x.moveTo(i,y)}x.stroke()}requestAnimationFrame(gloop)})();
// ---------- workflows ----------
const WF={commute:[['❄','Pre-cool cabin','(temp)'],['⟋⟍','Traffic Route optimized','(Navigation)'],['♫','Play Evening Playlist','(Music)'],['✆','Send arrival ETA','(Phone)']],
 arrival:[['📡','V2X handshake with home','(V2X)'],['⛩','Smart Gate opening','(Home)'],['❄','Home AC to 22°C','(Home)'],['💡','Driveway lights on','(Home)']],
 cinema:[['🎬','Theater Mode','(Cabin)'],['🔅','Ambient dimmed','(Lighting)'],['🔊','Dolby Atmos immersive','(Meridian)'],['📺','Launching Movies','(Media)']],
 roadtrip:[['⟴','Adaptive cruise armed','(ACC)'],['🏨','Hotel booking assistant','(AI)'],['♫','Road Trip playlist','(Music)'],['➤','Long-range route','(Navigation)']]};
const wfHTML=k=>WF[k].map(s=>`<div class="wf-item"><i>${s[0]}</i><div class="sp">${s[1]} <small class="muted">${s[2]}</small></div>›</div>`).join('');
$$('.wfl[data-wf]').forEach(e=>e.innerHTML=wfHTML(e.dataset.wf));let pick='commute';$('#wfPopList').innerHTML=wfHTML(pick);
$$('[data-pick]').forEach(b=>b.onclick=()=>{pick=b.dataset.pick;$$('[data-pick]').forEach(x=>x.classList.toggle('on',x===b));$('#wfPopList').innerHTML=wfHTML(pick)});
$('#wfBtn').onclick=()=>{go('home');$('#wfPop').classList.toggle('open')};$('#wfClose').onclick=()=>$('#wfPop').classList.remove('open');$('#wfRun').onclick=()=>runWF(pick,$('#wfPopList'));
$$('[data-run]').forEach(b=>b.onclick=()=>runWF(b.dataset.run,b.dataset.run==='commute'?$('.wfl[data-wf=commute]'):null));
let wfBusy=false;
async function runWF(k,list){if(wfBusy)return;wfBusy=true;if(!list||!list.children.length){$('#wfPopList').innerHTML=wfHTML(k);list=$('#wfPopList');$('#wfPop').classList.add('open')}else list.innerHTML=wfHTML(k);
 const items=[...list.children];ambient(k==='cinema'?'#7c3aed':k==='arrival'?'#38bdf8':'#e8cfa0',true);$('#wfState')&&($('#wfState').textContent='Active');speak(k==='commute'?'Starting your commute routine':'Running '+k+' routine');
 for(let i=0;i<items.length;i++){items[i].classList.add('run');voice('AutoMotion · '+WF[k][i][1]);chime('info');
  if(k==='commute'&&i===0)window.climateSet&&climateSet(21);if(k==='commute'&&i===2)window.musicStart&&musicStart(1);if(k==='arrival'&&i===1)window.gateSet&&gateSet(true);if(k==='cinema'&&i===1)document.documentElement.style.setProperty('--bri',.72);
  await new Promise(r=>setTimeout(r,1000));items[i].classList.remove('run');items[i].classList.add('done');items[i].querySelector('i').textContent='✓'}
 chime('ok');voice('AutoMotion complete ✓');$('#aiStatus')&&($('#aiStatus').textContent=`AI Assistant: Waiting for command. Last command (${k}) executed successfully.`);
 if(k==='commute')go('nav');if(k==='cinema'){go('movies');setTimeout(()=>document.documentElement.style.setProperty('--bri',LS.rrBri||1),4000)}if(k==='arrival')go('connect');wfBusy=false;setTimeout(()=>$('#wfPop').classList.remove('open'),1200)}
// voice command (speech recognition if available)
$('#voiceBtn').onclick=()=>{const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R){aiCmd('play live tv');return}const r=new R();r.lang='en-GB';voice('Listening…',6000);r.onresult=e=>aiCmd(e.results[0][0].transcript);r.onerror=()=>voice('Voice unavailable — try again');r.start()};
function aiCmd(t){t=t.toLowerCase();$('#aiStatus').textContent='AI Assistant: "'+t+'"';const m=[['tv','iptv'],['movie','movies'],['series','series'],['music','music'],['navigat','nav'],['map','nav'],['phone','phone'],['call','phone'],['setting','settings'],['climate','vehicle'],['commute',null]];
 for(const [k,s] of m)if(t.includes(k)){if(s)go(s);else runWF('commute');speak('Okay');return}speak('Sorry, I did not catch that')}
$$('[data-rear]').forEach(b=>b.onclick=()=>{$$('[data-rear]').forEach(x=>x.classList.toggle('on',x===b))});$('#pushRear').onclick=()=>{const s=$('[data-rear].on').dataset.rear;toast(s+' pushed to rear screens');chime('ok')};
// ---------- Music + EQ ----------
const tracks=[{t:'Desert Horizon',a:'Pivi Synth Ensemble',img:'assets/album-horizon.jpg',n:[220,277.2,329.6,415.3],bpm:160},{t:'Evening Drive',a:'Meridian Lounge',img:'assets/album-weeknd.jpg',n:[196,246.9,293.7,370],bpm:150}];
let ti=0,mus=null,musRev=null,an=null,eqNodes=null;const EQ=JSON.parse(LS.rrEq||'{"bass":3,"treble":1,"sub":2,"atmos":1}');
function eqChain(c){if(eqNodes)return eqNodes;const bass=c.createBiquadFilter();bass.type='lowshelf';bass.frequency.value=180;const tre=c.createBiquadFilter();tre.type='highshelf';tre.frequency.value=4000;const sub=c.createBiquadFilter();sub.type='peaking';sub.frequency.value=60;sub.Q.value=1;
 const out=c.createGain();an=c.createAnalyser();an.fftSize=256;bass.connect(tre).connect(sub).connect(out).connect(an).connect(c.destination);eqNodes={bass,tre,sub,out,in:bass};applyEq();return eqNodes}
function applyEq(){if(!eqNodes)return;eqNodes.bass.gain.value=EQ.bass;eqNodes.tre.gain.value=EQ.treble;eqNodes.sub.gain.value=EQ.sub*1.5;eqNodes.out.gain.value=.9}
function eqUI(box){box.innerHTML=[['bass','Bass'],['treble','Treble'],['sub','Subwoofer']].map(([k,l])=>`<div class="eqrow"><span>${l}</span><input type="range" min="-10" max="10" value="${EQ[k]}" data-eq="${k}"><b>${EQ[k]>0?'+':''}${EQ[k]}</b></div>`).join('')+
 `<div class="eqrow"><span>Dolby Atmos</span><span class="sw ${EQ.atmos?'on':''}" data-atm></span><b></b></div>`}
eqUI($('#eqBox'));eqUI($('#eqBox2'));
document.addEventListener('input',e=>{const k=e.target.dataset.eq;if(!k)return;EQ[k]=+e.target.value;LS.rrEq=JSON.stringify(EQ);$$(`[data-eq=${k}]`).forEach(x=>{x.value=EQ[k];x.nextElementSibling.textContent=(EQ[k]>0?'+':'')+EQ[k]});applyEq()});
document.addEventListener('click',e=>{if(e.target.matches('[data-atm]')){EQ.atmos=EQ.atmos?0:1;LS.rrEq=JSON.stringify(EQ);$$('[data-atm]').forEach(x=>x.classList.toggle('on',!!EQ.atmos));toast('Dolby Atmos '+(EQ.atmos?'ON':'OFF'))}});
$('#pl').innerHTML=tracks.map((t,i)=>`<div class="pc" data-t="${i}"><span><img src="${t.img}" style="width:40px;height:40px;border-radius:8px;vertical-align:middle;margin-right:10px">${t.t}</span><span class="muted">${t.a}</span></div>`).join('');
$$('#pl .pc').forEach(x=>x.onclick=()=>musicStart(+x.dataset.t));
function musicStart(i){if(i!=null)ti=i;musicStop();const c=ac(),t=tracks[ti],ch=eqChain(c);$('#npT').textContent=t.t;$('#npA').textContent=t.a;$('#npArt').src=t.img;$('#tileArt').src=t.img;
 const rev=c.createDelay();rev.delayTime.value=.28;const fb=c.createGain();fb.gain.value=EQ.atmos?.38:.12;rev.connect(fb).connect(rev);rev.connect(ch.in);
 let step=0;const beat=()=>{const now=c.currentTime,f=t.n[step%4]*(step%16<8?1:1.122);step++;['triangle','sine'].forEach((ty,k)=>{const o=c.createOscillator(),e=c.createGain();o.type=ty;o.frequency.value=f*(k?.5:1);e.gain.setValueAtTime(k?.5:.32,now);e.gain.exponentialRampToValueAtTime(.001,now+.6);o.connect(e);e.connect(ch.in);e.connect(rev);o.start(now);o.stop(now+.65)});
  if(step%2){const o=c.createOscillator(),e=c.createGain();o.frequency.setValueAtTime(120,now);o.frequency.exponentialRampToValueAtTime(40,now+.18);e.gain.setValueAtTime(.6,now);e.gain.exponentialRampToValueAtTime(.001,now+.25);o.connect(e).connect(ch.in);o.start(now);o.stop(now+.3)}};
 beat();mus=setInterval(beat,60000/t.bpm);musRev=rev;$('#mPlay').textContent='⏸';B&&B.mediaState&&B.mediaState(t.t,true)}
function musicStop(){if(mus){clearInterval(mus);try{musRev.disconnect()}catch(e){}}mus=null;$('#mPlay').textContent='▶'}
$('#mPlay').onclick=()=>mus?musicStop():musicStart();$('#mNext').onclick=()=>musicStart((ti+1)%tracks.length);$('#mPrev').onclick=()=>musicStart((ti+tracks.length-1)%tracks.length);
(function draw(){if(curScreen==='music'){const cv=$('#wave'),x=cv.getContext('2d');x.clearRect(0,0,cv.width,cv.height);const d=new Uint8Array(96);if(an&&mus)an.getByteFrequencyData(d);
 for(let i=0;i<96;i++){const h=Math.max(3,(d[i]/255)*cv.height*.95);const g=x.createLinearGradient(0,cv.height-h,0,cv.height);g.addColorStop(0,'#f2e4c6');g.addColorStop(1,'#7c6747');x.fillStyle=g;x.fillRect(i*8.3,cv.height-h,5,h)}}requestAnimationFrame(draw)})();
// ---------- Vehicle ----------
let suspAmp=10,paint=LS.rrPaint||'red';
const carSrc=()=>paint==='white'?'assets/range-rover-sport-side-white.png':'assets/range-rover-sport-side.png';
function setPaint(p){paint=p;LS.rrPaint=p;$('#vehCar').src=carSrc();$$('.carThumb').forEach(i=>i.src=carSrc());$$('[data-paint]').forEach(x=>x.classList.toggle('on',x.dataset.paint===p))}
$$('[data-paint]').forEach(b=>b.onclick=()=>{setPaint(b.dataset.paint);chime('ok')});
const MODES={Dynamic:['#ef4444',-40,'Sport','Firm','40/60'],Comfort:['#e8cfa0',0,'Comfort','Light','50/50'],Eco:['#22c55e',0,'Eco','Light','60/40'],'Off-Road':['#f59e0b',75,'All-Terrain','Normal','50/50']};
let mode='Dynamic',height=0,temps={L:22,R:22},seat={};
function setMode(m){mode=m;const d=MODES[m];ambient(d[0],true);setHeight(d[1]);$('#dmV').textContent=m;suspAmp=m==='Dynamic'?16:m==='Off-Road'?24:7;voice('Drive mode: '+m);chime('ok');renderV()}
function setHeight(h){height=h;$('#vehCar').style.transform=`translateY(${-h*.5}px)`;$('#rh').textContent=(h>0?'+':'')+h+' mm';$('#sDot').style.top=(50-h/75*42)+'%';if($('#vPane [data-h]'))$$('#vPane [data-h]').forEach(x=>x.classList.toggle('on',+x.dataset.h===h))}
function climateSet(t){temps.L=temps.R=t;renderV();updT()}
function updT(){$('#dockT').innerHTML=temps.L.toFixed(0)+'° <small>DRIVER</small>'}
function seatSet(k,on){for(let i=1;i<=5;i++)seat[i]=on?k:null;renderV()}
function bars(){const v=[['Steering Angle',4],['Brake Force',2],['Throttle',mode==='Dynamic'?8:5],['Chassis Pitch',3]];$('#bars').innerHTML=v.map(([l,n])=>`<div class="bar">${l}<div class="seg">${Array.from({length:10},(_,i)=>`<span class="${i<n+Math.round(Math.random()*2)?'on':''}"></span>`).join('')}</div></div>`).join('')}
setInterval(()=>curScreen==='vehicle'&&bars(),700);
let vtab='status';
function renderV(){const p=$('#vPane');if(!p)return;bars();
 if(vtab==='status')p.innerHTML=`<div class="row"><div class="cap sp">Vehicle Status</div><span class="pill-ok">All-Systems Go</span></div><div class="stats" style="margin-top:12px">${[['Fuel Range','580 km'],['Engine','173 °C'],['Tires','10.5°'],['RWS','0.9'],['Oil','OK']].map(([a,b])=>`<div class="stat glass"><div class="cap">${a}</div><div class="v">${b}</div></div>`).join('')}</div>`;
 if(vtab==='service')p.innerHTML=`<div class="cap">Service</div><div class="diag" style="margin-top:10px"><div><span>Next service</span><b>8,200 km</b></div><div><span>Brake pads</span><b style="color:var(--ok)">82%</b></div><div><span>Tyre pressure</span><b>2.5 / 2.5 / 2.6 / 2.6 bar</b></div><div><span>AdBlue</span><b>OK</b></div><div><span>Software</span><b>Pivi Pro 2.0.0</b></div></div><button class="btn" style="margin-top:12px" id="bookSvc">Book Service</button>`;
 if(vtab==='modes')p.innerHTML=`<div class="cap">Terrain Response · Drive Modes</div><div class="row" style="margin-top:10px">${Object.keys(MODES).map(m=>`<button class="btn ${m===mode?'on':''}" data-mode="${m}">${m}</button>`).join('')}</div><div class="cap" style="margin-top:16px">Air Suspension</div><div class="row" style="margin-top:8px"><button class="chip" data-h="-40">−40 mm Dynamic</button><button class="chip" data-h="0">0 mm Normal</button><button class="chip" data-h="75">+75 mm Off-Road</button></div><div class="diag" style="margin-top:10px"><div><span>Suspension</span><b>${MODES[mode][2]}</b></div><div><span>Steering</span><b>${MODES[mode][3]}</b></div><div><span>Power Dist</span><b>${MODES[mode][4]}</b></div></div>`;
 if(vtab==='climate')p.innerHTML=`<div class="row" style="justify-content:space-around"><div style="text-align:center"><div class="dial" data-t="L">${temps.L.toFixed(1)}°</div><div class="cap" style="margin-top:8px">Driver ▲▼</div></div>
  <div class="seat">${[[60,0,60,36],[30,44,120,58],[30,108,120,46],[20,160,140,48],[20,214,140,34]].map((r,i)=>`<div class="sz ${seat[i+1]||''}" data-z="${i+1}" style="left:${r[0]}px;top:${r[1]}px;width:${r[2]}px;height:${r[3]}px">Zone ${i+1}</div>`).join('')}</div>
  <div style="text-align:center"><div class="dial" data-t="R">${temps.R.toFixed(1)}°</div><div class="cap" style="margin-top:8px">Passenger ▲▼</div></div></div><div class="muted" style="text-align:center;font-size:12px">Tap a zone: Heat → Ventilate → Deep Tissue massage → Off</div>`;
 setHeight(height)}
$$('[data-vt]').forEach(b=>b.onclick=()=>{vtab=b.dataset.vt;$$('[data-vt]').forEach(x=>x.classList.toggle('on',x===b));renderV()});
$('#vPane').addEventListener('click',e=>{const m=e.target.closest('[data-mode]');if(m)setMode(m.dataset.mode);const h=e.target.closest('[data-h]');if(h){setHeight(+h.dataset.h);chime('info');voice('Air suspension '+h.textContent)}
 const z=e.target.closest('[data-z]');if(z){const c=[null,'heat','vent','mass'];const n=c[(c.indexOf(seat[z.dataset.z]||null)+1)%4];seat[z.dataset.z]=n;renderV();chime('info')}
 const d=e.target.closest('[data-t]');if(d){const r=d.getBoundingClientRect(),up=e.clientY<r.top+r.height/2;temps[d.dataset.t]=Math.min(28,Math.max(16,temps[d.dataset.t]+(up?.5:-.5)));renderV();updT()}
 if(e.target.id==='bookSvc'){toast('Service request sent to your retailer');chime('ok')}});
hooks.vehicle=()=>renderV();
window.addEventListener('load',()=>{setPaint(paint);setLayout(LS.rrLay||'grid');updT();renderV()});
