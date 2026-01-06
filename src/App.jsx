import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MessageCircle, Crosshair, RotateCcw, AlertTriangle, Zap, Activity, Navigation, Mountain, ShieldAlert
} from 'lucide-react';

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap');
:root { --yellow:#facc15; --red:#ff0000; --black:#050505; --cyan:#00e5ff; --green:#22c55e; --orange:#f97316; }
html, body, #root { margin: 0; height: 100%; background: var(--black); font-family: 'JetBrains Mono', monospace; color: white; overflow: hidden; position: fixed; width: 100%; }
.leaflet-container { height: 100%; width: 100%; background: #000; filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(120%); z-index: 1; }

/* FRANCOTIRADOR */
.sniper-scope-marker { position: relative; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; }
.scope-cross-h, .scope-cross-v { position: absolute; background: red; box-shadow: 0 0 8px red; z-index: 10; }
.scope-cross-h { width: 100%; height: 2px; }
.scope-cross-v { width: 2px; height: 100%; }
.scope-circle { width: 44px; height: 44px; border: 2px solid red; border-radius: 50%; box-shadow: 0 0 10px red; }

.tactical-stats { position: fixed; top: 85px; right: 20px; z-index: 1000; background: rgba(0,0,0,0.9); border: 2px solid var(--cyan); padding: 10px; border-radius: 8px; font-size: 12px; border-left: 5px solid var(--cyan); }
.selector-container { position: fixed; top: 20px; left: 20px; right: 20px; z-index: 5000; }
select { background: #111; color: var(--yellow); border: 2px solid var(--yellow); padding: 12px; font-family: 'JetBrains Mono'; border-radius: 6px; width: 100%; font-size: 14px; font-weight: 800; }
.bottom-console { position: fixed; bottom: 0; left: 0; right: 0; background: #0a0a0a; border-top: 3px solid var(--yellow); display: grid; grid-template-columns: repeat(4, 1fr); padding: 15px 10px 35px 10px; z-index: 6000; gap: 8px; }
.btn-ui { border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); display: flex; flex-direction: column; align-items: center; justify-content: center; height: 75px; color: white; font-weight: 900; cursor: pointer; font-size: 9px; }
.overlay-info { position: fixed; bottom: 135px; left: 20px; right: 20px; background: rgba(0,0,0,0.9); border: 1px solid var(--yellow); padding: 10px; border-radius: 8px; z-index: 1000; display: flex; justify-content: space-between; font-size: 11px; }
.sos-menu { position: fixed; top: 150px; left: 20px; z-index: 7000; background: #900; border: 2px solid white; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 10px; }
.sos-option { background: white; color: red; padding: 10px; border-radius: 5px; font-weight: 800; text-align: center; text-decoration: none; font-size: 12px; }
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

function MapController({ userPos, tracking, targetStage }) {
  const map = useMap();
  useEffect(() => { if (tracking && userPos) map.setView(userPos, 18); }, [userPos, tracking, map]);
  useEffect(() => { if (targetStage && !tracking) map.flyTo(targetStage, 15); }, [targetStage, tracking, map]);
  return null;
}

export default function App() {
  const [activeStage, setActiveStage] = useState(STAGES[0]);
  const [steps, setSteps] = useState(0);
  const [distance, setDistance] = useState(0);
  const [userPos, setUserPos] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [booting, setBooting] = useState(true);
  const [showSosMenu, setShowSosMenu] = useState(false);
  const lastPos = useRef(null);
  const lastStepTime = useRef(0);

  // FUNCIÓN PARA CALCULAR DISTANCIA REAL GPS
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2-lat1)*Math.PI/180;
    const dLon = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
    return R * (2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  };

  // ACTIVACIÓN DE SENSORES (GPS + PODÓMETRO)
  const activateSensors = async () => {
    // 1. GPS
    if ("geolocation" in navigator) {
      navigator.geolocation.watchPosition((p) => {
        const newPos = [p.coords.latitude, p.coords.longitude];
        if (lastPos.current) {
          const d = calculateDistance(lastPos.current[0], lastPos.current[1], newPos[0], newPos[1]);
          if (d > 0.003) setDistance(prev => prev + d); // Solo suma si se mueve más de 3 metros
        }
        lastPos.current = newPos;
        setUserPos(newPos);
      }, (err) => alert("ERROR GPS: Activa la ubicación en tu móvil."), { enableHighAccuracy: true });
    }

    // 2. PODÓMETRO (Acelerómetro)
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      const permission = await DeviceMotionEvent.requestPermission();
      if (permission === 'granted') {
        window.addEventListener('devicemotion', handleMotion);
      }
    } else {
      window.addEventListener('devicemotion', handleMotion);
    }
    setBooting(false);
  };

  const handleMotion = (e) => {
    const acc = e.accelerationIncludingGravity;
    if (!acc) return;
    const force = Math.sqrt(acc.x**2 + acc.y**2 + acc.z**2);
    // Umbral de paso detectado (12.5 es un paso firme)
    if (force > 12.5 && Date.now() - lastStepTime.current > 350) {
      setSteps(s => s + 1);
      lastStepTime.current = Date.now();
    }
  };

  return (
    <div className="h-screen w-screen bg-black">
      <style>{STYLES}</style>

      {booting && (
        <div style={{position:'fixed', inset:0, background:'black', zIndex:10000, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:20}}>
          <Zap size={100} color="var(--yellow)" className="animate-pulse mb-8" />
          <h1 style={{color:'var(--yellow)', marginBottom:20}}>SISTEMA TÁCTICO S-33</h1>
          <button onClick={activateSensors} style={{background:'var(--yellow)', padding:'30px', borderRadius:'15px', color:'black', fontWeight:900, border:'none', fontSize:'18px', boxShadow:'0 0 20px var(--yellow)'}}>
            AUTORIZAR GPS Y PODÓMETRO
          </button>
          <p style={{marginTop:20, fontSize:10}}>Pulsa para activar el rastreo y la mira del francotirador</p>
        </div>
      )}

      {/* BOTÓN SOS FLOTANTE */}
      <button 
        style={{position:'fixed', top:85, left:20, zIndex:2000, background:'red', border:'none', borderRadius:'50%', width:55, height:55, color:'white', boxShadow:'0 0 15px red'}}
        onClick={() => setShowSosMenu(!showSosMenu)}
      >
        <ShieldAlert size={30} />
      </button>

      {showSosMenu && (
        <div className="sos-menu">
          <div style={{fontWeight:900, textAlign:'center', color:'white'}}>EMERGENCIA</div>
          <a href="tel:112" className="sos-option">LLAMAR 112</a>
          <a href="tel:062" className="sos-option">GUARDIA CIVIL</a>
          <button onClick={() => setShowSosMenu(false)} style={{background:'none', border:'none', color:'white'}}>CERRAR</button>
        </div>
      )}

      <div className="selector-container">
        <select value={activeStage.id} onChange={(e) => setActiveStage(STAGES.find(x => x.id === parseInt(e.target.value)))}>
          {STAGES.map(s => <option key={s.id} value={s.id}>ETAPA {s.id}: {s.name}</option>)}
        </select>
      </div>

      <div className="tactical-stats">
        <div style={{color:'var(--yellow)'}}><Activity size={14}/> <b>{steps} PASOS</b></div>
        <div style={{color:'var(--cyan)', marginTop:'5px'}}><Navigation size={14}/> <b>{distance.toFixed(3)} KM</b></div>
      </div>

      <div className="overlay-info">
        <div><AlertTriangle size={14} color="var(--orange)"/> DIFICULTAD: <b>{activeStage.diff}</b></div>
        <div><Mountain size={14} color="var(--cyan)"/> DESNIVEL: <b>{activeStage.des}</b></div>
      </div>

      <MapContainer center={activeStage.coords} zoom={14} zoomControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Polyline positions={FULL_PATH} pathOptions={{ color: '#facc15', weight: 6 }} />
        
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
        <MapController userPos={userPos} tracking={isTracking} targetStage={activeStage.coords} />
      </MapContainer>

      <div className="bottom-console">
        <button onClick={() => {
          const coords = userPos ? `${userPos[0]},${userPos[1]}` : "Sin señal";
          window.open(`https://wa.me/?text=UBICACIÓN TÁCTICA: https://www.google.com/maps?q=${coords}`);
        }} className="btn-ui" style={{background:'var(--green)', color:'black'}}><MessageCircle size={28}/>WSAP GPS</button>
        
        <button onClick={() => setIsTracking(!isTracking)} className="btn-ui" style={{background: isTracking ? 'var(--cyan)' : '#222', color: isTracking ? 'black' : 'white'}}>
          <Crosshair size={28}/>{isTracking ? 'LOCKED' : 'TRACK'}
        </button>
        
        <button onClick={() => {setSteps(0); setDistance(0);}} className="btn-ui" style={{background:'#222'}}><RotateCcw size={28}/>RESET</button>
        
        <button onClick={() => setShowSosMenu(true)} className="btn-ui" style={{background:'var(--red)'}}><ShieldAlert size={28}/>SOS</button>
      </div>
    </div>
  );
}