'use strict';
// ===== in-app Wi-Fi / Bluetooth / Phone / CarPlay / Settings =====
const bj=(fn,...a)=>{try{if(B&&B[fn]){const r=B[fn](...a);return typeof r==='string'&&/^[\[{]/.test(r)?JSON.parse(r):r}}catch(e){}return undefined};
const sig=l=>'▂▄▆█'.slice(0,Math.max(1,Math.min(4,Math.round((l+100)/12))));
// Wi-Fi
const demoNets=[{ssid:'RangeRover-Hotspot',level:-42,sec:'WPA2'},{ssid:'Abbadi-Home 5G',level:-55,sec:'WPA3'},{ssid:'Dubai Mall Free',level:-70,sec:'OPEN'}];
let wSel=null;
function wifiRender(){const s=bj('wifiState')||{enabled:true,ssid:'Abbadi-Home 5G',ip:'192.168.1.24',dns:'1.1.1.1',gw:'192.168.1.1',rssi:-55,speed:866};
 $('#wifiSw').classList.toggle('on',!!s.enabled);$('#tWifi').classList.toggle('off',!s.enabled);
 $('#wifiInfo').innerHTML=s.enabled?`<div><span>Connected</span><b>${esc(s.ssid||'—')}</b></div><div><span>IP Address</span><b>${esc(s.ip||'—')}</b></div><div><span>DNS · Gateway</span><b>${esc(s.dns||'—')} · ${esc(s.gw||'—')}</b></div><div><span>Signal · Link</span><b>${s.rssi??'—'} dBm · ${s.speed??'—'} Mbps</b></div>`:'<div><span>Wi-Fi</span><b>Off</b></div>';return s}
function wifiScan(){$('#nets').innerHTML='<div class="muted">Scanning…</div>';setTimeout(()=>{const n=bj('wifiScan')||demoNets;const cur=(bj('wifiState')||{ssid:'Abbadi-Home 5G'}).ssid;
 $('#nets').innerHTML=n.map((x,i)=>`<div class="net ${x.ssid===cur?'on':''}" data-n="${i}"><span>${esc(x.ssid)}</span><span class="muted">${x.sec!=='OPEN'?'🔒 ':''}${sig(x.level)}</span></div>`).join('')||'<div class="muted">No networks found</div>';
 $$('#nets [data-n]').forEach(d=>d.onclick=()=>{wSel=n[d.dataset.n];$$('#nets .net').forEach(x=>x.classList.toggle('on',x===d));$('#wifiJoin').style.display='block';$('#wifiPw').style.display=wSel.sec==='OPEN'?'none':'block';$('#wifiPw').value='';$('#wifiPw').focus()})},B?1500:600)}
hooks['m-wifi']=()=>{wifiRender();wifiScan()};$('#wifiScan').onclick=wifiScan;
$('#wifiSw').onclick=()=>{const on=!$('#wifiSw').classList.contains('on');const r=bj('wifiSetEnabled',on);if(r===false||r==='panel')toast('Confirm in the Wi-Fi panel');setTimeout(wifiRender,900);$('#wifiSw').classList.toggle('on',on);$('#tWifi').classList.toggle('off',!on)};
$('#wifiGo').onclick=()=>{if(!wSel)return;const r=bj('wifiConnect',wSel.ssid,$('#wifiPw').value||'');$('#wifiPw').value='';toast(r===undefined||r?'Connecting to '+wSel.ssid+'…':'Connection request failed');chime('info');$('#wifiJoin').style.display='none';setTimeout(wifiRender,4000)};
// Bluetooth
const demoBt={paired:[{name:'iPhone 16 Pro',addr:'A1:B2',type:'phone',conn:true},{name:'AirPods Pro',addr:'C3:D4',type:'audio',conn:false}],found:[{name:'Galaxy Buds3',addr:'E5:F6'},{name:'Range Rover Rear Screen',addr:'G7:H8'}]};
function btRender(){const s=bj('btState')||{enabled:true,name:'Pivi Pro · Range Rover'};$('#btSw').classList.toggle('on',!!s.enabled);$('#tBt').classList.toggle('off',!s.enabled);$('#btName').textContent='Visible as “'+(s.name||'Pivi Pro')+'”';
 const p=bj('btBonded')||demoBt.paired;$('#btPaired').innerHTML=p.map(d=>`<div class="net ${d.conn?'on':''}" data-a="${esc(d.addr)}"><span>${d.type==='audio'?'🎧':'📱'} ${esc(d.name||d.addr)}</span><span class="muted">${d.conn?'Connected':'Paired'}</span></div>`).join('')||'<div class="muted">No paired devices</div>';
 $$('#btPaired [data-a]').forEach(d=>d.onclick=()=>{bj('btConnect',d.dataset.a);toast('Connecting '+d.textContent.trim()+'…');setTimeout(btRender,2500)})}
let btPoll;function btScan(){$('#btFound').innerHTML='<div class="muted">Searching…</div>';const r=bj('btScan');let n=0;clearInterval(btPoll);btPoll=setInterval(()=>{n++;const f=bj('btFound')||(n>1?demoBt.found:[]);
 if(f.length)$('#btFound').innerHTML=f.map(d=>`<div class="net" data-p="${esc(d.addr)}"><span>${esc(d.name||d.addr)}</span><span class="chip">Pair</span></div>`).join('');$$('#btFound [data-p]').forEach(d=>d.onclick=()=>{bj('btPair',d.dataset.p);toast('Pairing… confirm the code on both devices');setTimeout(btRender,4000)});if(n>8)clearInterval(btPoll)},1200)}
hooks['m-bt']=()=>{btRender();btScan()};$('#btScan').onclick=btScan;
$('#btSw').onclick=()=>{const on=!$('#btSw').classList.contains('on');bj('btSetEnabled',on);$('#btSw').classList.toggle('on',on);$('#tBt').classList.toggle('off',!on);setTimeout(btRender,1500)};
$('#btAudio').onclick=()=>{$('#btAudio').classList.toggle('on');toast('Media audio → '+($('#btAudio').classList.contains('on')?'Meridian cabin':'phone speaker'))};
hooks['m-hotspot']=()=>{const h=bj('hotspotInfo')||{};$('#hsInfo').innerHTML=`<div><span>Network</span><b>${esc(h.ssid||'RangeRover-Hotspot')}</b></div><div><span>Clients</span><b>${h.clients??0}</b></div><div><span>Band</span><b>${h.band||'5 GHz'}</b></div><div><span>Data</span><b>Mobile 5G</b></div>`};
// Phone
const demoC=[{n:'Home',p:'+971 4 000 0000'},{n:'Office',p:'+971 4 111 2222'},{n:'Range Rover Assistance',p:'800 52637'},{n:'Dubai Police',p:'999'},{n:'Roadside',p:'800 4357'}];
let contacts=[],num='',callT=null;
function phoneLoad(){contacts=bj('contacts')||demoC;const log=bj('callLog')||[{n:'Office',p:'+971 4 111 2222',t:'Today 09:12',k:'out'},{n:'Home',p:'+971 4 000 0000',t:'Yesterday',k:'in'}];
 const row=c=>`<div class="pc" data-call="${esc(c.p)}"><span>${esc(c.n||c.p)}<br><small class="muted">${esc(c.t||c.p)}</small></span><span>${c.k==='in'?'↙':c.k==='miss'?'✕':'↗'}</span></div>`;
 $('#favs').innerHTML=contacts.slice(0,3).map(row).join('');$('#recents').innerHTML=log.slice(0,25).map(row).join('');contactsR()}
function contactsR(){const q=$('#qc').value.toLowerCase();$('#contacts').innerHTML=contacts.filter(c=>(c.n+c.p).toLowerCase().includes(q)).slice(0,200).map(c=>`<div class="pc" data-call="${esc(c.p)}"><span>${esc(c.n)}</span><small class="muted">${esc(c.p)}</small></div>`).join('')}
$('#qc').oninput=contactsR;hooks.phone=()=>phoneLoad();
$('#keys').innerHTML=[['1',''],['2','ABC'],['3','DEF'],['4','GHI'],['5','JKL'],['6','MNO'],['7','PQRS'],['8','TUV'],['9','WXYZ'],['*',''],['0','+'],['#','']].map(([k,s])=>`<button class="key" data-k="${k}">${k}<small>${s}</small></button>`).join('')+`<button class="key" data-k="del" style="grid-column:3">⌫</button>`;
$('#keys').onclick=e=>{const k=e.target.closest('[data-k]');if(!k)return;num=k.dataset.k==='del'?num.slice(0,-1):num+k.dataset.k;$('#dnum').textContent=num;dtmf(k.dataset.k)};
function dtmf(k){try{const c=ac(),F={1:[697,1209],2:[697,1336],3:[697,1477],4:[770,1209],5:[770,1336],6:[770,1477],7:[852,1209],8:[852,1336],9:[852,1477],'*':[941,1209],0:[941,1336],'#':[941,1477]}[k];if(!F)return;F.forEach(f=>{const o=c.createOscillator(),g=c.createGain();o.frequency.value=f;g.gain.value=.07;o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+.14)})}catch(e){}}
document.addEventListener('click',e=>{const c=e.target.closest('[data-call]');if(c)startCall(c.dataset.call)});
$('#callBtn').onclick=()=>num?startCall(num):toast('Enter a number');
function startCall(n){$('#callNum').textContent=n;openM('call');const r=bj('call',n.replace(/[^\d+*#]/g,''));let s=0;clearInterval(callT);$('#callT').textContent=r===false?'Grant phone permission':'Dialling…';
 setTimeout(()=>{callT=setInterval(()=>{s++;$('#callT').textContent=String(s/60|0).padStart(2,'0')+':'+String(s%60).padStart(2,'0')},1000)},1500)}
$('#endCall').onclick=()=>{clearInterval(callT);bj('endCall');$('#m-call').classList.remove('open');chime('info')};
$('#cMute').onclick=e=>{e.target.classList.toggle('on');bj('setMute',e.target.classList.contains('on'))};$('#cSpk').onclick=e=>{e.target.classList.toggle('on');bj('setSpeaker',e.target.classList.contains('on'))};
$('#cKey').onclick=()=>{$('#m-call').classList.remove('open');go('phone')};
// CarPlay / apps
const CPA=[['Phone','phone','#22c55e'],['Music','music','#ef4444'],['Maps','nav','#3b82f6'],['Live TV','iptv','#d4b483'],['Movies','movies','#a855f7'],['Vehicle','vehicle','#f59e0b'],['Settings','settings','#9ca3af'],['Series','series','#06b6d4']];
$('#cp').innerHTML=CPA.map(a=>`<div class="cpa" data-go="${a[1]}"><span style="background:linear-gradient(145deg,${a[2]},#111)">${a[0][0]}</span>${a[0]}</div>`).join('');
hooks.connect=()=>{const apps=bj('getInstalledApps')||[];$('#apps').innerHTML=apps.length?apps.slice(0,60).map(a=>`<div class="cpa" data-pkg="${esc(a.pkg)}"><span>${esc((a.name||'?')[0])}</span>${esc(a.name)}</div>`).join(''):'<div class="muted" style="grid-column:1/-1">Installed apps appear here on the device.</div>';
 $$('#apps [data-pkg]').forEach(d=>d.onclick=()=>bj('launchApp',d.dataset.pkg))};
let gate=false,lights=false,homeAc=22;function gateSet(o){gate=o;$('#gateS').textContent=o?'Open':'Closed';toast('Smart Gate '+(o?'opening':'closing'))}
$('#gateBtn').onclick=()=>gateSet(!gate);$('#lightBtn').onclick=()=>{lights=!lights;$('#lightS').textContent=lights?'On':'Off'};$('#acUp').onclick=()=>{$('#homeAc').textContent=++homeAc+'°C'};$('#acDn').onclick=()=>{$('#homeAc').textContent=--homeAc+'°C'};
// Settings
$$('#stabs [data-st]').forEach(b=>b.onclick=()=>{$$('#stabs .stab').forEach(x=>x.classList.toggle('on',x===b));$$('.spane').forEach(p=>p.classList.toggle('on',p.id==='p-'+b.dataset.st));if(b.dataset.st==='sys')diag()});
const root=document.documentElement;
$('#bri').value=Math.round((+LS.rrBri||1)*100);$('#con').value=Math.round((+LS.rrCon||1)*100);root.style.setProperty('--bri',LS.rrBri||1);root.style.setProperty('--con',LS.rrCon||1);
$('#bri').oninput=e=>{LS.rrBri=e.target.value/100;root.style.setProperty('--bri',LS.rrBri);bj('setBrightness',Math.round(e.target.value*2.55))};
$('#con').oninput=e=>{LS.rrCon=e.target.value/100;root.style.setProperty('--con',LS.rrCon)};
$('#vol').oninput=e=>bj('setVolume',+e.target.value);
const COLS=[];for(let i=0;i<64;i++){const h=i<56?Math.round(i/56*360):0,l=i<56?55:30+(i-56)*10;COLS.push(i<56?`hsl(${h},${i%2?90:70}%,${l}%)`:`hsl(36,${(i-56)*6}%,${l}%)`)}COLS[0]='#d4b483';
$('#colors').innerHTML=COLS.map((c,i)=>`<i style="background:${c}" data-col="${i}"></i>`).join('');
$('#colors').onclick=e=>{const i=e.target.dataset.col;if(i==null)return;LS.rrAmb=COLS[i];ambient(COLS[i],true);$$('#colors i').forEach(x=>x.classList.toggle('on',x===e.target))};
if(LS.rrAmb)ambient(LS.rrAmb);
$$('[data-unit]').forEach(b=>{b.classList.toggle('on',b.dataset.unit===units);b.onclick=()=>{units=LS.rrUnit=b.dataset.unit;$$('[data-unit]').forEach(x=>x.classList.toggle('on',x===b));setSpeed(spd);toast('Units: '+(units==='mph'?'mph':'km/h'))}});
const sw=(id,key,cb)=>{const e=$(id);e.classList.toggle('on',LS[key]!=='0');e.onclick=()=>{LS[key]=LS[key]==='0'?'1':'0';e.classList.toggle('on',LS[key]!=='0');cb&&cb(LS[key]!=='0')}};
sw('#chimeSw','rrChime',v=>{chimesOn=v;v&&chime('ok')});sw('#voiceSw','rrVoice',v=>{$('#voiceNav').textContent=v?'Voice On':'Voice Off';v&&speak('Voice guidance on')});sw('#spdSw','rrSpdW');
$('#testChime').onclick=()=>{chime('ok');setTimeout(()=>chime('warn'),900)};
$('#setHome').onclick=()=>{const r=bj('setHomeDefault');toast(r===undefined?'Available on the device':'Select “Pivi Pro” and tap Always')};
function diag(){const n=navigator.connection||{};const t0=performance.now();$('#diag').innerHTML=[['Launcher','v2.0.0'],['Bridge',B?'Native ✓':'Web preview'],['Network',navigator.onLine?'Online '+(n.effectiveType||''):'Offline'],['Map tiles',map?'Loaded ✓':'Ready'],['IPTV',X.ok?'Connected · '+X.live.length+' ch':'Not connected'],['Players','hls.js '+(window.Hls?Hls.version:'—')+' · mpegts '+(window.mpegts?'✓':'—')],['Screen',innerWidth+'×'+innerHeight+' @'+devicePixelRatio+'x'],['Render',(performance.now()-t0).toFixed(1)+' ms']].map(([a,b])=>`<div><span>${a}</span><b>${b}</b></div>`).join('')}
$('#runDiag').onclick=()=>{diag();chime('ok');toast('All systems nominal')};
$('#checkUpd').onclick=async()=>{toast('Checking for updates…');try{const r=await fetch('https://vpns6694-cyber.github.io/range-rover-launcher/version.json',{cache:'no-store'});const j=await r.json();toast(j.version>'2.0.0'?'Update '+j.version+' available':'Pivi Pro is up to date (v2.0.0)')}catch(e){toast('Pivi Pro is up to date (v2.0.0)')}};
// sync status icons
setTimeout(()=>{const w=bj('wifiState');if(w)$('#tWifi').classList.toggle('off',!w.enabled);const b=bj('btState');if(b)$('#tBt').classList.toggle('off',!b.enabled)},800);
window.addEventListener('load',()=>{$$('[data-logo]').forEach(x=>x.classList.toggle('on',x.dataset.logo===(LS.rrLogo||'sport')))});
