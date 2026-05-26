/**
 * TechFarmMap — composant carte universel
 * - Web     : react-leaflet
 * - Natif   : WebView avec Leaflet via CDN
 *
 * Props:
 *   markers : [{ id, lat, lng, label, color? }]
 *   style   : ViewStyle optionnel
 */
import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';

// ---------- Web ----------
let LeafletMap = null;
if (Platform.OS === 'web') {
  const { MapContainer, TileLayer, Marker, Popup, useMap } = require('react-leaflet');
  const L = require('leaflet');

  // Fix icônes Leaflet cassées avec webpack
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });

  function FitBounds({ markers }) {
    const map = useMap();
    React.useEffect(() => {
      if (markers.length === 0) return;
      const bounds = markers.map(m => [m.lat, m.lng]);
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
    }, [markers.length]);
    return null;
  }

  LeafletMap = function TechFarmMapWeb({ markers = [], style }) {
    const center = markers.length > 0
      ? [markers[0].lat, markers[0].lng]
      : [46.5, 2.5]; // centre France

    return (
      <div style={{ width: '100%', height: '100%', ...(style || {}) }}>
        {/* inject leaflet CSS */}
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <MapContainer center={center} zoom={6} style={{ width: '100%', height: '100%', minHeight: 260 }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {markers.map(m => (
            <Marker key={m.id} position={[m.lat, m.lng]}>
              <Popup><strong>{m.label}</strong></Popup>
            </Marker>
          ))}
          {markers.length > 0 && <FitBounds markers={markers} />}
        </MapContainer>
      </div>
    );
  };
}

// ---------- Natif (WebView + Leaflet CDN) ----------
let NativeMap = null;
if (Platform.OS !== 'web') {
  const { WebView } = require('react-native-webview');

  function buildHtml(markers) {
    const markersJs = markers
      .map(m => `L.marker([${m.lat}, ${m.lng}]).addTo(map).bindPopup(${JSON.stringify(m.label)});`)
      .join('\n');

    const center = markers.length > 0
      ? `[${markers[0].lat}, ${markers[0].lng}], 11`
      : `[46.5, 2.5], 6`;

    return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{margin:0;padding:0;width:100%;height:100%;}</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map').setView(${center});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    attribution:'© OpenStreetMap'
  }).addTo(map);
  ${markersJs}
  ${markers.length > 1 ? `var group = new L.featureGroup([${markers.map(m => `L.marker([${m.lat},${m.lng}])`).join(',')}]); map.fitBounds(group.getBounds().pad(0.2));` : ''}
</script>
</body></html>`;
  }

  NativeMap = function TechFarmMapNative({ markers = [], style }) {
    const html = buildHtml(markers);
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
export default function TechFarmMap({ markers = [], style }) {
  if (Platform.OS === 'web' && LeafletMap) {
    return <LeafletMap markers={markers} style={style} />;
  }
  if (NativeMap) {
    return (
      <View style={[st.container, style]}>
        <NativeMap markers={markers} />
      </View>
    );
  }
  return <View style={[st.container, style]} />;
}

const st = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', borderRadius: 8 },
});
