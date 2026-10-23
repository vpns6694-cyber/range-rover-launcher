'use strict';
const TILE='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const PRESETS=[['Dubai Mall',25.1972,55.2796],['Burj Khalifa',25.1972,55.2744],['Al Ain Oasis',24.2167,55.7667],['Abu Dhabi Corniche',24.4764,54.3227],['Palm Jumeirah',25.1124,55.139]];
let units=LS.rrUnit||'kmh',map,me=[25.2048,55.2708],meM,route=null,glow=null,destM=null,routeCoords=[],steps=[],sim=null,miniMaps=[];
function mkMini(id){const m=L.map(id,{zoomControl:false,attributionControl:false,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,touchZoom:false,keyboard:false}).setView(me,13);L.tileLayer(TILE,{maxZoom:19}).addTo(m);
 L.circleMarker(me,{radius:6,color:'#e8cfa0',fillColor:'#d4b483',fillOpacity:1}).addTo(m);miniMaps.push(m);return m}
function initMap(){if(map){map.invalidateSize();return}map=L.map('map',{zoomControl:false,zoomSnap:.25,zoomDelta:.5,wheelPxPerZoomLevel:90,inertia:true,attributionControl:true}).setView(me,14);
 L.tileLayer(TILE,{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);traf.addTo(map);
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
