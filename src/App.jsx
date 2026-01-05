import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MessageCircle, Crosshair, RotateCcw, AlertTriangle, Zap, Activity, Navigation
} from 'lucide-react';

/* ===================== ESTILOS TÁCTICOS FINAL ===================== */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap');
:root { --yellow:#facc15; --red:#ff0000; --black:#050505; --cyan:#00e5ff; --green:#22c55e; --orange:#f97316; }
html, body, #root { margin: 0; height: 100%; background: var(--black); font-family: 'JetBrains Mono', monospace; color: white; overflow: hidden; position: fixed; width: 100%; }
.leaflet-container { height: 100%; width: 100%; background: #000; filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(120%); z-index: 1; }

.sniper-scope-marker { position: relative; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; }
.scope-cross-h, .scope-cross-v { position: absolute; background: red; box-shadow: 0 0 8px red; }
.scope-cross-h { width: 100%; height: 2px; }
.scope-cross-v { width: 2px; height: 100%; }
.scope-circle { width: 44px; height: 44px; border: 2px solid red; border-radius: 50%; box-shadow: 0 0 10px red; }

.tactical-stats { position: fixed; top: 20px; right: 20px; z-index: 1000; background: rgba(0,0,0,0.9); border: 2px solid var(--cyan); padding: 12px; border-radius: 8px; border-left: 6px solid var(--cyan); }
.selector-container { position: fixed; top: 20px; left: 20px; z-index: 5000; width: 220px; }
select { background: #111; color: var(--yellow); border: 2px solid var(--yellow); padding: 10px; font-family: 'JetBrains Mono'; border-radius: 6px; width: 100%; font-size: 11px; font-weight: 800; outline: none; }

.bottom-console { position: fixed; bottom: 0; left: 0; right: 0; background: #0a0a0a; border-top: 3px solid var(--yellow); display: flex; justify-content: space-around; align-items: center; padding: 15px 10px 40px 10px; z-index: 6000; }
.btn-ui { border-radius: 16px; border: 2px solid rgba(255,255,255,0.2); display: flex; flex-direction: column; align-items: center; justify-content: center; width: 70px; height: 70px; color: white; font-weight: 900; cursor: pointer; }
`;

/* ===================== DATABASE COMPLETA (33 ETAPAS) ===================== */
const STAGES = [
  { id:1, name:"SJ Pied de Port - Roncesvalles", coords:[43.0125,-1.3148] },
  { id:2, name:"Roncesvalles - Zubiri", coords:[42.9298,-1.5042] },
  { id:3, name:"Zubiri - Pamplona", coords:[42.8125,-1.6458] },
  { id:4, name:"Pamplona - P. la Reina", coords:[42.6719,-1.8139] },
  { id:5, name:"P. la Reina - Estella", coords:[42.6715,-2.0315] },
  { id:6, name:"Estella - Los Arcos", coords:[42.5684,-2.1917] },
  { id:7, name:"Los Arcos - Logroño", coords:[42.4627,-2.445] },
  { id:8, name:"Logroño - Nájera", coords:[42.4162,-2.7303] },
  { id:9, name:"Nájera - Sto. Domingo", coords:[42.4411,-2.9535] },
  { id:10, name:"Sto. Domingo - Belorado", coords:[42.4194,-3.1904] },
  { id:11, name:"Belorado - Agés", coords:[42.3664,-3.4503] },
  { id:12, name:"Agés - Burgos", coords:[42.3440,-3.6969] },
  { id:13, name:"Burgos - Hontanas", coords:[42.3120,-4.0450] },
  { id:14, name:"Hontanas - Frómista", coords:[42.2668,-4.4061] },
  { id:15, name:"Frómista - Carrión", coords:[42.3389,-4.6067] },
  { id:16, name:"Carrión - Terradillos", coords:[42.3610,-4.9248] },
  { id:17, name:"Terradillos - Sahagún", coords:[42.3719,-5.0315] },
  { id:18, name:"Sahagún - Bercianos", coords:[42.4230,-5.2215] },
  { id:19, name:"Bercianos - León", coords:[42.5987,-5.5671] },
  { id:20, name:"León - San Martín", coords:[42.5200,-5.8100] },
  { id:21, name:"San Martín - Astorga", coords:[42.4544,-6.0560] },
  { id:22, name:"Astorga - Foncebadón", coords:[42.4385,-6.3450] },
  { id:23, name:"Foncebadón - Ponferrada", coords:[42.5455,-6.5936] },
  { id:24, name:"Ponferrada - Villafranca", coords:[42.6074,-6.8115] },
  { id:25, name:"Villafranca - O Cebreiro", coords:[42.7077,-7.0423] },
  { id:26, name:"O Cebreiro - Triacastela", coords:[42.7565,-7.2403] },
  { id:27, name:"Triacastela - Sarria", coords:[42.7770,-7.4160] },
  { id:28, name:"Sarria - Portomarín", coords:[42.8075,-7.6160] },
  { id:29, name:"Portomarín - Palas de Rei", coords:[42.8732,-7.8687] },
  { id:30, name:"Palas de Rei - Arzúa", coords:[42.9265,-8.1634] },
  { id:31, name:"Arzúa - O Pedrouzo", coords:[42.9100,-8.3600] },
  { id:32, name:"O Pedrouzo - Santiago", coords:[42.8870,-8.5100] },
  { id:33, name:"Santiago de Compostela", coords:[42.8806,-8.5464] }
];

const ROUTE_PATH = STAGES.map(s => s.coords);

function MapController({ userPos, tracking, targetStage }) {
  const map = useMap();
  useEffect(() => {
    if (tracking && userPos) map.setView(userPos, 18, { animate: true });
  }, [userPos, tracking, map]);
  useEffect(() => {
    if (targetStage && !tracking) map.flyTo(targetStage, 15, { animate: true });
  }, [targetStage, tracking, map]);
  return null;
}

export default function App() {
  const [activeStage, setActiveStage] = useState(STAGES[0]);
  const [steps, setSteps] = useState(0);
  const [distance, setDistance] = useState(0);
  const [userPos, setUserPos] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [booting, setBooting] = useState(true);
  
  const lastPos = useRef(null);
  const lastStepTime = useRef(0);

  const calculateKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2-lat1)*Math.PI/180;
    const dLon = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
    return R * (2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  };

  const startTacticalSystem = async () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.watchPosition((p) => {
        const newPos = [p.coords.latitude, p.coords.longitude];
        if (lastPos.current) {
          const d = calculateKm(lastPos.current[0], lastPos.current[1], newPos[0], newPos[1]);
          if (d > 0.002) setDistance(prev => prev + d);
        }
        lastPos.current = newPos;
        setUserPos(newPos);
      }, (err) => alert("ERROR GPS: " + err.message), { enableHighAccuracy: true, maximumAge: 0 });
    }

    if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
      const res = await DeviceMotionEvent.requestPermission();
      if (res === 'granted') window.addEventListener('devicemotion', handleMotion);
    } else {
      window.addEventListener('devicemotion', handleMotion);
    }
    setBooting(false);
  };

  const handleMotion = (e) => {
    const acc = e.accelerationIncludingGravity;
    if (!acc) return;
    const force = Math.sqrt(acc.x**2 + acc.y**2 + acc.z**2);
    if (force > 12.5 && Date.now() - lastStepTime.current > 350) {
      setSteps(s => s + 1);
      lastStepTime.current = Date.now();
    }
  };

  return (
    <div className="h-screen w-screen bg-black">
      <style>{STYLES}</style>

      {booting && (
        <div style={{position:'fixed', inset:0, background:'black', zIndex:10000, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
          <Zap size={80} color="var(--yellow)" className="animate-pulse mb-8" />
          <button onClick={startTacticalSystem} style={{background:'var(--yellow)', padding:'25px 50px', borderRadius:'15px', color:'black', fontWeight:900, border:'none', cursor:'pointer', fontSize:'20px'}}>INICIAR SISTEMA TÁCTICO</button>
        </div>
      )}

      <div className="selector-container">
        <select value={activeStage.id} onChange={(e) => {
          const s = STAGES.find(x => x.id === parseInt(e.target.value));
          setActiveStage(s);
          setIsTracking(false);
        }}>
          {STAGES.map(s => <option key={s.id} value={s.id}>ETAPA {s.id}: {s.name}</option>)}
        </select>
      </div>

      <div className="tactical-stats">
        <div style={{color:'var(--yellow)', fontSize:'12px'}}><Activity size={14}/> <b>{steps} PASOS</b></div>
        <div style={{color:'var(--cyan)', fontSize:'12px'}}><Navigation size={14}/> <b>{distance.toFixed(3)} KM</b></div>
      </div>

      <MapContainer center={activeStage.coords} zoom={14} zoomControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Polyline positions={ROUTE_PATH} pathOptions={{ color: 'var(--yellow)', weight: 5, opacity: 0.9 }} />
        
        {userPos && (
          <Marker position={userPos} icon={L.divIcon({
            className: '',
            html: `<div class="sniper-scope-marker"><div class="scope-cross-h"></div><div class="scope-cross-v"></div><div class="scope-circle"></div></div>`,
            iconSize: [80, 80], iconAnchor: [40, 40]
          })} />
        )}

        <MapController userPos={userPos} tracking={isTracking} targetStage={activeStage.coords} />
      </MapContainer>

      <div className="bottom-console">
        <button onClick={() => window.open(`https://wa.me/?text=UBICACION GPS: ${userPos?.[0]},${userPos?.[1]}`)} className="btn-ui" style={{background:'var(--green)', color:'black'}}>
          <MessageCircle size={32}/><span className="text-[10px] mt-1">WHATSAPP</span>
        </button>

        <button onClick={() => setIsTracking(!isTracking)} className="btn-ui" style={{background:'var(--orange)', border: isTracking ? '4px solid white' : 'none'}}>
          <Crosshair size={35} color={isTracking ? "white" : "black"}/>
          <span className="text-[10px] mt-1">LOCK</span>
        </button>

        <button onClick={() => { setSteps(0); setDistance(0); }} className="btn-ui" style={{background:'var(--orange)'}}>
          <RotateCcw size={32}/><span className="text-[10px] mt-1">RESET</span>
        </button>
      </div>
    </div>
  );
}