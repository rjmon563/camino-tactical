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

.tactical-stats { position: fixed; top: 85px; right: 20px; z-index: 1000; background: rgba(0,0,0,0.85); border: 1px solid var(--orange); padding: 12px; border-radius: 4px; font-size: 11px; color: var(--orange); }
.selector-container { position: fixed; top: 20px; left: 20px; right: 20px; z-index: 5000; }
select { background: var(--gray); color: var(--orange); border: 1px solid var(--orange); padding: 12px; font-family: 'JetBrains Mono'; border-radius: 4px; width: 100%; font-size: 14px; font-weight: 800; outline: none; }

.bottom-console { position: fixed; bottom: 0; left: 0; right: 0; background: #000; border-top: 2px solid var(--orange); display: grid; grid-template-columns: repeat(4, 1fr); padding: 10px 10px 35px 10px; z-index: 6000; gap: 8px; }
.btn-ui { border-radius: 8px; border: 1px solid #333; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 75px; color: white; font-weight: 900; cursor: pointer; font-size: 10px; background: var(--gray); text-decoration: none; }

.btn-wsap { background: var(--green) !important; color: black !important; border: none; }
.btn-track { background: var(--orange) !important; color: black !important; border: none; }
.btn-rest { background: var(--orange) !important; color: black !important; border: none; }
.btn-sos { background: #400 !important; border: 1px solid red !important; color: white !important; }

.overlay-info { position: fixed; bottom: 135px; left: 20px; right: 20px; background: rgba(0,0,0,0.9); border-left: 4px solid var(--orange); padding: 12px; border-radius: 4px; z-index: 1000; display: flex; justify-content: space-between; font-size: 11px; border-top: 1px solid #333; }
.sos-dropdown { position: fixed; bottom: 130px; left: 20px; right: 20px; z-index: 8000; background: #200; border: 2px solid red; border-radius: 10px; padding: 20px; display: flex; flex-direction: column; gap: 15px; }
.sos-call { background: white; color: red; padding: 15px; border-radius: 8px; text-align: center; font-weight: 900; text-decoration: none; font-size: 18px; }
`;

const STAGES = [
  { id:1, name:"SJ Pied de Port - Roncesvalles", coords:[43.0125,-1.3148], diff:"ALTA", des:"1.250m" },
  { id:2, name:"Roncesvalles - Zubiri", coords:[42.9298,-1.5042], diff:"MEDIA", des:"400m" },
  { id:3, name:"Zubiri - Pamplona", coords:[42.8125,-1.6458], diff:"BAJA", des:"150m" },
  { id:4, name:"Pamplona - P. la Reina", coords:[42.6719,-1.8139], diff:"MEDIA", des:"450m" },
  { id:5, name:"P. la Reina - Estella", coords:[42.6715,-2.0315], diff:"BAJA", des:"200m" },
  { id:6, name:"Estella - Los Arcos", coords:[42.5684,-2.1917], diff:"BAJA", des:"150m" },
  { id:7, name:"Los Arcos - Logroño", coords:[42.4627,-2.445], diff:"BAJA", des:"100m" },
  { id:8, name:"Logroño - Nájera", coords:[42.4162,-2.7303], diff:"MEDIA", des:"300m" },
  { id:9, name:"Nájera - Sto. Domingo", coords:[42.4411,-2.9535], diff:"BAJA", des:"250m" },
  { id:10, name:"Sto. Domingo - Belorado", coords:[42.4194,-3.1904], diff:"BAJA", des:"150m" },
  { id:11, name:"Belorado - Agés", coords:[42.3664,-3.4503], diff:"MEDIA", des:"400m" },
  { id:12, name:"Agés - Burgos", coords:[42.3440,-3.6969], diff:"BAJA", des:"100m" },
  { id:13, name:"Burgos - Hontanas", coords:[42.3120,-4.0450], diff:"MEDIA", des:"300m" },
  { id:14, name:"Hontanas - Frómista", coords:[42.2668,-4.4061], diff:"BAJA", des:"50m" },
  { id:15, name:"Frómista - Carrión", coords:[42.3389,-4.6067], diff:"BAJA", des:"50m" },
  { id:16, name:"Carrión - Terradillos", coords:[42.3610,-4.9248], diff:"BAJA", des:"100m" },
  { id:17, name:"Terradillos - Sahagún", coords:[42.3719,-5.0315], diff:"BAJA", des:"50m" },
  { id:18, name:"Sahagún - Bercianos", coords:[42.4230,-5.2215], diff:"BAJA", des:"50m" },
  { id:19, name:"Bercianos - León", coords:[42.5987,-5.5671], diff:"BAJA", des:"100m" },
  { id:20, name:"León - San Martín", coords:[42.5200,-5.8100], diff:"BAJA", des:"50m" },
  { id:21, name:"San Martín - Astorga", coords:[42.4544,-6.0560], diff:"BAJA", des:"150m" },
  { id:22, name:"Astorga - Foncebadón", coords:[42.4385,-6.3450], diff:"MEDIA", des:"600m" },
  { id:23, name:"Foncebadón - Ponferrada", coords:[42.5455,-6.5936], diff:"ALTA", des:"-900m" },
  { id:24, name:"Ponferrada - Villafranca", coords:[42.6074,-6.8115], diff:"BAJA", des:"100m" },
  { id:25, name:"Villafranca - O Cebreiro", coords:[42.7077,-7.0423], diff:"ALTA", des:"1.000m" },
  { id:26, name:"O Cebreiro - Triacastela", coords:[42.7565,-7.2403], diff:"MEDIA", des:"-600m" },
  { id:27, name:"Triacastela - Sarria", coords:[42.7770,-7.4160], diff:"BAJA", des:"200m" },
  { id:28, name:"Sarria - Portomarín", coords:[42.8075,-7.6160], diff:"MEDIA", des:"350m" },
  { id:29, name:"Portomarín - Palas de Rei", coords:[42.8732,-7.8687], diff:"MEDIA", des:"400m" },
  { id:30, name:"Palas de Rei - Arzúa", coords:[42.9265,-8.1634], diff:"MEDIA", des:"350m" },
  { id:31, name:"Arzúa - O Pedrouzo", coords:[42.9100,-8.3600], diff:"BAJA", des:"150m" },
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

  // MOTOR DE SENSORES Y PODÓMETRO
  const startTacticalSystem = async () => {
    // 1. ACTIVAR GPS DE ALTA PRECISIÓN (KM)
    if ("geolocation" in navigator) {
      navigator.geolocation.watchPosition((p) => {
        const currentPos = [p.coords.latitude, p.coords.longitude];
        
        if (lastPos.current) {
          const R = 6371;
          const dLat = (currentPos[0] - lastPos.current[0]) * Math.PI / 180;
          const dLon = (currentPos[1] - lastPos.current[1]) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lastPos.current[0] * Math.PI / 180) * Math.cos(currentPos[0] * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
          const d = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
          
          // Solo sumamos si el movimiento es real (más de 2 metros)
          if (d > 0.002) setDistance(prev => prev + d);
        }
        
        lastPos.current = currentPos;
        setUserPos(currentPos);
      }, (err) => alert("Error GPS: " + err.message), 
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 });
    }

    // 2. ACTIVAR ACELERÓMETRO (PASOS)
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const response = await DeviceMotionEvent.requestPermission();
        if (response === 'granted') {
          window.addEventListener('devicemotion', handleMotion, true);
        }
      } catch (e) { alert("Permiso de Movimiento requerido para el podómetro"); }
    } else {
      window.addEventListener('devicemotion', handleMotion, true);
    }
    setBooting(false);
  };

  const handleMotion = (e) => {
    const acc = e.accelerationIncludingGravity;
    if (!acc) return;

    // Calculamos la fuerza total del movimiento (Vector Magnitud)
    const totalForce = Math.sqrt(acc.x**2 + acc.y**2 + acc.z**2);
    
    // Umbral de paso: 12.0 es caminar normal. 
    // Filtro de tiempo: Evitamos contar 2 veces el mismo paso (300ms)
    if (totalForce > 12.0) {
      const now = Date.now();
      if (now - lastStepTime.current > 300) {
        setSteps(prev => prev + 1);
        lastStepTime.current = now;
      }
    }
  };

  return (
    <div className="h-screen w-screen bg-black">
      <style>{STYLES}</style>

      {booting && (
        <div style={{position:'fixed', inset:0, background:'black', zIndex:10000, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:20}}>
          <Zap size={100} color="var(--orange)" className="animate-pulse mb-8" />
          <h1 style={{color:'var(--orange)', marginBottom:20}}>SISTEMA TÁCTICO S-33</h1>
          <button onClick={startTacticalSystem} style={{background:'var(--orange)', padding:'30px', borderRadius:'12px', color:'black', fontWeight:900, border:'none', fontSize:'18px', boxShadow:'0 0 30px var(--orange)'}}>
            ACTIVAR PODÓMETRO Y GPS
          </button>
          <p style={{marginTop:20, fontSize:10, opacity:0.6}}>Pulsa para autorizar el seguimiento de pasos y kilómetros</p>
        </div>
      )}

      {showSos && (
        <div className="sos-dropdown">
          <div style={{textAlign:'center', fontWeight:900, fontSize:20}}>EMERGENCIA</div>
          <a href="tel:112" className="sos-call">LLAMAR 112</a>
          <a href="tel:062" className="sos-call" style={{background:'#eee'}}>GUARDIA CIVIL</a>
          <button onClick={() => setShowSos(false)} style={{background:'none', border:'none', color:'white'}}>CERRAR</button>
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
        <div><AlertTriangle size={14} color="var(--orange)"/> DIFICULTAD: <b>{activeStage.diff}</b></div>
        <div><Mountain size={14} color="var(--orange)"/> DESNIVEL: <b>{activeStage.des}</b></div>
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
        <button onClick={() => window.open(`https://wa.me/?text=GPS: ${userPos}`)} className="btn-ui btn-wsap">
          <MessageCircle size={28}/>WSAP
        </button>
        <button onClick={() => setIsTracking(!isTracking)} className="btn-ui btn-track">
          <Crosshair size={28}/>{isTracking ? 'LOCKED' : 'TRACK'}
        </button>
        <button onClick={() => {setSteps(0); setDistance(0);}} className="btn-ui btn-rest">
          <RotateCcw size={28}/>REST
        </button>
        <button onClick={() => setShowSos(true)} className="btn-ui btn-sos">
          <ShieldAlert size={28}/>SOS
        </button>
      </div>
    </div>
  );
}