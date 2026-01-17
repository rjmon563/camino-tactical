import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const OFFLINE_MAP_CONFIG = {
  tileServer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '© OpenStreetMap contributors',
  caminoBounds: {
    north: 43.2,
    south: 42.0,
    west: -8.6,
    east: -1.2
  },
  zoomLevels: {
    min: 10,
    default: 14,
    max: 17
  }
};

function getTilesForBounds(bounds, zoom) {
  const tiles = [];
  const lon2tile = (lon, z) => Math.floor((lon + 180) / 360 * Math.pow(2, z));
  const lat2tile = (lat, z) => Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
  
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

export async function downloadCaminoMap(onProgress) {
  if (!Capacitor.isNativePlatform()) {
    console.log('Descarga solo disponible en app nativa');
    return false;
  }
  
  try {
    const allTiles = [];
    for (let zoom = 10; zoom <= 15; zoom++) {
      const tiles = getTilesForBounds(OFFLINE_MAP_CONFIG.caminoBounds, zoom);
      allTiles.push(...tiles.map(t => ({ ...t, z: zoom })));
    }
    
    let downloaded = 0;
    const total = allTiles.length;
    
    for (let i = 0; i < allTiles.length; i += 10) {
      const batch = allTiles.slice(i, i + 10);
      
      await Promise.all(batch.map(async (tile) => {
        try {
          const url = OFFLINE_MAP_CONFIG.tileServer
            .replace('{s}', 'a')
            .replace('{z}', tile.z)
            .replace('{x}', tile.x)
            .replace('{y}', tile.y);
          
          const response = await fetch(url);
          const blob = await response.blob();
          const base64 = await blobToBase64(blob);
          
          await Filesystem.writeFile({
            path: `maps/${tile.z}/${tile.x}/${tile.y}.png`,
            data: base64,
            directory: Directory.Data,
            recursive: true
          });
          
          downloaded++;
          if (onProgress) onProgress(downloaded, total);
        } catch (err) {
          console.error(`Error tile ${tile.z}/${tile.x}/${tile.y}:`, err);
        }
      }));
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    await Filesystem.writeFile({
      path: 'maps/metadata.json',
      data: JSON.stringify({
        downloaded: new Date().toISOString(),
        bounds: OFFLINE_MAP_CONFIG.caminoBounds,
        tiles: allTiles.length,
        version: '1.0'
      }),
      directory: Directory.Data
    });
    
    return true;
  } catch (error) {
    console.error('Error descargando mapa:', error);
    return false;
  }
}

export async function isMapDownloaded() {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    await Filesystem.readFile({
      path: 'maps/metadata.json',
      directory: Directory.Data
    });
    return true;
  } catch {
    return false;
  }
}

export async function deleteOfflineMap() {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    await Filesystem.rmdir({
      path: 'maps',
      directory: Directory.Data,
      recursive: true
    });
    return true;
  } catch (error) {
    console.error('Error eliminando mapa:', error);
    return false;
  }
}

export async function getMapSize() {
  if (!Capacitor.isNativePlatform()) return 0;
  try {
    const metadata = await Filesystem.readFile({
      path: 'maps/metadata.json',
      directory: Directory.Data
    });
    const data = JSON.parse(metadata.data);
    return (data.tiles * 15) / 1024; // MB
  } catch {
    return 0;
  }
}

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

export default {
  downloadCaminoMap,
  isMapDownloaded,
  deleteOfflineMap,
  getMapSize,
  config: OFFLINE_MAP_CONFIG
};
