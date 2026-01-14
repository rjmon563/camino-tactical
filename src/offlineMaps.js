/**
 * ============================================================
 * SISTEMA DE MAPAS OFFLINE - BUEN CAMINO EVOLUTION
 * ============================================================
 * Este módulo gestiona la descarga, almacenamiento y recuperación
 * de mapas para el Camino de Santiago, permitiendo el uso de la
 * aplicación sin conexión a internet (Modo Ahorro de Batería).
 * * Basado en Capacitor 6 Filesystem y OpenStreetMap.
 */

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

/**
 * CONFIGURACIÓN GLOBAL DEL MOTOR DE MAPAS
 * ---------------------------------------
 * Define los límites geográficos que cubren todo el trazado del
 * Camino Francés desde Saint-Jean-Pied-de-Port hasta Santiago.
 */
const OFFLINE_MAP_CONFIG = {
  // Servidor oficial de tiles (imágenes) de OpenStreetMap
  tileServer: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  
  // Atribución obligatoria por licencia de datos abiertos
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  
  // Límites geográficos: Cubre toda la ruta del norte de España
  caminoBounds: {
    north: 43.5, // Límite norte (Costa Cantábrica)
    south: 41.8, // Límite sur (Meseta)
    west: -9.5,  // Límite oeste (Fisterra)
    east: -1.0   // Límite este (Pirineos)
  },
  
  // Niveles de detalle (Zoom) optimizados
  zoomLevels: {
    min: 10,     // Vista provincial
    default: 14, // Vista de marcha (senderos visibles)
    max: 17      // Detalle de calles y albergues
  }
};

/**
 * UTILIDADES MATEMÁTICAS DE PROYECCIÓN MERCATOR
 * ---------------------------------------------
 * Estas funciones convierten coordenadas geográficas (Lat/Lon)
 * en coordenadas de rejilla (X/Y) para el servidor de mapas.
 */

const lon2tile = (lon, z) => {
  return Math.floor((lon + 180) / 360 * Math.pow(2, z));
};

const lat2tile = (lat, z) => {
  const rad = lat * Math.PI / 180;
  return Math.floor((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * Math.pow(2, z));
};

/**
 * GENERADOR DE LISTA DE TILES
 * ---------------------------
 * Calcula qué imágenes exactas se necesitan descargar para cubrir
 * el área del Camino en un nivel de zoom determinado.
 */
function getTilesForBounds(bounds, zoom) {
  const tiles = [];
  
  const xMin = lon2tile(bounds.west, zoom);
  const xMax = lon2tile(bounds.east, zoom);
  const yMin = lat2tile(bounds.north, zoom);
  const yMax = lat2tile(bounds.south, zoom);
  
  for (let x = xMin; x <= xMax; x++) {
    for (let y = yMin; y <= yMax; y++) {
      tiles.push({ x, y, z: zoom });
    }
  }
  
  return tiles;
}

/**
 * FUNCIÓN PRINCIPAL: downloadCaminoMap
 * ------------------------------------
 * Ejecuta la descarga masiva de imágenes. Utiliza un sistema de
 * lotes (batching) para no saturar la memoria RAM del móvil.
 */
export async function downloadCaminoMap(onProgress) {
  // Validación de entorno nativo (Android/iOS)
  if (!Capacitor.isNativePlatform()) {
    console.error('ERROR: El sistema offline requiere entorno nativo.');
    return false;
  }
  
  try {
    const allTiles = [];
    
    // Recopilamos tiles desde Zoom 10 hasta Zoom 15
    for (let zoom = 10; zoom <= 15; zoom++) {
      const tiles = getTilesForBounds(OFFLINE_MAP_CONFIG.caminoBounds, zoom);
      allTiles.push(...tiles.map(t => ({ ...t, z: zoom })));
    }
    
    console.log(`Iniciando motor de descarga: ${allTiles.length} elementos.`);
    
    let downloaded = 0;
    const total = allTiles.length;
    
    // PROCESAMIENTO POR LOTES DE 10 ELEMENTOS
    for (let i = 0; i < allTiles.length; i += 10) {
      const batch = allTiles.slice(i, i + 10);
      
      await Promise.all(batch.map(async (tile) => {
        try {
          const url = `https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`;
          
          // PETICIÓN HTTP CON CABECERAS DE SEGURIDAD
          const response = await fetch(url, {
            method: 'GET',
            headers: { 
              'User-Agent': 'BuenCaminoEvolution/1.0 (Android; Mobile)',
              'Accept': 'image/png'
            }
          });

          if (!response.ok) throw new Error(`HTTP Status: ${response.status}`);
          
          const blob = await response.blob();
          const base64 = await blobToBase64(blob);
          
          // ESCRITURA EN DISCO LOCAL (CAPACITOR FILESYSTEM)
          await Filesystem.writeFile({
            path: `maps/${tile.z}/${tile.x}/${tile.y}.png`,
            data: base64,
            directory: Directory.Data,
            recursive: true
          });
          
          downloaded++;
          
          // Reportar progreso a la interfaz de usuario (React)
          if (onProgress && downloaded % 2 === 0) {
            onProgress(downloaded, total);
          }
        } catch (err) {
          console.warn(`Tile fallido en ${tile.z}/${tile.x}/${tile.y}:`, err.message);
        }
      }));
      
      // Pausa técnica para permitir al sistema procesar archivos (Garbage Collection)
      await new Promise(resolve => setTimeout(resolve, 85));
    }
    
    // GENERACIÓN DE METADATOS DE INTEGRIDAD
    await Filesystem.writeFile({
      path: 'maps/metadata.json',
      data: JSON.stringify({
        lastUpdate: new Date().toISOString(),
        bounds: OFFLINE_MAP_CONFIG.caminoBounds,
        tilesDownloaded: downloaded,
        status: 'COMPLETE',
        version: '1.2.0'
      }),
      directory: Directory.Data,
      encoding: 'utf8'
    });
    
    console.log('✅ Base de datos de mapas offline lista.');
    return true;
    
  } catch (error) {
    console.error('Error crítico en el proceso de descarga:', error);
    return false;
  }
}

/**
 * VERIFICADOR DE ESTADO
 * --------------------
 * Comprueba si el archivo de metadatos existe para confirmar que
 * el mapa está disponible sin internet.
 */
export async function isMapDownloaded() {
  if (!Capacitor.isNativePlatform()) return false;
  
  try {
    const result = await Filesystem.stat({
      path: 'maps/metadata.json',
      directory: Directory.Data
    });
    return !!result;
  } catch (e) {
    return false;
  }
}

/**
 * LECTOR DE TILES LOCALES
 * -----------------------
 * Recupera una imagen específica desde la memoria del teléfono
 * y la convierte en un formato que el mapa puede mostrar.
 */
export async function getOfflineTile(z, x, y) {
  if (!Capacitor.isNativePlatform()) return null;
  
  try {
    const file = await Filesystem.readFile({
      path: `maps/${z}/${x}/${y}.png`,
      directory: Directory.Data
    });
    return `data:image/png;base64,${file.data}`;
  } catch (e) {
    return null;
  }
}

/**
 * GESTOR DE ALMACENAMIENTO
 * ------------------------
 * Elimina todos los archivos del mapa para liberar espacio en el móvil.
 */
export async function deleteOfflineMap() {
  if (!Capacitor.isNativePlatform()) return false;
  
  try {
    await Filesystem.rmdir({
      path: 'maps',
      directory: Directory.Data,
      recursive: true
    });
    console.log('🗑️ Almacenamiento de mapas liberado.');
    return true;
  } catch (error) {
    console.error('Error al intentar borrar mapas:', error);
    return false;
  }
}

/**
 * CALCULADORA DE ESPACIO
 * ----------------------
 * Lee el archivo de metadatos y calcula el peso en MB de los mapas.
 */
export async function getMapSize() {
  if (!Capacitor.isNativePlatform()) return 0;
  
  try {
    const metadata = await Filesystem.readFile({
      path: 'maps/metadata.json',
      directory: Directory.Data
    });
    const data = JSON.parse(metadata.data);
    // Cada tile de OSM pesa de media 18.5 KB
    return (data.tilesDownloaded * 18.5) / 1024; 
  } catch (e) {
    return 0;
  }
}

/**
 * CONVERSOR DE BINARIO A TEXTO (BASE64)
 * -------------------------------------
 * Necesario para que Capacitor pueda guardar las imágenes en el móvil.
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * CLASE OfflineTileLayer
 * ----------------------
 * Integración personalizada para Leaflet que decide automáticamente
 * de dónde sacar la imagen según el estado de la conexión.
 */
export class OfflineTileLayer {
  constructor(isOnline = true) {
    this.isOnline = isOnline;
  }
  
  async getTileUrl(coords) {
    const { x, y, z } = coords;
    
    // Si estamos en web o tenemos conexión, cargamos de la red
    if (this.isOnline || !Capacitor.isNativePlatform()) {
      return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    }
    
    // Si estamos offline, buscamos en la memoria interna
    const offlineData = await getOfflineTile(z, x, y);
    
    if (offlineData) {
      return offlineData;
    }
    
    // En caso de no tener el tile descargado, devolvemos un píxel transparente
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  }
}

/**
 * EXPORTACIÓN POR DEFECTO
 * -----------------------
 */
export default {
  downloadCaminoMap,
  isMapDownloaded,
  getOfflineTile,
  deleteOfflineMap,
  getMapSize,
  OfflineTileLayer,
  config: OFFLINE_MAP_CONFIG
};

/**
 * FIN DEL ARCHIVO - BUEN CAMINO
 */