'use strict';
const OSM='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ESRI=(sv)=>`https://server.arcgisonline.com/ArcGIS/rest/services/${sv}/MapServer/tile/{z}/{y}/{x}`;
const LAYERS={
  dark:{n:'Dark Glass',u:[OSM,ESRI('World_Street_Map')]},
  street:{n:'Street HD',u:[ESRI('World_Street_Map'),OSM]},
  sat:{n:'Satellite',u:[ESRI('World_Imagery')]},
  vector:{n:'Vector Radar',u:[]}
};

function tl(u,o={}){
  return L.tileLayer(u,Object.assign({maxZoom:19,subdomains:'abcd',crossOrigin:false,detectRetina:false},o));
}

function baseLayer(key){
  const L0=LAYERS[key];
  if(!L0||!L0.u.length)return null;
  let i=0,err=0;
  const t=tl(L0.u[0],{attribution:key==='dark'?'© OpenStreetMap':'© Esri'});
  t.on('tileerror',()=>{if(++err>6&&i<L0.u.length-1){err=0;i++;t.setUrl(L0.u[i])}});
  t.on('tileload',()=>{err=0;window.__tilesOK=(window.__tilesOK||0)+1});
  return t;
}

// Offline UAE vector radar layer (ONLY shown when layer === 'vector' so it never draws straight lines over real maps)
const UAE_ROADS=[
  ['E11 Sheikh Zayed Rd',[[24.4539,54.3773],[24.53,54.48],[24.70,54.70],[24.90,54.95],[25.0,55.10],[25.0657,55.1413],[25.12,55.2],[25.1972,55.2744],[25.2285,55.2867],[25.27,55.33],[25.33,55.39]]],
  ['E66 Al Ain Rd',[[25.18,55.33],[25.10,55.40],[24.98,55.50],[24.80,55.60],[24.60,55.68],[24.40,55.72],[24.2167,55.7667]]]
];
function uaeLayer(){
  const g=L.layerGroup();
  UAE_ROADS.forEach(([n,c])=>{
    L.polyline(c,{color:'#d4b483',weight:8,opacity:.18}).addTo(g);
    L.polyline(c,{color:'#f2e4c6',weight:2,opacity:.85}).bindTooltip(n,{sticky:true}).addTo(g);
  });
  return g;
}

let curLay=LS.rrLay||'dark',baseL=null,uaeL=null;
function setLayer(k){
  curLay=k;LS.rrLay=k;
  if(baseL){map.removeLayer(baseL);baseL=null}
  if(uaeL){map.removeLayer(uaeL);uaeL=null}
  baseL=baseLayer(k,map);
  if(baseL)baseL.addTo(map).bringToBack();
  if(k==='vector'){uaeL=uaeLayer().addTo(map)}
  const mEl=$('#map');
  mEl.classList.remove('lay-dark','lay-street','lay-sat','lay-vector');
  mEl.classList.add('lay-'+k);
  mEl.style.background=k==='vector'?'radial-gradient(circle at 50% 50%,#1b1916,#070605)':'#0c0b0a';
  $$('.laysw [data-lay2]').forEach(b=>b.classList.toggle('on',b.dataset.lay2===k));
  fixSize();
}

function fixSize(){
  [0,100,400,900].forEach(t=>setTimeout(()=>{
    map&&map.invalidateSize();
    miniMaps.forEach(m=>m.invalidateSize());
  },t));
}
window.addEventListener('resize',()=>fixSize());

// Built-in rich UAE & Al Ain / Abu Dhabi / Dubai Places Database (Arabic + English)
const UAE_POIS=[
  {n:'واحة العين · Al Ain Oasis',ar:'واحة العين',lat:24.2167,lng:55.7667,c:'Al Ain · العين'},
  {n:'عيادة الهيلي · Al Hili Clinic',ar:'عيادة الهيلي',lat:24.2654,lng:55.7742,c:'Al Ain · الهيلي'},
  {n:'العين مول · Al Ain Mall',ar:'العين مول',lat:24.2228,lng:55.7808,c:'Al Ain · العين'},
  {n:'بوادي مول · Bawadi Mall',ar:'بوادي مول',lat:24.1628,lng:55.8084,c:'Al Ain · العين'},
  {n:'مستشفى توام · Tawam Hospital',ar:'مستشفى توام',lat:24.1932,lng:55.6615,c:'Al Ain · العين'},
  {n:'جبل حفيت · Jebel Hafeet',ar:'جبل حفيت',lat:24.0575,lng:55.7778,c:'Al Ain · العين'},
  {n:'استاد هزاع بن زايد · Hazza Bin Zayed Stadium',ar:'استاد هزاع بن زايد',lat:24.2464,lng:55.7161,c:'Al Ain · الطويّة'},
  {n:'حديقة حيوانات العين · Al Ain Zoo',ar:'حديقة حيوانات العين',lat:24.1792,lng:55.7381,c:'Al Ain · العين'},
  {n:'دبي مول · Dubai Mall',ar:'دبي مول',lat:25.1972,lng:55.2796,c:'Downtown Dubai'},
  {n:'برج خليفة · Burj Khalifa',ar:'برج خليفة',lat:25.1972,lng:55.2744,c:'Downtown Dubai'},
  {n:'كورنيش أبوظبي · Abu Dhabi Corniche',ar:'كورنيش أبوظبي',lat:24.4764,lng:54.3227,c:'Abu Dhabi'},
  {n:'جامع الشيخ زايد · Sheikh Zayed Grand Mosque',ar:'جامع الشيخ زايد',lat:24.4128,lng:54.4750,c:'Abu Dhabi'},
  {n:'نخلة جميرا · Palm Jumeirah',ar:'نخلة جميرا',lat:25.1124,lng:55.1390,c:'Dubai'},
  {n:'مطار زايد الدولي · Zayed Intl Airport',ar:'مطار زايد',lat:24.4439,lng:54.6511,c:'Abu Dhabi'},
  {n:'مطار دبي الدولي · Dubai Intl Airport DXB',ar:'مطار دبي',lat:25.2532,lng:55.3657,c:'Dubai'}
];

function getHomeLoc(){
  try{return JSON.parse(LS.rrNavHome||'null')||{n:'المنزل · Home (Al Ain)',lat:24.2540,lng:55.7480}}
  catch(e){return {n:'المنزل · Home (Al Ain)',lat:24.2540,lng:55.7480}}
}
function getWorkLoc(){
  try{return JSON.parse(LS.rrNavWork||'null')||{n:'العمل · Work (Al Hili / EDCAD)',lat:24.2654,lng:55.7742}}
  catch(e){return {n:'العمل · Work (Al Hili / EDCAD)',lat:24.2654,lng:55.7742}}
}
function getFavLocs(){
  try{
    const saved=JSON.parse(LS.rrNavFavs||'null');
    if(Array.isArray(saved)&&saved.length)return saved;
  }catch(e){}
  return [
    {n:'واحة العين · Al Ain Oasis',lat:24.2167,lng:55.7667},
    {n:'عيادة الهيلي · Al Hili',lat:24.2654,lng:55.7742},
    {n:'العين مول · Al Ain Mall',lat:24.2228,lng:55.7808},
    {n:'دبي مول · Dubai Mall',lat:25.1972,lng:55.2796},
    {n:'برج خليفة · Burj Khalifa',lat:25.1972,lng:55.2744},
    {n:'كورنيش أبوظبي · Corniche',lat:24.4764,lng:54.3227}
  ];
}
function saveFavLocs(list){LS.rrNavFavs=JSON.stringify(list)}

// Default starting location in Al Ain (matching the user's screenshot in Al Ain!)
let units=LS.rrUnit||'kmh',map,me=[24.2464,55.7280],meHeading=145,meM,route=null,glow=null,destM=null,routeCoords=[],steps=[],sim=null,miniMaps=[],currentDest=null,navActive=false;

function puckHtml(deg=0){
  return `<div class="rr-puck-wrap" style="transform:rotate(${deg}deg)">
    <div class="rr-puck-beam"></div>
    <svg class="rr-puck-svg" viewBox="0 0 48 48" width="42" height="42">
      <defs>
        <linearGradient id="rrGoldG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fffdf7"/>
          <stop offset="55%" stop-color="#e8cfa0"/>
          <stop offset="100%" stop-color="#b89254"/>
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="18" fill="rgba(12,11,10,0.82)" stroke="#e8cfa0" stroke-width="2.2"/>
      <path d="M24 8 L34 33 L24 27.5 L14 33 Z" fill="url(#rrGoldG)" stroke="#141210" stroke-width="1.4" stroke-linejoin="round"/>
    </svg>
  </div>`;
}

function setPuckHeading(deg){
  meHeading=deg;
  if(!meM)return;
  const el=meM.getElement();
  const w=el&&el.querySelector('.rr-puck-wrap');
  if(w)w.style.transform=`rotate(${deg}deg)`;
}

function calcBearing(a,b){
  const toR=d=>d*Math.PI/180,toD=r=>r*180/Math.PI;
  const lat1=toR(a[0]),lat2=toR(b[0]),dLon=toR(b[1]-a[1]);
  const y=Math.sin(dLon)*Math.cos(lat2);
  const x=Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon);
  return (toD(Math.atan2(y,x))+360)%360;
}

function densifyCoords(coords,maxStepMeters=28){
  if(!coords||coords.length<2)return coords||[];
  const out=[coords[0]];
  for(let i=0;i<coords.length-1;i++){
    const a=coords[i],b=coords[i+1];
    const dist=map?map.distance(a,b):100;
    const n=Math.max(1,Math.min(40,Math.ceil(dist/maxStepMeters)));
    for(let s=1;s<=n;s++){
      const t=s/n;
      out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);
    }
  }
  return out;
}

function mkMini(id){
  const el=document.getElementById(id);
  if(!el)return null;
  const m=L.map(id,{zoomControl:false,attributionControl:false,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,touchZoom:false,keyboard:false}).setView(me,13);
  tl(OSM).addTo(m);
  L.circleMarker(me,{radius:6,color:'#e8cfa0',fillColor:'#d4b483',fillOpacity:1}).addTo(m);
  miniMaps.push(m);
  return m;
}

function renderNavSideControls(){
  const pBox=$('#presets');
  if(!pBox)return;
  const home=getHomeLoc(),work=getWorkLoc(),favs=getFavLocs();
  pBox.innerHTML=`
    <div class="nav-hw-row">
      <div class="nav-hw-card" id="btnGoHome">
        <div class="hw-top"><span class="hw-ico">🏠</span><b>المنزل · HOME</b><button class="hw-set" id="btnSetHome" title="حفظ الموقع الحالي كمنزل">📍 حفظ</button></div>
        <div class="hw-sub">${esc(home.n)}</div>
      </div>
      <div class="nav-hw-card" id="btnGoWork">
        <div class="hw-top"><span class="hw-ico">🏢</span><b>العمل · WORK</b><button class="hw-set" id="btnSetWork" title="حفظ الموقع الحالي كعمل">📍 حفظ</button></div>
        <div class="hw-sub">${esc(work.n)}</div>
      </div>
    </div>
    <div class="nav-go-wrap">
      <button class="btn pri nav-start-btn" id="btnStartNav">▶ انطلاق · START NAVIGATION (تقريب 3D)</button>
      <button class="chip" id="btnLiveGps" title="تحديد موقعي الحالي بالـ GPS">📍 موقعي GPS</button>
    </div>
    <div class="nav-fav-head">
      <span>⭐ المفضلات · FAVORITES</span>
      <button class="chip fav-add-btn" id="btnAddFav">＋ حفظ بالمفضلة</button>
    </div>
    <div class="nav-fav-list" id="navFavList">
      ${favs.map((f,i)=>`
        <div class="fav-chip-wrap">
          <button class="chip fav-chip" data-f="${i}">⭐ ${esc(f.n)}</button>
          <button class="fav-del" data-fdel="${i}" title="حذف">✕</button>
        </div>
      `).join('')}
    </div>
  `;

  $('#btnGoHome').onclick=(e)=>{
    if(e.target.id==='btnSetHome')return;
    const h=getHomeLoc();
    routeTo(h.lat,h.lng,h.n,true);
  };
  $('#btnSetHome').onclick=(e)=>{
    e.stopPropagation();
    const target=currentDest||{n:'موقع المنزل المحفوظ · Saved Home',lat:me[0],lng:me[1]};
    LS.rrNavHome=JSON.stringify(target);
    renderNavSideControls();
    toast('✓ تم حفظ موقع المنزل: '+target.n);
    chime('ok');
  };

  $('#btnGoWork').onclick=(e)=>{
    if(e.target.id==='btnSetWork')return;
    const w=getWorkLoc();
    routeTo(w.lat,w.lng,w.n,true);
  };
  $('#btnSetWork').onclick=(e)=>{
    e.stopPropagation();
    const target=currentDest||{n:'موقع العمل المحفوظ · Saved Work',lat:me[0],lng:me[1]};
    LS.rrNavWork=JSON.stringify(target);
    renderNavSideControls();
    toast('✓ تم حفظ موقع العمل: '+target.n);
    chime('ok');
  };

  $('#btnStartNav').onclick=()=>{
    if(navActive){
      stopSim();
      $('#map').classList.remove('pitch');
      $('#pitch').classList.remove('on');
      if(route)map.flyToBounds(route.getBounds(),{padding:[70,70],duration:0.9});
      toast('تم إيقاف الانطلاق وعرض المسار الكامل');
      return;
    }
    startTurnByTurnNavigation();
  };

  $('#btnLiveGps').onclick=()=>liveGPS();

  $('#btnAddFav').onclick=()=>{
    const favs=getFavLocs();
    const item=currentDest||{n:`موقع محفوظ (${me[0].toFixed(3)}, ${me[1].toFixed(3)})`,lat:me[0],lng:me[1]};
    if(!favs.some(x=>x.n===item.n)){
      favs.unshift(item);
      saveFavLocs(favs);
      renderNavSideControls();
      toast('⭐ تمت الإضافة إلى المفضلات: '+item.n);
      chime('ok');
    }else{
      toast('⭐ الموقع موجود بالفعل في المفضلات');
    }
  };

  $$('#navFavList [data-f]').forEach(b=>{
    b.onclick=()=>{
      const f=getFavLocs()[+b.dataset.f];
      if(f)routeTo(f.lat,f.lng,f.n,true);
    };
  });
  $$('#navFavList [data-fdel]').forEach(b=>{
    b.onclick=(e)=>{
      e.stopPropagation();
      const favs=getFavLocs();
      const removed=favs.splice(+b.dataset.fdel,1);
      saveFavLocs(favs);
      renderNavSideControls();
      if(removed[0])toast('تم حذف '+removed[0].n+' من المفضلات');
    };
  });
}

function initMap(){
  if(map){fixSize();return}
  map=L.map('map',{zoomControl:false,zoomSnap:.25,zoomDelta:.5,wheelPxPerZoomLevel:90,inertia:true,attributionControl:true}).setView(me,14);
  traf.addTo(map);

  const sw=document.createElement('div');
  sw.className='laysw';
  sw.id='mapLayerBar';
  sw.innerHTML=Object.entries(LAYERS).map(([k,v])=>`<button class="chip" data-lay2="${k}">${v.n}</button>`).join('');
  $('#map').parentElement.appendChild(sw);
  sw.querySelectorAll('[data-lay2]').forEach(b=>b.onclick=()=>{setLayer(b.dataset.lay2);toast(LAYERS[b.dataset.lay2].n)});
  setLayer(curLay);

  meM=L.marker(me,{
    icon:L.divIcon({className:'rr-puck-icon',html:puckHtml(meHeading),iconSize:[42,42],iconAnchor:[21,21]})
  }).addTo(map);

  // Allow tapping anywhere on the map to set destination & route immediately
  map.on('click',(e)=>{
    const lat=+e.latlng.lat.toFixed(5),lng=+e.latlng.lng.toFixed(5);
    const name=`نقطة محددة · Pin (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
    routeTo(lat,lng,name,false);
  });

  renderNavSideControls();
  // Default route ready in Al Ain so the map is immediately rich and ready
  routeTo(24.2167,55.7667,'واحة العين · Al Ain Oasis',false);
}

let traf=L.layerGroup();
hooks.nav=()=>setTimeout(initMap,30);

function liveGPS(){
  if(!navigator.geolocation){toast('GPS unavailable');return}
  toast('جاري تحديد موقع GPS...');
  navigator.geolocation.getCurrentPosition(p=>{
    me=[p.coords.latitude,p.coords.longitude];
    meM.setLatLng(me);
    if(p.coords.heading!=null&&!isNaN(p.coords.heading))setPuckHeading(p.coords.heading);
    map.flyTo(me,17.5,{duration:1.1});
    toast('✓ تم قفل موقع GPS الحي وتقريب الخريطة');
    chime('ok');
  },()=>{
    map.flyTo(me,17.5,{duration:1.0});
    toast('تم التقريب على الموقع الحالي');
  },{enableHighAccuracy:true,timeout:8000});

  navigator.geolocation.watchPosition(p=>{
    if(sim)return;
    const next=[p.coords.latitude,p.coords.longitude];
    if(map.distance(me,next)>2){
      setPuckHeading(calcBearing(me,next));
    }
    me=next;
    meM&&meM.setLatLng(me);
    if(navActive)map.panTo(me,{animate:true,duration:0.5});
    if(p.coords.speed!=null)setSpeed(p.coords.speed*3.6);
  },()=>{},{enableHighAccuracy:true});
}

async function routeTo(lat,lng,name,autoStart=false){
  stopSim();
  currentDest={n:name,lat,lng};
  $('#tN').textContent=name;
  $('#tD').textContent='جاري رسم المسار…';
  if(destM)destM.remove();
  destM=L.circleMarker([lat,lng],{radius:9,color:'#fff',weight:2.5,fillColor:'#ef4444',fillOpacity:1})
    .addTo(map)
    .bindTooltip(name,{permanent:true,direction:'top'});

  let coords=null,dist=0,dur=0;
  steps=[];
  try{
    const r=await fetch(`https://router.project-osrm.org/route/v1/driving/${me[1]},${me[0]};${lng},${lat}?overview=full&geometries=geojson&steps=true`);
    const j=await r.json();
    const R=j.routes[0];
    coords=R.geometry.coordinates.map(c=>[c[1],c[0]]);
    dist=R.distance;
    dur=R.duration;
    R.legs[0].steps.forEach(s=>steps.push({
      at:[s.maneuver.location[1],s.maneuver.location[0]],
      t:s.maneuver.type,
      m:s.maneuver.modifier||'',
      n:s.name||'الطريق الرئيسي'
    }));
  }catch(e){
    // Smooth curved road fallback if offline
    const midLat=(me[0]+lat)/2+(lng-me[1])*0.12;
    const midLng=(me[1]+lng)/2-(lat-me[0])*0.12;
    coords=[me,[midLat,midLng],[lat,lng]];
    dist=map.distance(me,[lat,lng])*1.25;
    dur=dist/20;
  }

  routeCoords=densifyCoords(coords,25);
  if(routeCoords.length>1){
    setPuckHeading(calcBearing(routeCoords[0],routeCoords[1]));
  }
  traf.clearLayers();
  [route,glow].forEach(x=>x&&x.remove());
  glow=L.polyline(coords,{color:'#d4b483',weight:14,opacity:.28,className:'route-glow'}).addTo(map);
  route=L.polyline(coords,{color:'#f2e4c6',weight:5.5,opacity:.96}).addTo(map);

  const eta=new Date(Date.now()+dur*1000);
  $('#eta').textContent=`${fmtD(dist)} · ${Math.max(1,Math.round(dur/60))} min · ETA ${eta.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}`;
  if($('#etaC'))$('#etaC').textContent=eta.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  $('#tD').textContent=fmtD(dist);
  $('#tA').textContent='↑';
  $('#navRes').innerHTML='';

  if(autoStart){
    startTurnByTurnNavigation();
  }else{
    map.flyToBounds(route.getBounds(),{padding:[70,70],duration:1.1});
    chime('turn');
    speak(`Route to ${name}. Tap Start Navigation to zoom in and depart.`);
  }
}
window.routeTo=routeTo;

function startTurnByTurnNavigation(){
  if(!routeCoords.length){
    const h=getHomeLoc();
    routeTo(h.lat,h.lng,h.n,true);
    return;
  }
  stopSim();
  navActive=true;
  $('#demo').classList.add('on');
  const startBtn=$('#btnStartNav');
  if(startBtn){
    startBtn.textContent='⏹ إيقاف التوجيه · STOP NAVIGATION';
    startBtn.classList.add('active-nav');
  }

  // 1. Activate 3D Cockpit Pitch + Zoom closely to street level (17.5) on the vehicle
  $('#map').classList.add('pitch');
  $('#pitch').classList.add('on');
  const startPt=routeCoords[0]||me;
  me=startPt;
  meM.setLatLng(startPt);
  if(routeCoords.length>1)setPuckHeading(calcBearing(routeCoords[0],routeCoords[1]));
  map.flyTo(startPt,17.5,{animate:true,duration:1.1});
  setTimeout(()=>map&&map.invalidateSize(),450);

  toast('🚀 بدأ الانطلاق والتقريب المباشر على المسار (3D Turn-by-Turn)');
  chime('ok');

  let i=0,si=0;
  const pts=routeCoords;
  sim=setInterval(()=>{
    i++;
    if(i>=pts.length){
      stopSim();
      setSpeed(0);
      speak('You have arrived at your destination');
      chime('ok');
      $('#tD').textContent='وصلت · Arrived';
      return;
    }
    const prev=pts[i-1]||me;
    const cur=pts[i];
    if(map.distance(prev,cur)>0.5){
      setPuckHeading(calcBearing(prev,cur));
    }
    me=cur;
    meM.setLatLng(cur);
    map.panTo(cur,{animate:true,duration:0.45});
    const k=Math.min(118,52+((i*5)%64));
    setSpeed(k);
    limitV=k>100?120:80;

    const s=steps[si+1]||steps[si];
    if(s){
      const d=map.distance(cur,s.at);
      $('#tD').textContent=fmtD(d);
      $('#tA').textContent=ARW[s.m]||'↑';
      $('#tN').textContent=(s.n||currentDest?.n||'المسار النشط');
      if(d<45&&si<steps.length-1){
        si++;
        const t=`${s.t==='arrive'?'Arriving':'Turn '+(s.m||'ahead')}${s.n?' onto '+s.n:''}`;
        speak(t);
        chime('turn');
      }
    }
  },550);
}
window.startTurnByTurnNavigation=startTurnByTurnNavigation;

const fmtD=m=>units==='mph'?(m/1609).toFixed(1)+' mi':m<1000?Math.round(m)+' m':(m/1000).toFixed(1)+' km';

// Instant Search (Local UAE/Al Ain POIs + Saved Favorites + Live Nominatim in Arabic & English)
let st;
$('#dest').oninput=e=>{
  clearTimeout(st);
  const q=e.target.value.trim();
  const qLow=q.toLowerCase();
  if(!q){$('#navRes').innerHTML='';return}

  const allLocal=[
    {...getHomeLoc(),c:'🏠 المنزل · Home'},
    {...getWorkLoc(),c:'🏢 العمل · Work'},
    ...getFavLocs().map(f=>({...f,c:'⭐ المفضلة'})),
    ...UAE_POIS
  ];
  const localMatches=allLocal.filter(p=>p.n.toLowerCase().includes(qLow)||(p.ar&&p.ar.includes(q))||(p.c&&p.c.toLowerCase().includes(qLow))).slice(0,6);

  const renderResults=(remoteList=[])=>{
    const combined=[
      ...localMatches.map(m=>({name:m.n,sub:m.c||'UAE',lat:m.lat,lng:m.lng})),
      ...remoteList.map(x=>({name:x.display_name.split(',')[0],sub:x.display_name.split(',').slice(1,3).join(','),lat:+x.lat,lng:+x.lon}))
    ];
    if(!combined.length){
      $('#navRes').innerHTML='<div class="muted" style="padding:8px">لا توجد نتائج مطابقة · No matching places</div>';
      return;
    }
    $('#navRes').innerHTML=combined.map((item,idx)=>`
      <div class="pc nav-search-item" data-r="${idx}">
        <div>
          <div style="font-weight:600;color:#f3eee6">${esc(item.name)}</div>
          <small style="color:var(--gold2);font-size:11px">${esc(item.sub)}</small>
        </div>
        <span class="chip" style="padding:4px 9px;font-size:11px;color:#1a140c;background:var(--gold2);font-weight:700">انطلاق ▶</span>
      </div>
    `).join('');
    $$('#navRes [data-r]').forEach(d=>d.onclick=()=>{
      const picked=combined[+d.dataset.r];
      if(picked){
        $('#dest').value=picked.name;
        routeTo(picked.lat,picked.lng,picked.name,true);
      }
    });
  };

  renderResults([]);
  if(q.length>=2){
    st=setTimeout(async()=>{
      try{
        const r=await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=ar,en&countrycodes=ae,sa,om,qa,bh,kw&q=${encodeURIComponent(q)}`);
        const j=await r.json();
        renderResults(Array.isArray(j)?j:[]);
      }catch(e){}
    },320);
  }
};

$('#zIn').onclick=()=>map.flyTo(map.getCenter(),Math.min(19,map.getZoom()+1),{duration:.35});
$('#zOut').onclick=()=>map.flyTo(map.getCenter(),Math.max(5,map.getZoom()-1),{duration:.35});
$('#pitch').onclick=()=>{
  $('#map').classList.toggle('pitch');
  $('#pitch').classList.toggle('on');
  setTimeout(()=>map.invalidateSize(),400);
};
$('#recenter').onclick=()=>{
  map.flyTo(meM.getLatLng(),17.5,{duration:.75});
  toast('تم تقريب الخريطة وتوسيط السيارة');
};

// HUD
let spd=0,limitV=120,lastWarn=0;
function setSpeed(k){
  spd=k;
  const v=units==='mph'?k*.621:k;
  $('#spd').textContent=Math.round(v);
  $('#unit').textContent=units==='mph'?'MPH':'KM/H';
  $('#gear').textContent=k<1?'P':'D'+Math.min(8,1+Math.floor(k/18));
  const over=k>limitV;
  $('#limit').classList.toggle('over',over);
  $('#limit').textContent=units==='mph'?Math.round(limitV*.621):limitV;
  if(over&&LS.rrSpdW!=='0'&&Date.now()-lastWarn>6000){lastWarn=Date.now();chime('warn')}
}
const ARW={left:'↰','sharp left':'↰','slight left':'↖',right:'↱','sharp right':'↱','slight right':'↗',straight:'↑',uturn:'↶'};

function stopSim(){
  if(sim)clearInterval(sim);
  sim=null;
  navActive=false;
  $('#demo')&&$('#demo').classList.remove('on');
  const startBtn=$('#btnStartNav');
  if(startBtn){
    startBtn.textContent='▶ انطلاق · START NAVIGATION (تقريب 3D)';
    startBtn.classList.remove('active-nav');
  }
}

$('#demo').onclick=()=>{
  if(navActive){stopSim();setSpeed(0);return}
  startTurnByTurnNavigation();
};

$('#voiceNav').onclick=()=>{
  LS.rrVoice=LS.rrVoice==='0'?'1':'0';
  $('#voiceNav').textContent=LS.rrVoice==='0'?'Voice Off':'Voice On';
  $('#voiceSw')&&$('#voiceSw').classList.toggle('on',LS.rrVoice!=='0');
};

window.addEventListener('load',()=>{
  try{mkMini('miniMap');mkMini('miniMap2')}catch(e){}
  setSpeed(0);
  $('#voiceNav').textContent=LS.rrVoice==='0'?'Voice Off':'Voice On';
});
