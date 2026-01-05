import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MessageCircle, Crosshair, RotateCcw, AlertTriangle, Zap, Activity, Navigation
} from 'lucide-react';

/* ===================== ESTILOS TÁCTICOS ===================== */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap');
:root { --yellow:#facc15; --red:#ff0000; --black:#050505; --cyan:#00e5ff; --green:#22c55e; --orange:#f97316; }
html, body, #root { margin: 0; height: 100%; background: var(--black); font-family: 'JetBrains Mono', monospace; color: white; overflow: hidden; }
.leaflet-container { height: 100%; width: 100%; background: #000; filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(120%); z-index: 1; }

.sniper-scope-marker { position: relative; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; }
.scope-cross-h, .scope-cross-v { position: absolute; background: red; box-shadow: 0 0 8px red; }
.scope-cross-h { width: 100%; height: 2px; }
.scope-cross-v { width: 2px; height: 100%; }
.scope-circle { width: 44px; height: 44px; border: 2px solid red; border-radius: 50%; box-shadow: 0 0 10px red; }
.scope-pulse { position: absolute; width: 40px; height: 40px; border: 2px solid red; border-radius: 50%; animation: pulse 1.5s infinite; }
@keyframes pulse { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }

.tactical-stats { position: fixed; top: 20px; right: 20px; z-index: 1000; background: rgba(0,0,0,0.9); border: 2px solid var(--cyan); padding: 12px; border-radius: 8px; min-width: 140px; border-left: 6px solid var(--cyan); }
.stat-line { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 4px; }

.selector-container { position: fixed; top: 20px; left: 20px; z-index: 5000; width: 230px; }
select { background: #111; color: var(--yellow); border: 2px solid var(--yellow); padding: 12px; font-family: 'JetBrains Mono'; border-radius: 6px 6px 0 0; width: 100%; font-size: 11px; font-weight: 800; border-bottom: none; outline: none; }
.stage-details { background: rgba(0,0,0,0.95); border: 2px solid var(--yellow); padding: 10px; border-radius: 0 0 8px 8px; font-size: 10px; color: var(--orange); font-weight: 800; border-top: 1px solid rgba(250,204,21,0.3); }

.bottom-console { position: fixed; bottom: 0; left: 0; right: 0; background: #0a0a0a; border-top: 3px solid var(--yellow); display: flex; justify-content: space-around; align-items: center; padding: 15px 10px 35px 10px; z-index: 6000; }
.btn-ui { border-radius: 16px; border: 2px solid rgba(255,255,255,0.2); display: flex; flex-direction: column; align-items: center; justify-content: center; width: 75px; height: 75px; color: white; font-weight: 900; cursor: pointer; }

.sos-menu { position: absolute; bottom: 100px; left: 10px; display: flex; flex-direction: column; gap: 10px; width: 240px; z-index: 9999; }
.sos-btn-call { padding: 20px; border-radius: 12px; color: white; text-decoration: none; text-align: center; font-weight: 900; border: 3px solid white; font-size: 14px; box-shadow: 0 0 15px rgba(255,0,0,0.5); }
`;

/* ===================== DATABASE ÍNTEGRA ===================== */
const STAGES = [
  { id:1, name:"SJ Pied de Port - Roncesvalles", coords:[43.0125,-1.3148], dist:24.2, dPlus:1250, diff:"Muy Alta" },
  { id:2, name:"Roncesvalles - Zubiri", coords:[42.9298,-1.5042], dist:21.4, dPlus:300, diff:"Alta" },
  { id:3, name:"Zubiri - Pamplona", coords:[42.8125,-1.6458], dist:20.4, dPlus:190, diff:"Baja" },
  { id:4, name:"Pamplona - P. la Reina", coords:[42.6719,-1.8139], dist:24.0, dPlus:450, diff:"Media" },
  { id:5, name:"P. la Reina - Estella", coords:[42.6715,-2.0315], dist:22.6, dPlus:350, diff:"Media" },
  { id:6, name:"Estella - Los Arcos", coords:[42.5684,-2.1917], dist:21.3, dPlus:250, diff:"Media" },
  { id:7, name:"Los Arcos - Logroño", coords:[42.4627,-2.445], dist:27.6, dPlus:250, diff:"Media" },
  { id:8, name:"Logroño - Nájera", coords:[42.4162,-2.7303], dist:29.0, dPlus:350, diff:"Alta" },
  { id:9, name:"Nájera - Sto. Domingo", coords:[42.4411,-2.9535], dist:20.7, dPlus:250, diff:"Baja" },
  { id:10, name:"Sto. Domingo - Belorado", coords:[42.4194,-3.1904], dist:22.0, dPlus:150, diff:"Baja" },
  { id:11, name:"Belorado - Agés", coords:[42.3664,-3.4503], dist:27.4, dPlus:450, diff:"Media" },
  { id:12, name:"Agés - Burgos", coords:[42.3440,-3.6969], dist:23.0, dPlus:150, diff:"Baja" },
  { id:13, name:"Burgos - Hontanas", coords:[42.3120,-4.0450], dist:31.1, dPlus:250, diff:"Muy Alta" },
  { id:14, name:"Hontanas - Frómista", coords:[42.2668,-4.4061], dist:24.7, dPlus:150, diff:"Media" },
  { id:15, name:"Frómista - Carrión", coords:[42.3389,-4.6067], dist:18.8, dPlus:50, diff:"Baja" },
  { id:16, name:"Carrión - Terradillos", coords:[42.3610,-4.9248], dist:26.3, dPlus:100, diff:"Media" },
  { id:17, name:"Terradillos - Sahagún", coords:[42.3719,-5.0315], dist:13.3, dPlus:50, diff:"Baja" },
  { id:18, name:"Sahagún - Bercianos", coords:[42.4230,-5.2215], dist:17.2, dPlus:50, diff:"Baja" },
  { id:19, name:"Bercianos - León", coords:[42.5987,-5.5671], dist:26.3, dPlus:100, diff:"Media" },
  { id:20, name:"León - San Martín", coords:[42.5200,-5.8100], dist:24.6, dPlus:100, diff:"Baja" },
  { id:21, name:"San Martín - Astorga", coords:[42.4544,-6.0560], dist:23.7, dPlus:250, diff:"Media" },
  { id:22, name:"Astorga - Foncebadón", coords:[42.4385,-6.3450], dist:25.8, dPlus:600, diff:"Alta" },
  { id:23, name:"Foncebadón - Ponferrada", coords:[42.5455,-6.5936], dist:26.8, dPlus:150, diff:"Alta" },
  { id:24, name:"Ponferrada - Villafranca", coords:[42.6074,-6.8115], dist:24.2, dPlus:150, diff:"Baja" },
  { id:25, name:"Villafranca - O Cebreiro", coords:[42.7077,-7.0423], dist:27.8, dPlus:1100, diff:"Muy Alta" },
  { id:26, name:"O Cebreiro - Triacastela", coords:[42.7565,-7.2403], dist:20.8, dPlus:100, diff:"Alta" },
  { id:27, name:"Triacastela - Sarria", coords:[42.7770,-7.4160], dist:18.4, dPlus:250, diff:"Baja" },
  { id:28, name:"Sarria - Portomarín", coords:[42.8075,-7.6160], dist:22.2, dPlus:400, diff:"Media" },
  { id:29, name:"Portomarín - Palas de Rei", coords:[42.8732,-7.8687], dist:24.8, dPlus:450, diff:"Media" },
  { id:30, name:"Palas de Rei - Arzúa", coords:[42.9265,-8.1634], dist:28.5, dPlus:450, diff:"Alta" },
  { id:31, name:"Arzúa - O Pedrouzo", coords:[42.9100,-8.3600], dist:19.3, dPlus:200, diff:"Baja" },
  { id:32, name:"O Pedrouzo - Santiago", coords:[42.8870,-8.5100], dist:19.4, dPlus:250, diff:"Baja" },
  { id:33, name:"Santiago de Compostela", coords:[42.8806,-8.5464], dist:0, dPlus:0, diff:"META" }
];

const ROUTE_PATH = STAGES.map(s => s.coords);

function MapController({ userPos, tracking, targetStage }) {
  const map = useMap();
  useEffect(() => {
    if (tracking && userPos) {
      map.setView(userPos, 18, { animate: true });
    }
  }, [userPos, tracking, map]);

  useEffect(() => {
    if (targetStage && !tracking) {
      map.flyTo(targetStage, 15, { animate: true });
    }
  }, [targetStage, tracking, map]);
  return null;
}

export default function App() {
  const [activeStage, setActiveStage] = useState(STAGES[0]);
  const [steps, setSteps] = useState(0);
  const [distance, setDistance] = useState(0);
  const [userPos, setUserPos] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [booting, setBooting] = useState(true);
  
  const lastPos = useRef(null);
  const lastStepTime = useRef(0);
  const geoWatchId = useRef(null);

  const calculateKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2-lat1)*Math.PI/180;
    const dLon = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
    return R * (2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  };

  const startTacticalSystem = async () => {
    // 1. Iniciar Geolocalización de Alta Precisión
    if ("geolocation" in navigator) {
      geoWatchId.current = navigator.geolocation.watchPosition((p) => {
        const newPos = [p.coords.latitude, p.coords.longitude];
        
        // Calcular KM si hay movimiento real
        if (lastPos.current) {
          const d = calculateKm(lastPos.current[0], lastPos.current[1], newPos[0], newPos[1]);
          if (d > 0.002) { // Más de 2 metros para evitar ruido del GPS
            setDistance(prev => prev + d);
          }
        }
        lastPos.current = newPos;
        setUserPos(newPos);
      }, (err) => alert("ERROR GPS: Activa la ubicación en ajustes."), 
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 });
    }

    // 2. Iniciar Podómetro (Acelerómetro)
    if (window.DeviceMotionEvent) {
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        const res = await DeviceMotionEvent.requestPermission();
        if (res === 'granted') window.addEventListener('devicemotion', handleMotion);
      } else {
        window.addEventListener('devicemotion', handleMotion);
      }
    }
    setBooting(false);
  };

  const handleMotion = (e) => {
    const acc = e.accelerationIncludingGravity;
    if (!acc) return;
    const force = Math.sqrt(acc.x**2 + acc.y**2 + acc.z**2);
    // Umbral táctico para paso detectado
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
          <button onClick={startTacticalSystem} style={{background:'var(--yellow)', padding:'25px 50px', borderRadius:'15px', color:'black', fontWeight:900, border:'none', cursor:'pointer', fontSize:'20px', boxShadow:'0 0 20px var(--yellow)'}}>
            INICIAR GPS TÁCTICO
          </button>
          <p className="mt-6 text-white/40 text-[10px] tracking-[0.3em]">V16.3 SYSTEM READY</p>
        </div>
      )}

      <div className="selector-container">
        <select value={activeStage.id} onChange={(e) => {
          const s = STAGES.find(x => x.id === parseInt(e.target.value));
          setActiveStage(s);
          setIsTracking(false);
        }}>
          {STAGES.map(s => <option key={s.id} value={s.id}>ETAPA {s.id}: {s.name.substring(0,18)}</option>)}
        </select>
        <div className="stage-details">
          DISTANCIA: {activeStage.dist} KM | +{activeStage.dPlus}M<br/>
          DIFICULTAD: {activeStage.diff}
        </div>
      </div>

      <div className="tactical-stats">
        <div className="stat-line" style={{color:'var(--yellow)'}}><Activity size={18}/> <b>{steps} PASOS</b></div>
        <div className="stat-line" style={{color:'var(--cyan)'}}><Navigation size={18}/> <b>{distance.toFixed(3)} KM</b></div>
      </div>

      <MapContainer center={activeStage.coords} zoom={14} zoomControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Polyline positions={ROUTE_PATH} pathOptions={{ color: 'var(--yellow)', weight: 5, opacity: 0.9 }} />
        
        {userPos && (
          <Marker position={userPos} icon={L.divIcon({
            className: '',
            html: `<div class="sniper-scope-marker"><div class="scope-cross-h"></div><div class="scope-cross-v"></div><div class="scope-circle"></div><div class="scope-pulse"></div></div>`,
            iconSize: [80, 80], iconAnchor: [40, 40]
          })} />
        )}

        <MapController userPos={userPos} tracking={isTracking} targetStage={activeStage.coords} />
      </MapContainer>

      <div className="bottom-console">
        <div className="relative">
          {sosOpen && (
            <div className="sos-menu">
              <a href="tel:112" className="sos-btn-call" style={{background:'var(--red)'}}>📞 112 EMERGENCIAS</a>
              <a href="tel:062" className="sos-btn-call" style={{background:'#1b4d1b'}}>📞 062 GUARDIA CIVIL</a>
            </div>
          )}
          <button onClick={() => setSosOpen(!sosOpen)} className="btn-ui" style={{background:'var(--red)'}}>
            <AlertTriangle size={32}/><span className="text-[10px] mt-1">SOS</span>
          </button>
        </div>

        <button onClick={() => window.open(`https://wa.me/?text=UBICACION TACTICA: ${userPos?.[0]},${userPos?.[1]}`)} className="btn-ui" style={{background:'var(--green)', color:'black'}}>
          <MessageCircle size={32}/><span className="text-[10px] mt-1">WHATSAPP</span>
        </button>

        <button 
          onClick={() => {
            if(!userPos) alert("Buscando señal GPS...");
            setIsTracking(!isTracking);
          }} 
          className="btn-ui" 
          style={{
            background:'var(--orange)', 
            border: isTracking ? '4px solid white' : '2px solid rgba(255,255,255,0.2)',
            boxShadow: isTracking ? '0 0 15px var(--orange)' : 'none'
          }}
        >
          <Crosshair size={35} color={isTracking ? "white" : "black"}/>
          <span className="text-[10px] mt-1">{isTracking ? 'LOCK ON' : 'LOCK OFF'}</span>
        </button>

        <button onClick={() => { if(confirm("¿RESET?")) {setSteps(0); setDistance(0);} }} className="btn-ui" style={{background:'var(--orange)'}}>
          <RotateCcw size={32}/><span className="text-[10px] mt-1">RESET</span>
        </button>
      </div>
    </div>
  );
}