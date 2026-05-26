import { useEffect, useRef, useState } from 'react';
import { farms, parcelles, kits, mesures, alertes, meteo } from '../services/api';

// Valeurs par défaut affichées pendant le chargement ou en cas d'erreur
const DEFAULTS = {
  farmName:    '—',
  systems:     [
    { id: 'temp',     icon: '🌡️', value: '—', unit: '°C',   arrow: '—', aC: '#e67e22', bg: '#2a1500', bc: '#e67e22' },
    { id: 'humidity', icon: '💧',  value: '—', unit: '% HR', arrow: '—', aC: '#3498db', bg: '#001529', bc: '#3498db' },
    { id: 'soil',     icon: '🌱',  value: '—', unit: '% HR', arrow: '—', aC: '#27ae60', bg: '#0a2010', bc: '#27ae60' },
  ],
  alertes:     [],
  activities:  [],
  tempCurve:   [],
  humidCurve:  [],
  soilCurve:   [],
  chartLabels: [],
  meteo:       null,
};

function buildCurves(graphData) {
  const byType = {};
  for (const row of graphData) {
    if (!byType[row.type]) byType[row.type] = [];
    byType[row.type].push(row);
  }

  const normalize = (arr, key = 'moyenne') => {
    const vals = arr.map((r) => parseFloat(r[key]));
    const max = Math.max(...vals) || 1;
    return vals.map((v) => parseFloat((v / max).toFixed(3)));
  };

  const labels = (byType.temperature ?? byType.humidite_air ?? byType.humidite_sol ?? [])
    .map((r) => {
      const d = new Date(r.bucket);
      return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    });

  return {
    tempCurve:   normalize(byType.temperature   ?? []),
    humidCurve:  normalize(byType.humidite_air  ?? []),
    soilCurve:   normalize(byType.humidite_sol  ?? []),
    chartLabels: labels,
  };
}

function buildSystems(rawMesures) {
  const latest = {};
  for (const m of rawMesures) {
    if (!latest[m.type] || new Date(m.time) > new Date(latest[m.type].time)) {
      latest[m.type] = m;
    }
  }

  const fmt = (v) => v != null ? String(parseFloat(v).toFixed(1)) : '—';

  return [
    {
      id: 'temp',
      icon: '🌡️',
      value: fmt(latest.temperature?.valeur),
      unit:  '°C',
      arrow: '—',
      aC: '#e67e22', bg: '#2a1500', bc: '#e67e22',
    },
    {
      id: 'humidity',
      icon: '💧',
      value: fmt(latest.humidite_air?.valeur),
      unit:  '% HR',
      arrow: '—',
      aC: '#3498db', bg: '#001529', bc: '#3498db',
    },
    {
      id: 'soil',
      icon: '🌱',
      value: fmt(latest.humidite_sol?.valeur),
      unit:  '% HR',
      arrow: '—',
      aC: '#27ae60', bg: '#0a2010', bc: '#27ae60',
    },
  ];
}

function buildAlertesCards(docs) {
  const COLOR = { critical: '#e74c3c', warning: '#f39c12', info: '#2ecc71' };
  const ICON  = { seuil_depasse: '⚠️', anomalie: '🔬', maladie: '🌿' };
  return docs.map((a) => ({
    id:    String(a._id),
    color: COLOR[a.severite] ?? '#aaa',
    icon:  ICON[a.type]      ?? '⚠️',
    title: a.message,
    sub:   new Date(a.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }),
  }));
}

export default function useDashboardData() {
  const [data,    setData]    = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    async function load() {
      setLoading(true);
      try {
        // 1 — Ferme
        const farmsRes = await farms.list();
        const farm = farmsRes.farms?.[0];

        // 2 — Première parcelle (pour coordonnées météo)
        const parcellesRes = farm
          ? await parcelles.list(farm.id)
          : { parcelles: [] };
        const parcelle = parcellesRes.parcelles?.[0];

        // 3 — Premier kit actif
        const kitsRes = parcelle
          ? await kits.list(parcelle.id)
          : { kits: [] };
        const kit = kitsRes.kits?.[0];

        // 4 — Mesures brutes (dernière heure) + graphe (12h, 1h interval)
        const now  = new Date();
        const h1   = new Date(now - 1  * 60 * 60 * 1000).toISOString();
        const h12  = new Date(now - 12 * 60 * 60 * 1000).toISOString();

        const [rawRes, graphRes, alertesRes, meteoRes] = await Promise.allSettled([
          kit ? mesures.list(kit.id, { mode: 'raw',   from: h1,  to: now.toISOString() })       : Promise.resolve({ mesures: [] }),
          kit ? mesures.list(kit.id, { mode: 'graph', from: h12, to: now.toISOString(), interval: '1 hour' }) : Promise.resolve({ graph: [] }),
          alertes.list({ limit: 5, severite: 'warning,critical' }),
          (parcelle?.position_lat && parcelle?.position_lng)
            ? meteo.get(parcelle.position_lat, parcelle.position_lng)
            : Promise.resolve(null),
        ]);

        if (!mountedRef.current) return;

        const rawMesures  = rawRes.status   === 'fulfilled' ? (rawRes.value.mesures   ?? []) : [];
        const graphData   = graphRes.status === 'fulfilled' ? (graphRes.value.graph   ?? []) : [];
        const alertesDocs = alertesRes.status === 'fulfilled' ? (alertesRes.value.alertes ?? []) : [];
        const meteoData   = meteoRes.status  === 'fulfilled' ? meteoRes.value : null;

        const curves        = buildCurves(graphData);
        const systemsCards  = buildSystems(rawMesures);
        const alertesCards  = buildAlertesCards(alertesDocs);

        setData({
          farmName:    farm?.nom ?? '—',
          systems:     systemsCards,
          alertes:     alertesCards,
          activities:  buildAlertesCards(alertesDocs.slice(0, 3)), // réutilise les alertes récentes
          ...curves,
          meteo:       meteoData,
        });
      } catch {
        // Les erreurs API sont déjà gérées par le toast global
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }

    load();
    return () => { mountedRef.current = false; };
  }, []);

  return { data, loading };
}
