import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { COLORS } from '../../../constants/theme';
import { t } from '../../../i18n';
import TechFarmMap from '../../../components/map/TechFarmMap';
import { approxPolygon } from '../../../utils/geo';
import { SENSOR_META, sensorMeta } from '../../../constants/dashboard';
import { verdictLabel } from '../../../utils/culture';
import { st } from '../styles';

export default function ParcelleMapView({ parcellesList = [], systems, sensors = [], parcelleStatus = [], selectedFarmId }) {
  const [focusedIdx, setFocusedIdx] = React.useState(0);
  const [hidden, setHidden] = React.useState({}); // types masqués

  // Réinitialise le filtre quand la ferme change
  React.useEffect(() => { setHidden({}); }, [selectedFarmId]);

  const presentTypes = [...new Set(sensors.map(s => s.type))];
  const allHidden = presentTypes.length > 0 && presentTypes.every(t => hidden[t]);
  const toggleType = (type) => setHidden(h => ({ ...h, [type]: !h[type] }));
  const setAll = (hide) => setHidden(presentTypes.reduce((acc, t) => { acc[t] = hide; return acc; }, {}));

  const sensorMarkers = sensors
    .filter(s => !hidden[s.type])
    .map(s => {
      const m = sensorMeta(s.type);
      return { id: s.id, lat: s.lat, lng: s.lng, icon: m.icon, color: m.color, label: `${m.label}${s.parcelle ? ' · ' + s.parcelle : ''}` };
    });

  // Réinitialise la parcelle focalisée quand la ferme change
  React.useEffect(() => { setFocusedIdx(0); }, [selectedFarmId]);

  // Libellé enrichi (culture + verdict eau) à partir du statut par parcelle
  const statusById = {};
  for (const s of parcelleStatus) statusById[s.id] = s;
  const labelFor = (p) => {
    const s = statusById[p.id];
    if (!s) return p.nom;
    const soil = s.metrics?.soil;
    const v = soil && soil.status !== 'na' ? ` · 💧 ${soil.value}% ${verdictLabel('soil', soil.status)}` : '';
    return `${p.nom} · ${s.icon} ${s.culture}${v}`;
  };

  const markers = parcellesList
    .filter(p => p.position_lat && p.position_lng)
    .map(p => ({
      id:    String(p.id),
      lat:   parseFloat(p.position_lat),
      lng:   parseFloat(p.position_lng),
      label: labelFor(p),
    }));

  // Délimitations GeoJSON des parcelles
  // Priorité : geometry réelle en BDD → fallback polygone approximatif calculé depuis lat/lng + superficie
  const polygons = parcellesList
    .filter(p => p.position_lat && p.position_lng)
    .map(p => {
      let geom = p.geometry;
      if (typeof geom === 'string') { try { geom = JSON.parse(geom); } catch { geom = null; } }

      // Conversion format Leaflet [{lat,lng}] → GeoJSON Polygon
      if (Array.isArray(geom) && geom.length >= 3 && geom[0]?.lat != null) {
        const ring = [...geom, geom[0]].map(pt => [pt.lng, pt.lat]);
        geom = { type: 'Polygon', coordinates: [ring] };
      }

      if (!geom || !geom.type || !geom.coordinates) {
        geom = approxPolygon(
          parseFloat(p.position_lat),
          parseFloat(p.position_lng),
          parseFloat(p.superficie_ha) || 5
        );
      }
      return { id: String(p.id), geometry: geom, label: labelFor(p) };
    });

  const hasMultiple = markers.length > 1;
  const clampedIdx  = markers.length > 0 ? Math.min(focusedIdx, markers.length - 1) : 0;
  const tempValue   = systems?.find(s => s.id === 'temp')?.value;

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      <TechFarmMap
        markers={markers}
        polygons={polygons}
        sensorMarkers={sensorMarkers}
        focusedIndex={markers.length > 0 ? clampedIdx : null}
      />

      {/* Filtre capteurs */}
      {presentTypes.length > 0 && (
        <View style={st.sensorFilterBar}>
          <TouchableOpacity style={[st.sensorChip, st.sensorChipAll]} onPress={() => setAll(!allHidden)}>
            <Text style={st.sensorChipAllTxt}>{allHidden ? 'Tout afficher' : 'Tout cacher'}</Text>
          </TouchableOpacity>
          {presentTypes.map(type => {
            const m = sensorMeta(type);
            const off = !!hidden[type];
            const count = sensors.filter(s => s.type === type).length;
            return (
              <TouchableOpacity key={type} style={[st.sensorChip, off && st.sensorChipOff]} onPress={() => toggleType(type)} activeOpacity={0.8}>
                <Text style={{ fontSize: 12 }}>{m.icon}</Text>
                <Text style={[st.sensorChipTxt, off && { color: COLORS.textSecondary, textDecorationLine: 'line-through' }]}>{m.label} ({count})</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Aucune coordonnée GPS */}
      {markers.length === 0 && (
        <View style={st.mapNoGps}>
          <Text style={st.mapNoGpsTxt}>📍 {t('map.noGps')}</Text>
        </View>
      )}

      {/* Badge température */}
      {tempValue && tempValue !== '—' && (
        <View style={st.tempBadge}>
          <Text style={st.tempTxt}>{tempValue} °C</Text>
        </View>
      )}

      {/* Navigation parcelles (si plusieurs) */}
      {hasMultiple && (
        <View style={st.parcelleNav}>
          <TouchableOpacity
            style={st.parcelleNavBtn}
            onPress={() => setFocusedIdx(i => (i - 1 + markers.length) % markers.length)}
          >
            <Text style={st.parcelleNavArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={st.parcelleNavLabel} numberOfLines={1}>
            {markers[clampedIdx]?.label ?? '—'}  ·  {clampedIdx + 1} / {markers.length}
          </Text>
          <TouchableOpacity
            style={st.parcelleNavBtn}
            onPress={() => setFocusedIdx(i => (i + 1) % markers.length)}
          >
            <Text style={st.parcelleNavArrow}>›</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
