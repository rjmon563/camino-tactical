import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MessageCircle, Crosshair, RotateCcw, AlertTriangle, Zap, Activity, Navigation, Mountain, ShieldAlert
} from 'lucide-react';

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap');
:root { --orange:#f97316; --green:#22c55e; --black:#050505; --gray:#151515; --red:#ff0000; }
html, body, #root { margin: 0; height: 100%; background: var(--black); font-family: 'JetBrains Mono', monospace; color: white; overflow: hidden; position: fixed; width: 100%; }
.leaflet-container { height: 100%; width: 100%; background: #000; filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(120%); z-index: 1; }

.sniper-scope-marker { position: relative; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; }
.scope-cross-h, .scope-cross-v { position: absolute; background: var(--orange); box-shadow: 0 0 12px var(--orange); z-index: 10; }
.scope-cross-h { width: 100%; height: 2px; }
.scope-cross-v { width: 2px; height: 100%; }
.scope-circle { width: 44px; height: 44px; border: 3px solid var(--orange); border-radius: 50%; box-shadow: 0 0 15px var(--orange); }

.tactical-stats { position: fixed; top: 85px; right: 20px; z-index: 1000; background: rgba(0,0,0,0.85); border: 1px solid var(--orange); padding: 12px; border-radius: 4px; font-size: 11px; color: var(--orange); border-left: 3px solid var(--orange); }
.selector-container { position: fixed; top: 20px; left: 20px; right: 20px; z-index: 5000; }
select { background: var(--gray); color: var(--orange); border: 2px solid var(--orange); padding: 12px; font-family: 'JetBrains Mono'; border-radius: 4px; width: 100%; font-size: 14px; font-weight: 800; outline: none; }

.bottom-console { position: fixed; bottom: 0; left: 0; right: 0; background: #000; border-top: 2px solid var(--orange); display: grid; grid-template-columns: repeat(4, 1fr); padding: 10px 10px 35px 10px; z-index: 6000; gap: 8px; }
.btn-ui { border-radius: 8px; border: 1px solid #333; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 75px; color: white; font-weight: 900; cursor: pointer; font-size: 10px; background: var(--gray); text-decoration: none; }

.btn-wsap { background: var(--green) !important; color: black !important; }
.btn-track { border: 2px solid var(--orange) !important; transition: all 0.3s; }
.btn-track.active { background: var(--orange) !important; color: black !important; box-shadow: 0 0 20px var(--orange); }
.btn-rest { background: var(--orange) !important; color: black !important; }
.btn-sos { background: #400 !important; border: 2px solid red !important; color: white !important; }

.sos-dropdown { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; background: rgba(60,0,0,0.95); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; gap: 20px; }
.sos-card { background: #000; border: 2px solid red; padding: 30px; border-radius: 15px; width: 100%; max-width: 300px; display: flex; flex-direction: column; gap: 15px; }
.sos-link { background: red; color: white; padding: 20px; border-radius: 10px; text-align: center; font-weight: 900; text-decoration: none; fontSize: 20px; }

.gps-log { position: fixed; top: 160px; right: 20px; z-index: 1000; font-size: 10px; background: #000; color: #ff0000; padding: 5px; border: 1px solid red; }
`;

const STAGES = [
  { id: 1, name: "SJ Pied de Port - Roncesvalles", coords: [43.0125, -1.3148] },
  { id: 2, name: "Roncesvalles - Zubiri", coords: [42.9298, -1.5042] },
  { id: 32, name: "O Pedrouzo - Santiago", coords: [42.8870, -8.5100] },
  { id: 33, name: "Santiago de Compostela", coords: [42.8806, -8.5464] }
];

function MapController({ userPos, tracking }) {
  const map = useMap();
  useEffect(() => {
    if (tracking && userPos) {
      map.setView(userPos, 18);
    }
  }, [userPos, tracking, map]);
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
  const [errorStatus, setErrorStatus] = useState("");
  
  const lastPos = useRef(null);
  const lastStepTime = useRef(0);

  const requestPermissionsAndStart = async () => {
    setErrorStatus("SOLICITANDO PERMISOS...");
    
    // GPS
    if (!navigator.geolocation) {
      setErrorStatus("GPS NO SOPORTADO");
      return;
    }

    navigator.geolocation.watchPosition(
      (p) => {
        const current = [p.coords.latitude, p.coords.longitude];
        setErrorStatus("GPS OK");
        
        if (lastPos.current) {
          const R = 6371;
          const dLat = (current[0] - lastPos.current[0]) * Math.PI / 180;
          const dLon = (current[1] - lastPos.current[1]) * Math.PI / 180;
          const a = Math.sin(dLat/2)**2 + Math.cos(lastPos.current[0]*Math.PI/180)*Math.cos(current[0]*Math.PI/180)*Math.sin(dLon/2)**2;
          const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          if (d > 0.002) setDistance(prev => prev + d);
        }
        lastPos.current = current;
        setUserPos(current);
      },
      (err) => {
        if (err.code === 1) setErrorStatus("ERROR 1: PERMISO DENEGADO");
        else setErrorStatus(`ERROR GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );

    // PODÓMETRO
    if (window.DeviceMotionEvent) {
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        const permission = await DeviceMotionEvent.requestPermission();
        if (permission === 'granted') window.addEventListener('devicemotion', handleMotion);
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
    if (force > 12.5) {
      const now = Date.now();
      if (now - lastStepTime.current > 350) {
        setSteps(s => s + 1);
        lastStepTime.current = now;
      }
    }
  };

  return (
    <div className="h-screen w-screen bg-black">
      <style>{STYLES}</style>

      {booting && (
        <div style={{position:'fixed', inset:0, background:'black', zIndex:10000, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20}}>
          <Zap size={80} color="var(--orange)" className="animate-pulse mb-8" />
          <button onClick={requestPermissionsAndStart} style={{background:'var(--orange)', padding:'30px', borderRadius:'15px', color:'black', fontWeight:900, border:'none', fontSize:'20px', width:'100%'}}>
            DAR PERMISOS Y EMPEZAR
          </button>
          <p style={{color:'red', marginTop:20, fontSize:12}}>{errorStatus}</p>
        </div>
      )}

      {showSos && (
        <div className="sos-dropdown">
          <div className="sos-card">
            <h2 style={{color:'red', textAlign:'center'}}>EMERGENCIA</h2>
            <a href="tel:112" className="sos-link">LLAMAR 112</a>
            <a href="tel:062" className="sos-link" style={{background:'#555'}}>GUARDIA CIVIL</a>
            <button onClick={() => setShowSos(false)} style={{background:'none', border:'none', color:'white', marginTop:10}}>CERRAR</button>
          </div>
        </div>
      )}

      <div className="selector-container">
        <select onChange={(e) => {
          setActiveStage(STAGES.find(s => s.id === parseInt(e.target.value)));
          setIsTracking(false);
        }}>
          {STAGES.map(s => <option key={s.id} value={s.id}>OBJETIVO: {s.name}</option>)}
        </select>
      </div>

      <div className="tactical-stats">
        <div><Activity size={14}/> PASOS: {steps}</div>
        <div style={{marginTop:8}}><Navigation size={14}/> DIST: {distance.toFixed(3)} KM</div>
      </div>

      <div className="gps-log">{errorStatus}</div>

      <MapContainer center={activeStage.coords} zoom={15} zoomControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {userPos && (
          <Marker position={userPos} icon={L.divIcon({
            className: '',
            html: `<div class="sniper-scope-marker"><div class="scope-cross-h"></div><div class="scope-cross-v"></div><div class="scope-circle"></div></div>`,
            iconSize: [80, 80], iconAnchor: [40, 40]
          })} />
        )}
        <MapController userPos={userPos} tracking={isTracking} />
      </MapContainer>

      <div className="bottom-console">
        <button onClick={() => window.open(`https://wa.me/?text=GPS: ${userPos}`)} className="btn-ui btn-wsap"><MessageCircle size={28}/></button>
        <button onClick={() => setIsTracking(!isTracking)} className={`btn-ui btn-track ${isTracking ? 'active' : ''}`}><Crosshair size={28}/>{isTracking ? 'LOCKED' : 'TRACK'}</button>
        <button onClick={() => {setSteps(0); setDistance(0);}} className="btn-ui btn-rest"><RotateCcw size={28}/></button>
        <button onClick={() => setShowSos(true)} className="btn-ui btn-sos"><ShieldAlert size={28}/></button>
      </div>
    </div>
  );
}