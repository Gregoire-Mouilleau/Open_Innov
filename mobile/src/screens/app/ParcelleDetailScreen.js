import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Dimensions,
} from 'react-native';
import { COLORS } from '../../constants/theme';
import { kits, mesures, alertes } from '../../services/api';
import TechFarmMap from '../../components/map/TechFarmMap';

const { width: SW } = Dimensions.get('window');
const CHART_H = 80;

// ── Mini sparkline SVG-like dessiné via View + positions absolues ──────────────
function Sparkline({ data = [], color = COLORS.accent }) {
  if (!data || data.length < 2) return null;
  const max   = Math.max(...data) || 1;
  const w     = SW - 64;
  const step  = w / (data.length - 1);
  return (
    <View style={{ height: CHART_H, width: w, position: 'relative' }}>
      {data.map((v, i) => {
        const x = i * step;
        const y = CHART_H - (v / max) * (CHART_H - 8) - 4;
        return (
          <View key={i} style={{
            position: 'absolute', left: x - 3, top: y - 3,
            width: 6, height: 6, borderRadius: 3, backgroundColor: color, opacity: 0.9,
          }} />
        );
      })}
    </View>
  );
}

function SensorCard({ icon, label, value, unit, color }) {
  return (
    <View style={[st.sensorCard, { borderColor: color + '55' }]}>
      <Text style={st.sensorIcon}>{icon}</Text>
      <Text style={[st.sensorValue, { color }]}>{value ?? '—'}</Text>
      <Text style={st.sensorUnit}>{unit}</Text>
      <Text style={st.sensorLabel}>{label}</Text>
    </View>
  );
}

function AlerteRow({ item }) {
  const SEV_COLORS = { critical: '#e74c3c', warning: '#e67e22', info: '#3498db' };
  const color = SEV_COLORS[item.severite] ?? COLORS.textSecondary;
  return (
    <View style={st.alerteRow}>
      <View style={[st.alerteDot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={st.alerteMsg} numberOfLines={2}>{item.message}</Text>
        <Text style={st.alerteTime}>{new Date(item.created_at).toLocaleString('fr-FR')}</Text>
      </View>
      <View style={[st.alerteBadge, { backgroundColor: color + '22', borderColor: color }]}>
        <Text style={[st.alerteBadgeTxt, { color }]}>{item.severite}</Text>
      </View>
    </View>
  );
}

function buildSensors(rawData) {
  const latest = {};
  for (const m of rawData) {
    if (!latest[m.type] || new Date(m.time) > new Date(latest[m.type].time)) {
      latest[m.type] = m;
    }
  }
  return [
    { id: 'temperature',  icon: '🌡️', label: 'Température',   unit: '°C',  color: '#e67e22', value: latest.temperature?.valeur  != null ? Number(latest.temperature.valeur).toFixed(1)  : null },
    { id: 'humidite_air', icon: '💧',  label: 'Humidité air',  unit: '% HR', color: '#3498db', value: latest.humidite_air?.valeur != null ? Number(latest.humidite_air.valeur).toFixed(1) : null },
    { id: 'humidite_sol', icon: '🌱',  label: 'Humidité sol',  unit: '% HR', color: '#27ae60', value: latest.humidite_sol?.valeur != null ? Number(latest.humidite_sol.valeur).toFixed(1) : null },
  ];
}

function buildCurves(graphData) {
  const byType = {};
  for (const row of graphData) {
    if (!byType[row.type]) byType[row.type] = [];
    byType[row.type].push(parseFloat(row.moyenne));
  }
  const norm = arr => { const max = Math.max(...arr) || 1; return arr.map(v => v / max); };
  return {
    temperature:  norm(byType.temperature  ?? []),
    humidite_air: norm(byType.humidite_air ?? []),
    humidite_sol: norm(byType.humidite_sol ?? []),
  };
}

export default function ParcelleDetailScreen({ route, navigation }) {
  const { parcelle } = route.params;

  const [loading,   setLoading]   = useState(true);
  const [sensors,   setSensors]   = useState([]);
  const [curves,    setCurves]    = useState({});
  const [alerteList,setAlertList] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Kits de la parcelle
      const kitsData  = await kits.list(parcelle.id);
      const allKits   = kitsData?.kits ?? kitsData ?? [];
      if (allKits.length === 0) { setLoading(false); return; }

      const kitId = allKits[0].id;

      const [rawRes, graphRes, alertesRes] = await Promise.allSettled([
        mesures.list(kitId, { mode: 'raw',   from: new Date(Date.now() - 3600_000).toISOString() }),
        mesures.list(kitId, { mode: 'graph', from: new Date(Date.now() - 24 * 3600_000).toISOString(), interval: '1 hour' }),
        alertes.list({ limit: 10, parcelle_id: parcelle.id }),
      ]);

      const rawData   = rawRes.status   === 'fulfilled' ? (rawRes.value?.mesures   ?? rawRes.value   ?? []) : [];
      const graphData = graphRes.status === 'fulfilled' ? (graphRes.value?.mesures ?? graphRes.value ?? []) : [];
      const alertDocs = alertesRes.status === 'fulfilled' ? (alertesRes.value?.alertes ?? alertesRes.value ?? []) : [];

      setSensors(buildSensors(rawData));
      setCurves(buildCurves(graphData));
      setAlertList(alertDocs);
    } catch {
      // toast global
    } finally {
      setLoading(false);
    }
  }, [parcelle.id]);

  useEffect(() => { load(); }, [load]);

  const hasCoords = parcelle.position_lat != null && parcelle.position_lng != null;
  const markers   = hasCoords ? [{ id: parcelle.id, lat: parcelle.position_lat, lng: parcelle.position_lng, label: parcelle.nom }] : [];

  return (
    <View style={st.root}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={() => navigation.goBack()}>
          <Text style={st.backTxt}>‹ Retour</Text>
        </TouchableOpacity>
        <View>
          <Text style={st.title}>{parcelle.nom}</Text>
          <Text style={st.sub}>{parcelle.farm_nom ?? '—'}{parcelle.culture_type ? ` · ${parcelle.culture_type}` : ''}</Text>
        </View>
      </View>

      {loading ? (
        <View style={st.center}><ActivityIndicator color={COLORS.accent} size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={st.scroll}>

          {/* Map */}
          {hasCoords ? (
            <View style={st.mapContainer}>
              <TechFarmMap markers={markers} />
            </View>
          ) : (
            <View style={st.mapPlaceholder}>
              <Text style={st.mapPlaceholderTxt}>📍 Coordonnées GPS non définies</Text>
            </View>
          )}

          {/* Sensors */}
          <Text style={st.sectionTitle}>Capteurs (dernière heure)</Text>
          <View style={st.sensorsRow}>
            {sensors.map(s => <SensorCard key={s.id} {...s} />)}
          </View>

          {/* Courbes */}
          {(curves.temperature?.length > 1) && (
            <>
              <Text style={st.sectionTitle}>Évolution 24h</Text>
              <View style={st.chartCard}>
                <Text style={st.chartLabel}>🌡️ Température</Text>
                <Sparkline data={curves.temperature}  color="#e67e22" />
              </View>
              <View style={st.chartCard}>
                <Text style={st.chartLabel}>💧 Humidité air</Text>
                <Sparkline data={curves.humidite_air} color="#3498db" />
              </View>
              <View style={st.chartCard}>
                <Text style={st.chartLabel}>🌱 Humidité sol</Text>
                <Sparkline data={curves.humidite_sol} color="#27ae60" />
              </View>
            </>
          )}

          {/* Alertes */}
          <Text style={st.sectionTitle}>Alertes récentes</Text>
          {alerteList.length === 0 ? (
            <View style={st.noAlertes}><Text style={st.noAlertesTxt}>✓ Aucune alerte</Text></View>
          ) : (
            alerteList.map((a, i) => <AlerteRow key={i} item={a} />)
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16 },

  header:  { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, padding: 16, paddingTop: 44 },
  backBtn: { marginBottom: 8 },
  backTxt: { color: COLORS.accent, fontSize: 14, fontWeight: '600' },
  title:   { color: COLORS.text, fontSize: 22, fontWeight: '700' },
  sub:     { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },

  mapContainer:     { height: 220, borderRadius: 12, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  mapPlaceholder:   { height: 80, borderRadius: 12, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
  mapPlaceholderTxt:{ color: COLORS.textSecondary, fontSize: 13 },

  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 12, marginTop: 8 },

  sensorsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  sensorCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, padding: 12, alignItems: 'center' },
  sensorIcon: { fontSize: 22, marginBottom: 4 },
  sensorValue:{ fontSize: 20, fontWeight: '700' },
  sensorUnit: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  sensorLabel:{ color: COLORS.textSecondary, fontSize: 11, marginTop: 4 },

  chartCard:  { backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginBottom: 10 },
  chartLabel: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 10 },

  alerteRow:     { backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  alerteDot:     { width: 8, height: 8, borderRadius: 4 },
  alerteMsg:     { color: COLORS.text, fontSize: 13 },
  alerteTime:    { color: COLORS.textSecondary, fontSize: 11, marginTop: 3 },
  alerteBadge:   { borderRadius: 4, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3 },
  alerteBadgeTxt:{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  noAlertes:    { backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, padding: 20, alignItems: 'center' },
  noAlertesTxt: { color: COLORS.accent, fontSize: 14 },
});
