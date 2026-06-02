/**
 * TechFarmMap — composant carte universel
 * - Web     : react-leaflet
 * - Natif   : WebView avec Leaflet via CDN
 *
 * Props:
 *   markers     : [{ id, lat, lng, label, color? }]
 *   polygons    : [{ id, geometry (GeoJSON Geometry), label }]  — délimitations parcelles
 *   viewMode    : 'satellite' | 'street'   (default: 'satellite')
 *                  'street' = vue 3D perspective (type Google Earth incliné)
 *   focusedIndex: number | null            (index du marker à centrer)
 *   style       : ViewStyle optionnel
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

  function MapController({ markers, polygons, focusedIndex, viewMode }) {
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
        const opts = { padding: [30, 30], maxZoom: viewMode === 'street' ? 17 : 16 };
        if (isFirst) map.fitBounds(bounds, opts);
        else map.flyToBounds(bounds, { ...opts, duration: 0.9 });
      } else {
        // Inclure tous les polygones dans les bounds globaux
        let allCoords = markers.map(m => [m.lat, m.lng]);
        (polygons || []).forEach(p => {
          p?.geometry?.coordinates?.[0]?.forEach(([lng, lat]) => allCoords.push([lat, lng]));
        });
        const bounds = L.latLngBounds(allCoords);
        const maxZoom = viewMode === 'street' ? 16 : 15;
        if (isFirst) map.fitBounds(bounds, { padding: [40, 40], maxZoom });
        else map.flyToBounds(bounds, { padding: [40, 40], maxZoom, duration: 1 });
      }
    }, [focusedIndex, viewMode, markers.length]);
    return null;
  }

  LeafletMap = function TechFarmMapWeb({ markers = [], polygons = [], viewMode = 'satellite', focusedIndex = null, style }) {
    const center = markers.length > 0
      ? [markers[0].lat, markers[0].lng]
      : [46.5, 2.5];

    // Mode 'street' : vue 3D inclinée style Google Earth (même tuiles satellite + CSS perspective)
    const perspWrap = viewMode === 'street'
      ? {
          position: 'absolute',
          width: '160%', height: '160%',
          left: '-30%', top: '-30%',
          transformOrigin: 'center 80%',
          transform: 'perspective(700px) rotateX(42deg)',
          transition: 'transform 0.45s ease',
        }
      : { position: 'absolute', inset: '0', transition: 'transform 0.45s ease' };

    return (
      <div style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative', ...(style || {}) }}>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <div style={perspWrap}>
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
            <MapController markers={markers} polygons={polygons} focusedIndex={focusedIndex} viewMode={viewMode} />
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

  function buildHtml(markers, polygons, viewMode, focusedIndex) {
    const zoom = viewMode === 'street' ? 17 : 15;
    const focused = (focusedIndex !== null && focusedIndex !== undefined && markers[focusedIndex])
      ? markers[focusedIndex]
      : markers[0];
    const center = focused
      ? `[${focused.lat}, ${focused.lng}], ${zoom}`
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
    const perspStyle = viewMode === 'street'
      ? `#wrap{overflow:hidden;width:100%;height:100%;position:relative;}#map{position:absolute;width:160%;height:160%;left:-30%;top:-30%;transform-origin:center 80%;transform:perspective(700px) rotateX(42deg);}`
      : `#wrap,#map{width:100%;height:100%;}`;
    return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1.0"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><style>html,body{margin:0;padding:0;width:100%;height:100%;} ${perspStyle}</style></head><body><div id="wrap"><div id="map"></div></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
  var map = L.map('map',{zoomControl:false}).setView(${center});
  L.tileLayer(${JSON.stringify(TILE_SATELLITE.url)},{attribution:${JSON.stringify(TILE_SATELLITE.attribution)}}).addTo(map);
  ${polygonsJs}
  ${markersJs}
  ${fitBoundsJs}
<\/script></body></html>`;
  }

  NativeMap = function TechFarmMapNative({ markers = [], polygons = [], viewMode = 'satellite', focusedIndex = null, style }) {
    const html = buildHtml(markers, polygons, viewMode, focusedIndex);
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
export default function TechFarmMap({ markers = [], polygons = [], viewMode = 'satellite', focusedIndex = null, style }) {
  if (Platform.OS === 'web' && LeafletMap) {
    return <LeafletMap markers={markers} polygons={polygons} viewMode={viewMode} focusedIndex={focusedIndex} style={style} />;
  }
  if (NativeMap) {
    return (
      <View style={[st.container, style]}>
        <NativeMap markers={markers} polygons={polygons} viewMode={viewMode} focusedIndex={focusedIndex} />
      </View>
    );
  }
  return <View style={[st.container, style]} />;
}

const st = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', borderRadius: 8 },
});
