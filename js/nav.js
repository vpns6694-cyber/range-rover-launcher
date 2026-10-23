'use strict';
const OSM='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ESRI=(sv)=>`https://server.arcgisonline.com/ArcGIS/rest/services/${sv}/MapServer/tile/{z}/{y}/{x}`;
const LAYERS={dark:{n:'Dark Glass',u:[OSM,ESRI('World_Street_Map')]},street:{n:'Street HD',u:[ESRI('World_Street_Map'),OSM]},sat:{n:'Satellite',u:[ESRI('World_Imagery')]},vector:{n:'Vector Radar',u:[]}};
function tl(u,o={}){const t=L.tileLayer(u,Object.assign({maxZoom:19,subdomains:'abcd',crossOrigin:false,detectRetina:false},o));return t}
// base layer with automatic failover to the next provider on repeated tile errors
function baseLayer(key,m){const L0=LAYERS[key];if(!L0.u.length)return null;let i=0,err=0;const t=tl(L0.u[0],{attribution:key==='dark'?'© OpenStreetMap':'© Esri'});
 t.on('tileerror',()=>{if(++err>6&&i<L0.u.length-1){err=0;i++;t.setUrl(L0.u[i])}});t.on('tileload',()=>{err=0;window.__tilesOK=(window.__tilesOK||0)+1});return t}
// offline UAE vector layer (works with no internet)
const UAE_ROADS=[['E11 Sheikh Zayed Rd',[[24.4539,54.3773],[24.53,54.48],[24.70,54.70],[24.90,54.95],[25.0,55.10],[25.0657,55.1413],[25.12,55.2],[25.1972,55.2744],[25.2285,55.2867],[25.27,55.33],[25.33,55.39],[25.40,55.47],[25.55,55.60],[25.80,55.95]]],
 ['E66 Dubai–Al Ain Rd',[[25.18,55.33],[25.10,55.40],[24.98,55.50],[24.80,55.60],[24.60,55.68],[24.40,55.72],[24.2167,55.7667]]],
 ['E311 Sheikh Mohammed bin Zayed Rd',[[24.85,55.03],[25.00,55.18],[25.10,55.30],[25.20,55.40],[25.28,55.45],[25.36,55.52],[25.45,55.58]]]];
const UAE_MARKS=[['Dubai Mall',25.1985,55.2796],['Burj Khalifa',25.1972,55.2744],['Al Ain Oasis',24.2167,55.7667],['Abu Dhabi Corniche',24.4764,54.3227]];
function uaeLayer(){const g=L.layerGroup();UAE_ROADS.forEach(([n,c])=>{L.polyline(c,{color:'#d4b483',weight:9,opacity:.18}).addTo(g);L.polyline(c,{color:'#f2e4c6',weight:2.5,opacity:.95}).bindTooltip(n,{sticky:true}).addTo(g)});
 UAE_MARKS.forEach(([n,a,b])=>{L.circleMarker([a,b],{radius:6,color:'#fff',weight:1.5,fillColor:'#d4b483',fillOpacity:1}).addTo(g);L.marker([a,b],{icon:L.divIcon({className:'uae-lbl',html:n,iconSize:[120,14],iconAnchor:[-8,7]})}).addTo(g)});return g}
let curLay=LS.rrLay||'dark',baseL=null,uaeL=null;
function setLayer(k){curLay=k;LS.rrLay=k;if(baseL){map.removeLayer(baseL);baseL=null}baseL=baseLayer(k,map);baseL&&baseL.addTo(map).bringToBack();if(!uaeL)uaeL=uaeLayer().addTo(map);
 $('#map').classList.remove('lay-dark','lay-street','lay-sat','lay-vector');$('#map').classList.add('lay-'+k);$('#map').style.background=k==='vector'?'radial-gradient(circle at 50% 50%,#1b1916,#070605)':'#0c0b0a';$$('.laysw [data-lay2]').forEach(b=>b.classList.toggle('on',b.dataset.lay2===k));fixSize()}
function fixSize(){[0,100,400,1000].forEach(t=>setTimeout(()=>{map&&map.invalidateSize();miniMaps.forEach(m=>m.invalidateSize())},t))}
window.addEventListener('resize',()=>fixSize());
const PRESETS=[['Dubai Mall',25.1972,55.2796],['Burj Khalifa',25.1972,55.2744],['Al Ain Oasis',24.2167,55.7667],['Abu Dhabi Corniche',24.4764,54.3227],['Palm Jumeirah',25.1124,55.139]];
let units=LS.rrUnit||'kmh',map,me=[25.2048,55.2708],meM,route=null,glow=null,destM=null,routeCoords=[],steps=[],sim=null,miniMaps=[];
function mkMini(id){const m=L.map(id,{zoomControl:false,attributionControl:false,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,touchZoom:false,keyboard:false}).setView(me,13);tl(OSM).addTo(m);uaeLayer().addTo(m);
 L.circleMarker(me,{radius:6,color:'#e8cfa0',fillColor:'#d4b483',fillOpacity:1}).addTo(m);miniMaps.push(m);return m}
function initMap(){if(map){fixSize();return}map=L.map('map',{zoomControl:false,zoomSnap:.25,zoomDelta:.5,wheelPxPerZoomLevel:90,inertia:true,attributionControl:true}).setView(me,14);
 traf.addTo(map);const sw=document.createElement('div');sw.className='laysw';sw.innerHTML=Object.entries(LAYERS).map(([k,v])=>`<button class="chip" data-lay2="${k}">${v.n}</button>`).join('');$('#map').parentElement.appendChild(sw);sw.querySelectorAll('[data-lay2]').forEach(b=>b.onclick=()=>{setLayer(b.dataset.lay2);toast(LAYERS[b.dataset.lay2].n)});setLayer(curLay);
 meM=L.marker(me,{icon:L.divIcon({className:'',html:'<div style="width:22px;height:22px;border-radius:50%;background:#e8cfa0;border:3px solid #0c0b0a;box-shadow:0 0 0 6px rgba(232,207,160,.25),0 0 24px #e8cfa0"></div>',iconSize:[22,22],iconAnchor:[11,11]})}).addTo(map);
 $('#presets').innerHTML=PRESETS.map((p,i)=>`<button class="chip" data-p="${i}">${p[0]}</button>`).join('')+`<button class="chip" data-p="gps">📍 Live GPS</button>`;
 $$('#presets [data-p]').forEach(b=>b.onclick=()=>b.dataset.p==='gps'?liveGPS():routeTo(PRESETS[b.dataset.p][1],PRESETS[b.dataset.p][2],PRESETS[b.dataset.p][0]))}
let traf=L.layerGroup();hooks.nav=()=>setTimeout(initMap,30);
function liveGPS(){if(!navigator.geolocation){toast('GPS unavailable');return}toast('Locating…');navigator.geolocation.getCurrentPosition(p=>{me=[p.coords.latitude,p.coords.longitude];meM.setLatLng(me);map.flyTo(me,16,{duration:1.2});toast('Live GPS locked');chime('ok')},()=>toast('Location permission needed'),{enableHighAccuracy:true,timeout:10000});
 navigator.geolocation.watchPosition(p=>{if(sim)return;me=[p.coords.latitude,p.coords.longitude];meM&&meM.setLatLng(me);if(p.coords.speed!=null)setSpeed(p.coords.speed*3.6)},()=>{},{enableHighAccuracy:true})}
async function routeTo(lat,lng,name){stopSim();$('#tN').textContent=name;$('#tD').textContent='Routing…';
 if(destM)destM.remove();destM=L.circleMarker([lat,lng],{radius:9,color:'#fff',weight:2,fillColor:'#ef4444',fillOpacity:1}).addTo(map).bindTooltip(name,{permanent:true,direction:'top'});
 let coords=null,dist=0,dur=0;steps=[];
 try{const r=await fetch(`https://router.project-osrm.org/route/v1/driving/${me[1]},${me[0]};${lng},${lat}?overview=full&geometries=geojson&steps=true`);const j=await r.json();const R=j.routes[0];coords=R.geometry.coordinates.map(c=>[c[1],c[0]]);dist=R.distance;dur=R.duration;
  R.legs[0].steps.forEach(s=>steps.push({at:[s.maneuver.location[1],s.maneuver.location[0]],t:s.maneuver.type,m:s.maneuver.modifier||'',n:s.name||''}))}
 catch(e){coords=[me,[(me[0]+lat)/2+.01,(me[1]+lng)/2],[lat,lng]];dist=map.distance(me,[lat,lng])*1.3;dur=dist/22}
 routeCoords=coords;traf.clearLayers();[route,glow].forEach(x=>x&&x.remove());glow=L.polyline(coords,{color:'#d4b483',weight:16,opacity:.28,className:'route-glow'}).addTo(map);
 route=L.polyline(coords,{color:'#f2e4c6',weight:5,opacity:.95}).addTo(map);
 // traffic segments
 for(let i=0;i<coords.length-1;i+=Math.max(1,Math.floor(coords.length/12))){const seg=coords.slice(i,i+Math.max(2,Math.floor(coords.length/24)));if(Math.random()<.3)L.polyline(seg,{color:Math.random()<.5?'#f59e0b':'#ef4444',weight:5,opacity:.85}).addTo(traf)}
 map.flyToBounds(route.getBounds(),{padding:[80,80],duration:1.4});const eta=new Date(Date.now()+dur*1000);
 $('#eta').textContent=`${fmtD(dist)} · ${Math.round(dur/60)} min · ETA ${eta.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}`;$('#etaC').textContent=eta.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
 $('#tD').textContent=fmtD(dist);$('#tA').textContent='↑';chime('turn');speak(`Route to ${name}. ${Math.round(dur/60)} minutes.`);$('#navRes').innerHTML=''}
const fmtD=m=>units==='mph'?(m/1609).toFixed(1)+' mi':m<1000?Math.round(m)+' m':(m/1000).toFixed(1)+' km';
// search (Nominatim)
let st;$('#dest').oninput=e=>{clearTimeout(st);const q=e.target.value.trim();if(q.length<3){$('#navRes').innerHTML='';return}st=setTimeout(async()=>{try{const r=await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=ae,sa,om,qa,bh,kw&q=${encodeURIComponent(q)}`);const j=await r.json();
 $('#navRes').innerHTML=j.map((x,i)=>`<div class="pc" data-r="${i}">${esc(x.display_name.split(',').slice(0,3).join(','))}</div>`).join('')||'<div class="muted">No results</div>';$$('#navRes [data-r]').forEach(d=>d.onclick=()=>{const x=j[d.dataset.r];routeTo(+x.lat,+x.lon,x.display_name.split(',')[0])})}catch(e){$('#navRes').innerHTML='<div class="muted">Search offline</div>'}},450)};
$('#zIn').onclick=()=>map.flyTo(map.getCenter(),map.getZoom()+1,{duration:.45});$('#zOut').onclick=()=>map.flyTo(map.getCenter(),map.getZoom()-1,{duration:.45});
$('#pitch').onclick=()=>{$('#map').classList.toggle('pitch');$('#pitch').classList.toggle('on');setTimeout(()=>map.invalidateSize(),400)};
$('#recenter').onclick=()=>map.flyTo(meM.getLatLng(),16,{duration:.8});
// HUD
let spd=0,limitV=120,lastWarn=0;function setSpeed(k){spd=k;const v=units==='mph'?k*.621:k;$('#spd').textContent=Math.round(v);$('#unit').textContent=units==='mph'?'MPH':'KM/H';$('#gear').textContent=k<1?'P':'D'+Math.min(8,1+Math.floor(k/18));
 const over=k>limitV;$('#limit').classList.toggle('over',over);$('#limit').textContent=units==='mph'?Math.round(limitV*.621):limitV;if(over&&LS.rrSpdW!=='0'&&Date.now()-lastWarn>6000){lastWarn=Date.now();chime('warn')}}
const ARW={left:'↰','sharp left':'↰','slight left':'↖',right:'↱','sharp right':'↱','slight right':'↗',straight:'↑',uturn:'↶'};
function stopSim(){if(sim)clearInterval(sim);sim=null;$('#demo').classList.remove('on')}
$('#demo').onclick=()=>{if(sim){stopSim();setSpeed(0);return}if(!routeCoords.length){routeTo(...PRESETS[0].slice(1),PRESETS[0][0]).then(()=>setTimeout(()=>$('#demo').click(),1600));return}
 $('#demo').classList.add('on');let i=0,si=0;const pts=routeCoords;sim=setInterval(()=>{i++;if(i>=pts.length){stopSim();setSpeed(0);speak('You have arrived');chime('ok');$('#tD').textContent='Arrived';return}
  meM.setLatLng(pts[i]);map.panTo(pts[i],{animate:true,duration:.5});const k=Math.min(138,40+((i*7)%100));setSpeed(k);limitV=k>100?120:80;
  const s=steps[si+1];if(s){const d=map.distance(pts[i],s.at);$('#tD').textContent=fmtD(d);$('#tA').textContent=ARW[s.m]||'↑';$('#tN').textContent=s.n||s.t;if(d<60){si++;const t=`${s.t==='arrive'?'Arriving':'Turn '+(s.m||'ahead')}${s.n?' onto '+s.n:''}`;speak(t);chime('turn')}}},600)};
$('#voiceNav').onclick=()=>{LS.rrVoice=LS.rrVoice==='0'?'1':'0';$('#voiceNav').textContent=LS.rrVoice==='0'?'Voice Off':'Voice On';$('#voiceSw').classList.toggle('on',LS.rrVoice!=='0')};
window.addEventListener('load',()=>{try{mkMini('miniMap');mkMini('miniMap2')}catch(e){}setSpeed(0);$('#voiceNav').textContent=LS.rrVoice==='0'?'Voice Off':'Voice On'});
