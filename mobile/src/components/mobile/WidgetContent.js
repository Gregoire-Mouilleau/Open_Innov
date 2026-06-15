import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView } from 'react-native';
import { COLORS, WIDGET_IDS } from '../../constants/theme';
import { t } from '../../i18n';
import TechFarmMap from '../map/TechFarmMap';
import { approxPolygon } from '../../utils/geo';
import { sensorMeta } from '../../constants/dashboard';

// Valeur d'un capteur depuis `systems` du hook partagé
const sysVal = (data, id) => data?.systems?.find((s) => s.id === id)?.value;

// ─── Widgets "valeur capteur" ─────────────────────────────────
function ValueWidget({ icon, value, unit }) {
  return (
    <View style={styles.sensorContainer}>
      <Text style={styles.sensorIcon}>{icon}</Text>
      <Text style={styles.sensorValue}>{value != null && value !== '—' ? `${value}${unit}` : '—'}</Text>
    </View>
  );
}

function TemperatureWidget({ data }) { return <ValueWidget icon="🌡️" value={sysVal(data, 'temp')} unit=" °C" />; }
function HumidityWidget({ data })    { return <ValueWidget icon="💧"  value={sysVal(data, 'humidity')} unit=" %" />; }
function SoilWidget({ data })        { return <ValueWidget icon="🌱"  value={sysVal(data, 'soil')} unit=" %" />; }
function WindWidget({ data })        { return <ValueWidget icon="💨"  value={data?.wind ?? '—'} unit="" />; }

function LuminosityWidget({ data }) {
  return <ValueWidget icon="☀️" value={data?.luminosite != null ? Number(data.luminosite).toFixed(0) : null} unit=" Lux" />;
}

// ─── Santé des cultures ───────────────────────────────────────
function HealthWidget({ data }) {
  const v = data?.cropHealth;
  const color = v == null ? COLORS.textSecondary : v >= 75 ? '#2ecc71' : v >= 50 ? '#f39c12' : '#e74c3c';
  const label = v == null ? '—' : v >= 75 ? 'Bonne' : v >= 50 ? 'Moyenne' : 'Faible';
  return (
    <View style={styles.sensorContainer}>
      <Text style={styles.sensorIcon}>🌿</Text>
      <Text style={[styles.bigValue, { color }]}>{v != null ? `${v}%` : '—'}</Text>
      <Text style={styles.subLabel}>{label}</Text>
    </View>
  );
}

// ─── Alertes ──────────────────────────────────────────────────
function AlertsWidget({ data }) {
  const list = data?.alertes ?? [];
  return (
    <View style={styles.listContainer}>
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>⚠️ Alertes</Text>
        <View style={styles.countPill}><Text style={styles.countTxt}>{list.length}</Text></View>
      </View>
      {list.length === 0 ? (
        <Text style={styles.emptyTxt}>Aucune alerte</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {list.slice(0, 5).map((a) => (
            <View key={a.id} style={[styles.listRow, { borderLeftColor: a.color }]}>
              <Text style={styles.rowIcon}>{a.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{a.title}</Text>
                <Text style={styles.rowSub}>{a.sub}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Parcelles (cultures + statut) ────────────────────────────
function ParcellesWidget({ data }) {
  const list = data?.parcelleStatus ?? [];
  const dotColor = (o) => o === 'ok' ? '#2ecc71' : o === 'warn' ? '#f39c12' : COLORS.textSecondary;
  return (
    <View style={styles.listContainer}>
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>🌾 Parcelles</Text>
        <View style={styles.countPill}><Text style={styles.countTxt}>{list.length}</Text></View>
      </View>
      {list.length === 0 ? (
        <Text style={styles.emptyTxt}>Aucune parcelle</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {list.map((p) => (
            <View key={p.id} style={styles.listRow}>
              <Text style={styles.rowIcon}>{p.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{p.nom}</Text>
                <Text style={styles.rowSub}>{p.culture}{p.score != null ? ` · ${p.score}%` : ''}</Text>
              </View>
              <View style={[styles.statusDot, { backgroundColor: dotColor(p.overall) }]} />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Carte (réelle) ───────────────────────────────────────────
function buildMapProps(data) {
  const parcelles = data?.parcellesList ?? [];
  const markers = parcelles
    .filter((p) => p.position_lat && p.position_lng)
    .map((p) => ({ id: String(p.id), lat: parseFloat(p.position_lat), lng: parseFloat(p.position_lng), label: p.nom }));

  const polygons = parcelles
    .filter((p) => p.position_lat && p.position_lng)
    .map((p) => {
      let geom = p.geometry;
      if (typeof geom === 'string') { try { geom = JSON.parse(geom); } catch { geom = null; } }
      if (Array.isArray(geom) && geom.length >= 3 && geom[0]?.lat != null) {
        geom = { type: 'Polygon', coordinates: [[...geom, geom[0]].map((pt) => [pt.lng, pt.lat])] };
      }
      if (!geom || !geom.type || !geom.coordinates) {
        geom = approxPolygon(parseFloat(p.position_lat), parseFloat(p.position_lng), parseFloat(p.superficie_ha) || 5);
      }
      return { id: String(p.id), geometry: geom, label: p.nom };
    });

  const sensorMarkers = (data?.sensors ?? []).map((s) => {
    const m = sensorMeta(s.type);
    return { id: s.id, lat: s.lat, lng: s.lng, icon: m.icon, color: m.color, label: m.label };
  });

  return { markers, polygons, sensorMarkers };
}

function MapWidget({ data }) {
  const hasData = (data?.parcellesList ?? []).some((p) => p.position_lat && p.position_lng);
  if (!hasData) {
    // Aperçu (catalogue) ou pas de coordonnées → placeholder léger
    return (
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapIcon}>🗺️</Text>
      </View>
    );
  }
  const { markers, polygons, sensorMarkers } = buildMapProps(data);
  return (
    <View style={{ flex: 1, overflow: 'hidden', borderRadius: 8 }}>
      <TechFarmMap markers={markers} polygons={polygons} sensorMarkers={sensorMarkers} />
    </View>
  );
}

// ─── Caméra (réelle : miniature + LIVE) ───────────────────────
function CameraLiveWidget({ data }) {
  const cam = data?.cameras?.[0];
  return (
    <View style={styles.cameraContainer}>
      {cam?.thumb && (
        <Image source={{ uri: cam.thumb }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}
      <View style={styles.darkOverlay} />
      <View style={styles.liveBadge}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>{t('widgetContent.live')}</Text>
      </View>
      {!cam?.thumb && <Text style={styles.noSignal}>📷</Text>}
      {cam?.name && <Text style={styles.camName} numberOfLines={1}>{cam.icon} {cam.name}</Text>}
    </View>
  );
}

// ─── Placeholders existants ───────────────────────────────────
function CameraIAWidget() {
  return (
    <View style={styles.cameraContainer}>
      <View style={[styles.liveBadge, { backgroundColor: '#8e44ad' }]}>
        <Text style={styles.liveText}>IA</Text>
      </View>
      <Text style={styles.noSignal}>🤖</Text>
      <View style={styles.iaBorder} />
    </View>
  );
}

function DiseasesWidget() {
  return (
    <View style={[styles.cameraContainer, { backgroundColor: '#1e3a2f' }]}>
      <Text style={styles.noSignal}>🌿➕</Text>
      <View style={styles.alertBadge}>
        <Text style={styles.alertText}>{t('widgetContent.detected')}</Text>
      </View>
    </View>
  );
}

export function WidgetContent({ widgetId, data }) {
  switch (widgetId) {
    case WIDGET_IDS.CAMERA_LIVE: return <CameraLiveWidget data={data} />;
    case WIDGET_IDS.CAMERA_IA:   return <CameraIAWidget />;
    case WIDGET_IDS.MAP:         return <MapWidget data={data} />;
    case WIDGET_IDS.TEMPERATURE: return <TemperatureWidget data={data} />;
    case WIDGET_IDS.HUMIDITY:    return <HumidityWidget data={data} />;
    case WIDGET_IDS.SOIL:        return <SoilWidget data={data} />;
    case WIDGET_IDS.WIND:        return <WindWidget data={data} />;
    case WIDGET_IDS.HEALTH:      return <HealthWidget data={data} />;
    case WIDGET_IDS.ALERTS:      return <AlertsWidget data={data} />;
    case WIDGET_IDS.PARCELLES:   return <ParcellesWidget data={data} />;
    case WIDGET_IDS.LUMINOSITY:  return <LuminosityWidget data={data} />;
    case WIDGET_IDS.DISEASES:    return <DiseasesWidget />;
    default: return null;
  }
}

const styles = StyleSheet.create({
  cameraContainer: { flex: 1, backgroundColor: '#0a0a0a', borderRadius: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  liveBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: '#e74c3c', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', zIndex: 1 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff', marginRight: 3 },
  liveText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  camName: { position: 'absolute', bottom: 6, left: 6, right: 6, color: '#fff', fontSize: 10, fontWeight: '700' },
  noSignal: { fontSize: 36, opacity: 0.5 },
  iaBorder: { position: 'absolute', top: 20, left: 20, right: 20, bottom: 20, borderWidth: 2, borderColor: '#e74c3c', borderRadius: 4 },
  mapPlaceholder: { flex: 1, backgroundColor: '#1a3a1a', borderRadius: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  mapIcon: { fontSize: 48, opacity: 0.7 },
  sensorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 8 },
  sensorIcon: { fontSize: 30 },
  sensorValue: { color: COLORS.text, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  bigValue: { fontSize: 26, fontWeight: '800' },
  subLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
  listContainer: { flex: 1, padding: 8 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  listTitle: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  countPill: { backgroundColor: COLORS.accent, borderRadius: 9, minWidth: 18, paddingHorizontal: 5, paddingVertical: 1, alignItems: 'center' },
  countTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },
  emptyTxt: { color: COLORS.textSecondary, fontSize: 11, marginTop: 6 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 4, borderLeftWidth: 2, borderLeftColor: 'transparent', paddingLeft: 5 },
  rowIcon: { fontSize: 14 },
  rowTitle: { color: COLORS.text, fontSize: 11, fontWeight: '600' },
  rowSub: { color: COLORS.textSecondary, fontSize: 9 },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  alertBadge: { position: 'absolute', bottom: 6, backgroundColor: 'rgba(231,76,60,0.85)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  alertText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
});
