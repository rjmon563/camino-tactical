import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MessageCircle, Crosshair, RotateCcw, AlertTriangle, Zap, Activity, Navigation, Mountain, ShieldAlert, Phone
} from 'lucide-react';

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap');
:root { --orange:#f97316; --yellow:#facc15; --red:#ff0000; --black:#0b0b0b; --gray:#1a1a1a; --cyan:#00e5ff; }
html, body, #root { margin: 0; height: 100%; background: var(--black); font-family: 'JetBrains Mono', monospace; color: white; overflow: hidden; position: fixed; width: 100%; }
.leaflet-container { height: 100%; width: 100%; background: #000; filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(120%); z-index: 1; }

/* FRANCOTIRADOR NARANJA */
.sniper-scope-marker { position: relative; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; }
.scope-cross-h, .scope-cross-v { position: absolute; background: var(--orange); box-shadow: 0 0 12px var(--orange); z-index: 10; }
.scope-cross-h { width: 100%; height: 2px; }
.scope-cross-v { width: 2px; height: 100%; }
.scope-circle { width: 44px; height: 44px; border: 3px solid var(--orange); border-radius: 50%; box-shadow: 0 0 15px var(--orange); }

.tactical-stats { position: fixed; top: 85px; right: 20px; z-index: 1000; background: rgba(0,0,0,0.85); border: 1px solid var(--orange); padding: 12px; border-radius: 4px; font-size: 11px; color: var(--orange); }
.selector-container { position: fixed; top: 20px; left: 20px; right: 20px; z-index: 5000; }
select { background: var(--gray); color: var(--orange); border: 1px solid var(--orange); padding: 12px; font-family: 'JetBrains Mono'; border-radius: 4px; width: 100%; font-size: 14px; font-weight: 800; outline: none; }

.bottom-console { position: fixed; bottom: 0; left: 0; right: 0; background: #050505; border-top: 2px solid var(--orange); display: grid; grid-template-columns: repeat(4, 1fr); padding: 10px 10px 30px 10px; z-index: 6000; gap: 10px; }
.btn-ui { border-radius: 8px; border: 1px solid #333; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 70px; color: white; font-weight: 700; cursor: pointer; font-size: 10px; background: #151515; text-decoration: none; }
.btn-ui.active-orange { background: var(--orange) !important; color: black !important; border: none; }

.overlay-info { position: fixed; bottom: 125px; left: 20px; right: 20px; background: rgba(0,0,0,0.9); border-left: 4px solid var(--orange); padding: 12px; border-radius: 4px; z-index: 1000; display: flex; justify-content: space-between; font-size: 10px; border-top: 1px solid #333; }

/* MENÚ SOS MEJORADO */
.sos-dropdown { position: fixed; bottom: 120px; left: 20px; right: 20px; z-index: 8000; background: #400; border: 2px solid var(--red); border-radius: 10px; padding: 15px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 0 40px rgba(0,0,0,1); }
.sos-btn-call { background: white; color: red; padding: 15px; border-radius: 6px; text-align: center; font-weight: 900; text-decoration: none; font-size: 16px; border: none; }
`;

const STAGES = [
  { id:1, name:"SJ Pied de Port - Roncesvalles", coords:[43.0125,-1.3148], diff:"ALTA", des:"1.250m" },
  { id:2, name:"Roncesvalles - Zubiri", coords:[42.9298,-1.5042], diff:"MEDIA", des:"400m" },
  { id:3, name:"Zubiri - Pamplona", coords:[42.8125,-1.6458], diff:"BAJA", des:"150m" },
  { id:32, name:"O Pedrouzo - Santiago", coords:[42.8870,-8.5100], diff:"BAJA", des:"200m" },
  { id:33, name:"Santiago de Compostela", coords:[42.8806,-8.5464], diff:"META", des:"0m" }
];

const FULL_PATH = STAGES.map(s => s.coords);

function MapController({ userPos, tracking, targetCoords }) {
  const map = useMap();
  useEffect(() => {
    if (tracking && userPos) {
      map.setView(userPos, 18, { animate: true });
    } else if (targetCoords && !tracking) {
      map.flyTo(targetCoords, 14, { duration: 1.5 });
    }
  }, [userPos, tracking, targetCoords, map]);
  return null;
}

export default function App() {
  const [activeStage, setActiveStage] = useState(STAGES[0]);
  const [steps, setSteps] = useState(0);
  const [distance, setDistance] = useState(0);
  const [userPos, setUserPos] = useState(null);
  const [isTracking, setIsTracking] = useState(true);
  const [booting, setBooting] = useState(true);
  const [showSos, setShowSos] = useState(false);
  const lastPos = useRef(null);
  const lastStepTime = useRef(0);

  const startSystem = async () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.watchPosition((p) => {
        const newPos = [p.coords.latitude, p.coords.longitude];
        if (lastPos.current) {
          const R = 6371;
          const dLat = (newPos[0]-lastPos.current[0])*Math.PI/180;
          const dLon = (newPos[1]-lastPos.current[1])*Math.PI/180;
          const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lastPos.current[0]*Math.PI/180)*Math.cos(newPos[0]*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
          const d = R * (2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
          if (d > 0.002) setDistance(prev => prev + d);
        }
        lastPos.current = newPos;
        setUserPos(newPos);
      }, null, { enableHighAccuracy: true });
    }
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      const p = await DeviceMotionEvent.requestPermission();
      if (p === 'granted') window.addEventListener('devicemotion', handleMotion);
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
          <Zap size={80} color="var(--orange)" className="animate-pulse mb-8" />
          <button onClick={startSystem} style={{background:'var(--orange)', padding:'25px 50px', borderRadius:'8px', color:'black', fontWeight:900, border:'none', fontSize:'16px'}}>INICIAR RASTREO TÁCTICO</button>
        </div>
      )}

      {/* MENÚ SOS DESPLEGABLE */}
      {showSos && (
        <div className="sos-dropdown">
          <div style={{textAlign:'center', fontWeight:900, fontSize:18}}>CENTRO DE EMERGENCIAS</div>
          <a href="tel:112" className="sos-btn-call">LLAMAR 112</a>
          <a href="tel:062" className="sos-btn-call" style={{background:'#eee'}}>GUARDIA CIVIL</a>
          <button onClick={() => setShowSos(false)} style={{background:'none', border:'none', color:'white', marginTop:10}}>CANCELAR</button>
        </div>
      )}

      <div className="selector-container">
        <select value={activeStage.id} onChange={(e) => {
          setActiveStage(STAGES.find(x => x.id === parseInt(e.target.value)));
          setIsTracking(false);
        }}>
          {STAGES.map(s => <option key={s.id} value={s.id}>OBJETIVO: {s.name}</option>)}
        </select>
      </div>

      <div className="tactical-stats">
        <div><Activity size={12}/> {steps} PASOS</div>
        <div style={{marginTop:5}}><Navigation size={12}/> {distance.toFixed(3)} KM</div>
      </div>

      <div className="overlay-info">
        <div>DIFICULTAD: <span style={{color:'var(--orange)'}}>{activeStage.diff}</span></div>
        <div>DESNIVEL: <span style={{color:'var(--orange)'}}>{activeStage.des}</span></div>
      </div>

      <MapContainer center={activeStage.coords} zoom={14} zoomControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Polyline positions={FULL_PATH} pathOptions={{ color: '#f97316', weight: 5 }} />
        
        {userPos && (
          <Marker position={userPos} icon={L.divIcon({
            className: '',
            html: `<div class="sniper-scope-marker">
                    <div class="scope-cross-h"></div>
                    <div class="scope-cross-v"></div>
                    <div class="scope-circle"></div>
                   </div>`,
            iconSize: [80, 80], iconAnchor: [40, 40]
          })} />
        )}
        <MapController userPos={userPos} tracking={isTracking} targetCoords={activeStage.coords} />
      </MapContainer>

      <div className="bottom-console">
        <button onClick={() => window.open(`https://wa.me/?text=GPS: ${userPos}`)} className="btn-ui"><MessageCircle size={24}/>WSAP</button>
        
        <button onClick={() => setIsTracking(!isTracking)} className={`btn-ui ${isTracking ? 'active-orange' : ''}`}>
          <Crosshair size={24}/>{isTracking ? 'LOCKED' : 'TRACK'}
        </button>
        
        {/* BOTÓN REST (RESET) CON FONDO NARANJA */}
        <button onClick={() => {setSteps(0); setDistance(0);}} className="btn-ui active-orange">
          <RotateCcw size={24}/>REST
        </button>
        
        <button onClick={() => setShowSos(true)} className="btn-ui" style={{background:'#400', border:'1px solid red'}}>
          <ShieldAlert size={24} color="red"/>SOS
        </button>
      </div>
    </div>
  );
}