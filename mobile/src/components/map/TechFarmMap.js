/**
 * TechFarmMap — composant carte universel (vue satellite)
 * - Web     : react-leaflet
 * - Natif   : WebView avec Leaflet via CDN
 *
 * Props:
 *   markers      : [{ id, lat, lng, label, color? }]
 *   polygons     : [{ id, geometry (GeoJSON Geometry), label }]  — délimitations parcelles
 *   sensorMarkers: [{ id, lat, lng, icon, color, label }]
 *   focusedIndex : number | null            (index du marker à centrer)
 *   style        : ViewStyle optionnel
 */
import React, { useEffect, useRef } from 'react';
import { Platform, View, StyleSheet } from 'react-native';

const TILE_SATELLITE = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Tiles &copy; Esri',
};

// ---------- Web ----------
let LeafletMap = null;
if (Platform.OS === 'web') {
  const { MapContainer, TileLayer, Marker, Tooltip, GeoJSON: GeoJSONLayer, useMap } = require('react-leaflet');
  const L = require('leaflet');

  // Fix icônes Leaflet cassées avec webpack
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });

  // Pastille colorée + emoji pour un capteur
  var sensorDivIcon = (icon, color) => L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:${color || '#3498db'};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.55);font-size:14px;line-height:1;">${icon || '◎'}</div>`,
    className: '',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

  function MapController({ markers, polygons, focusedIndex }) {
    const map = useMap();
    const isFirstRef = useRef(true);
    useEffect(() => {
      if (markers.length === 0) return;
      const isFirst = isFirstRef.current;
      isFirstRef.current = false;

      if (focusedIndex !== null && focusedIndex !== undefined && markers[focusedIndex]) {
        // Zoom sur la parcelle focalisée, en incluant son polygone dans les bounds
        const m = markers[focusedIndex];
        const poly = polygons && polygons[focusedIndex];
        let bounds = L.latLngBounds([[m.lat, m.lng]]);
        if (poly?.geometry?.coordinates?.[0]) {
          poly.geometry.coordinates[0].forEach(([lng, lat]) => bounds.extend([lat, lng]));
        }
        const opts = { padding: [30, 30], maxZoom: 16 };
        if (isFirst) map.fitBounds(bounds, opts);
        else map.flyToBounds(bounds, { ...opts, duration: 0.9 });
      } else {
        // Inclure tous les polygones dans les bounds globaux
        let allCoords = markers.map(m => [m.lat, m.lng]);
        (polygons || []).forEach(p => {
          p?.geometry?.coordinates?.[0]?.forEach(([lng, lat]) => allCoords.push([lat, lng]));
        });
        const bounds = L.latLngBounds(allCoords);
        if (isFirst) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
        else map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 15, duration: 1 });
      }
    }, [focusedIndex, markers.length]);
    return null;
  }

  LeafletMap = function TechFarmMapWeb({ markers = [], polygons = [], sensorMarkers = [], focusedIndex = null, style }) {
    const center = markers.length > 0
      ? [markers[0].lat, markers[0].lng]
      : [46.5, 2.5];

    return (
      <div style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative', ...(style || {}) }}>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <div style={{ position: 'absolute', inset: '0' }}>
          <MapContainer center={center} zoom={13} style={{ width: '100%', height: '100%', minHeight: 260 }}>
            <TileLayer url={TILE_SATELLITE.url} attribution={TILE_SATELLITE.attribution} />
            {/* Délimitations des parcelles */}
            {polygons.map(p => {
              if (!p.geometry || !p.geometry.type || !p.geometry.coordinates) return null;
              const feature = { type: 'Feature', properties: { label: p.label }, geometry: p.geometry };
              return (
                <GeoJSONLayer
                  key={p.id}
                  data={feature}
                  style={{ color: '#2ecc71', weight: 2.5, fillColor: '#2ecc71', fillOpacity: 0.18 }}
                  onEachFeature={(feat, layer) => {
                    if (feat.properties?.label) {
                      layer.bindTooltip(feat.properties.label, { sticky: true, direction: 'top', offset: [0, -4] });
                    }
                  }}
                />
              );
            })}
            {markers.map(m => (
              <Marker key={m.id} position={[m.lat, m.lng]}>
                <Tooltip sticky direction="top" offset={[0, -28]}><strong>{m.label}</strong></Tooltip>
              </Marker>
            ))}
            {/* Marqueurs capteurs (icône par type) */}
            {sensorMarkers.map(s => (
              <Marker key={`s-${s.id}`} position={[s.lat, s.lng]} icon={sensorDivIcon(s.icon, s.color)}>
                <Tooltip direction="top" offset={[0, -14]}>{s.icon} <strong>{s.label}</strong></Tooltip>
              </Marker>
            ))}
            <MapController markers={markers} polygons={polygons} focusedIndex={focusedIndex} />
          </MapContainer>
        </div>
      </div>
    );
  };
}

// ---------- Natif (WebView + Leaflet CDN) ----------
let NativeMap = null;
if (Platform.OS !== 'web') {
  const { WebView } = require('react-native-webview');

  function buildHtml(markers, polygons, focusedIndex, sensorMarkers = []) {
    const focused = (focusedIndex !== null && focusedIndex !== undefined && markers[focusedIndex])
      ? markers[focusedIndex]
      : markers[0];
    const center = focused
      ? `[${focused.lat}, ${focused.lng}], 15`
      : `[46.5, 2.5], 6`;
    const markersJs = markers
      .map(m => `L.marker([${m.lat}, ${m.lng}]).addTo(map).bindPopup(${JSON.stringify(m.label)});`)
      .join('\n');
    const fitBoundsJs = (markers.length > 1 && (focusedIndex === null || focusedIndex === undefined))
      ? `var group = new L.featureGroup([${markers.map(m => `L.marker([${m.lat},${m.lng}])`).join(',')}]); map.fitBounds(group.getBounds().pad(0.2));`
      : '';
    const polygonsJs = polygons
      .filter(p => p.geometry)
      .map(p => `try{L.geoJSON(${JSON.stringify(p.geometry)},{style:{color:'#2ecc71',weight:2.5,fillColor:'#2ecc71',fillOpacity:0.18}}).addTo(map);}catch(e){}`)
      .join('\n');
    const sensorMarkersJs = sensorMarkers
      .map(s => `L.marker([${s.lat},${s.lng}],{icon:L.divIcon({html:${JSON.stringify(`<div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:${s.color || '#3498db'};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.55);font-size:14px;">${s.icon || '◎'}</div>`)},className:'',iconSize:[26,26],iconAnchor:[13,13]})}).addTo(map).bindPopup(${JSON.stringify(s.label || '')});`)
      .join('\n');
    return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1.0"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><style>html,body{margin:0;padding:0;width:100%;height:100%;} #wrap,#map{width:100%;height:100%;}</style></head><body><div id="wrap"><div id="map"></div></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
  var map = L.map('map',{zoomControl:false}).setView(${center});
  L.tileLayer(${JSON.stringify(TILE_SATELLITE.url)},{attribution:${JSON.stringify(TILE_SATELLITE.attribution)}}).addTo(map);
  ${polygonsJs}
  ${markersJs}
  ${sensorMarkersJs}
  ${fitBoundsJs}
<\/script></body></html>`;
  }

  NativeMap = function TechFarmMapNative({ markers = [], polygons = [], sensorMarkers = [], focusedIndex = null, style }) {
    const html = buildHtml(markers, polygons, focusedIndex, sensorMarkers);
    return (
      <WebView
        style={[{ flex: 1 }, style]}
        source={{ html }}
        originWhitelist={['*']}
        javaScriptEnabled
      />
    );
  };
}

// ---------- Export ----------
export default function TechFarmMap({ markers = [], polygons = [], sensorMarkers = [], focusedIndex = null, style }) {
  if (Platform.OS === 'web' && LeafletMap) {
    return <LeafletMap markers={markers} polygons={polygons} sensorMarkers={sensorMarkers} focusedIndex={focusedIndex} style={style} />;
  }
  if (NativeMap) {
    return (
      <View style={[st.container, style]}>
        <NativeMap markers={markers} polygons={polygons} sensorMarkers={sensorMarkers} focusedIndex={focusedIndex} />
      </View>
    );
  }
  return <View style={[st.container, style]} />;
}

const st = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', borderRadius: 8 },
});
