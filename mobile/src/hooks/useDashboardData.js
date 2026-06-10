import { useEffect, useRef, useState, useCallback } from 'react';
import { farms, parcelles, kits, mesures, alertes, cameras, capteurs, cultures, users } from '../services/api';

// Valeurs par défaut affichées pendant le chargement ou en cas d'erreur
const DEFAULTS = {
  farmName:    '—',
  farmsList:   [],   // toutes les fermes de l'entreprise
  parcellesList: [],
  systems:     [
    { id: 'temp',     icon: '🌡️', value: '—', unit: '°C',   arrow: '—', aC: '#e67e22', bg: '#2a1500', bc: '#e67e22' },
    { id: 'humidity', icon: '💧',  value: '—', unit: '% HR', arrow: '—', aC: '#3498db', bg: '#001529', bc: '#3498db' },
    { id: 'soil',     icon: '🌱',  value: '—', unit: '% HR', arrow: '—', aC: '#27ae60', bg: '#0a2010', bc: '#27ae60' },
  ],
  alertes:     [],
  activities:  [],
  nbCapteurs:  0,
  cropHealth:  null,
  cameras:     [],
  sensors:     [],
  parcelleStatus: [],
  tempCurve:   [],
  humidCurve:  [],
  soilCurve:   [],
  chartLabels: [],
  wind:        '—',
};

// Moyenne de la dernière mesure de chaque capteur d'un type donné (sur la ferme).
function latestAvgByType(rawMesures, type) {
  const latest = {};
  for (const m of rawMesures) {
    if (m.type !== type) continue;
    const cur = latest[m.capteur_id];
    if (!cur || new Date(m.time) > new Date(cur.time)) latest[m.capteur_id] = m;
  }
  const vals = Object.values(latest).map((m) => parseFloat(m.valeur));
  return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
}

// Score 0→1 : 1 dans la plage [lo,hi], décroissant au-delà sur une tolérance `tol`.
function bandScore(value, lo, hi, tol) {
  if (value == null) return null;
  if (value >= lo && value <= hi) return 1;
  const d = value < lo ? lo - value : value - hi;
  return Math.max(0, 1 - d / tol);
}

// Statut d'une métrique vs la plage optimale de la culture.
function metricStatus(value, min, max) {
  if (value == null || min == null || max == null) return 'na';
  if (value < min) return 'low';   // insuffisant
  if (value > max) return 'high';  // excès
  return 'ok';                     // optimal
}

/**
 * Évalue CHAQUE parcelle selon les besoins de SA culture (humidité sol/air, temp).
 * Un même % peut être « optimal » pour une plante et « excès » pour une autre.
 * Retourne le détail par parcelle + un score santé global (moyenne des parcelles).
 */
function evaluateCultures(parcellesList, rawByParcelle, cultureByNom) {
  // Score pondéré par la distance au centre de la plage : ~1 au centre,
  // ~0.82 au bord, chute au-delà → en vert on obtient ~90-98 % (pas 100 % pile).
  const score = (v, mn, mx) => {
    if (v == null || mn == null) return null;
    const mid  = (mn + mx) / 2;
    const half = Math.max(1, (mx - mn) / 2);
    const dist = Math.abs(v - mid) / half;            // 0 au centre, 1 au bord
    return Math.max(0, Math.min(1, 1 - dist * 0.18 - Math.max(0, dist - 1) * 0.6));
  };
  const round = (v) => v == null ? null : Math.round(v * 10) / 10;

  const parcelleStatus = [];
  const allScores = [];

  for (const p of parcellesList) {
    const culture = cultureByNom[p.culture_type] || null;
    const pRaw   = rawByParcelle[p.id] || [];
    const soil   = latestAvgByType(pRaw, 'humidite_sol');
    const temp   = latestAvgByType(pRaw, 'temperature');
    const humAir = latestAvgByType(pRaw, 'humidite_air');

    const metrics = {
      soil:   { value: round(soil),   min: culture?.soil_min,    max: culture?.soil_max,    status: metricStatus(soil,   culture?.soil_min,    culture?.soil_max) },
      temp:   { value: round(temp),   min: culture?.temp_min,    max: culture?.temp_max,    status: metricStatus(temp,   culture?.temp_min,    culture?.temp_max) },
      humAir: { value: round(humAir), min: culture?.hum_air_min, max: culture?.hum_air_max, status: metricStatus(humAir, culture?.hum_air_min, culture?.hum_air_max) },
    };

    let pScore = null;
    if (culture) {
      const sc = [
        score(soil,   culture.soil_min,    culture.soil_max),
        score(temp,   culture.temp_min,    culture.temp_max),
        score(humAir, culture.hum_air_min, culture.hum_air_max),
      ].filter((s) => s != null);
      if (sc.length) {
        pScore = Math.round((sc.reduce((a, b) => a + b, 0) / sc.length) * 100);
        allScores.push(pScore);
      }
    }

    const statuses = [metrics.soil.status, metrics.temp.status, metrics.humAir.status];
    const overall = statuses.includes('high') || statuses.includes('low')
      ? 'warn'
      : statuses.every((s) => s === 'ok') ? 'ok' : 'na';

    parcelleStatus.push({
      id:           p.id,
      nom:          p.nom,
      culture:      culture?.nom ?? (p.culture_type || '—'),
      icon:         culture?.icon ?? '🌱',
      besoinEau:    culture?.besoin_eau ?? null,
      besoinSoleil: culture?.besoin_soleil ?? null,
      metrics,
      score:        pScore,
      overall,
    });
  }

  const cropHealth = allScores.length
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : null;
  return { parcelleStatus, cropHealth };
}

function buildCurves(graphData) {
  // graphData = lignes "graph" combinées de TOUS les kits de la ferme.
  // On agrège les kits entre eux : moyenne des "moyenne" par (bucket, type),
  // pour des valeurs réelles en °C / % directement traçables.
  const agg = {};
  for (const r of graphData) {
    const key = `${r.bucket}|${r.type}`;
    if (!agg[key]) agg[key] = { sum: 0, count: 0, bucket: r.bucket, type: r.type };
    agg[key].sum += parseFloat(r.moyenne);
    agg[key].count += 1;
  }

  const byType = {};
  for (const v of Object.values(agg)) {
    if (!byType[v.type]) byType[v.type] = [];
    byType[v.type].push({ bucket: v.bucket, val: v.sum / v.count });
  }
  for (const tp of Object.keys(byType)) {
    byType[tp].sort((a, b) => new Date(a.bucket) - new Date(b.bucket));
  }

  const values = (tp) => (byType[tp] ?? []).map((x) => parseFloat(x.val.toFixed(1)));
  const labels = (byType.temperature ?? byType.humidite_air ?? byType.humidite_sol ?? [])
    .map((x) => {
      const d = new Date(x.bucket);
      return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    });

  return {
    tempCurve:   values('temperature'),
    humidCurve:  values('humidite_air'),
    soilCurve:   values('humidite_sol'),
    chartLabels: labels,
  };
}

function buildSystems(rawMesures) {
  // 1) dernière mesure de CHAQUE capteur ; 2) moyenne par type sur tous les
  //    capteurs de la ferme (et non la lecture d'un seul capteur).
  const latestPerCapteur = {};
  for (const m of rawMesures) {
    const cur = latestPerCapteur[m.capteur_id];
    if (!cur || new Date(m.time) > new Date(cur.time)) latestPerCapteur[m.capteur_id] = m;
  }

  const byType = {};
  for (const m of Object.values(latestPerCapteur)) {
    if (!byType[m.type]) byType[m.type] = [];
    byType[m.type].push(parseFloat(m.valeur));
  }

  const avg = (tp) => {
    const arr = byType[tp];
    return arr && arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
  };
  const fmt = (v) => v != null ? v.toFixed(1) : '—';

  return [
    {
      id: 'temp',
      icon: '🌡️',
      value: fmt(avg('temperature')),
      unit:  '°C',
      arrow: '—',
      aC: '#e67e22', bg: '#2a1500', bc: '#e67e22',
    },
    {
      id: 'humidity',
      icon: '💧',
      value: fmt(avg('humidite_air')),
      unit:  '% HR',
      arrow: '—',
      aC: '#3498db', bg: '#001529', bc: '#3498db',
    },
    {
      id: 'soil',
      icon: '🌱',
      value: fmt(avg('humidite_sol')),
      unit:  '% HR',
      arrow: '—',
      aC: '#27ae60', bg: '#0a2010', bc: '#27ae60',
    },
  ];
}

function buildAlertesCards(docs) {
  const COLOR = { critical: '#e74c3c', warning: '#f39c12', info: '#2ecc71' };
  const ICON  = { seuil_depasse: '⚠️', anomalie: '🔬', maladie: '🌿' };
  const SEV   = { critical: 'Critique', warning: 'Moyenne', info: 'Info' };
  const TYPE  = { seuil_depasse: 'Seuil dépassé', anomalie: 'Anomalie', maladie: 'Maladie' };
  return docs.map((a) => ({
    id:    String(a._id),
    color: COLOR[a.severite] ?? '#aaa',
    icon:  ICON[a.type]      ?? '⚠️',
    title: a.message,
    sub:   new Date(a.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }),
    // — détails (affichés au clic / dans le tableau) —
    severite:      a.severite ?? null,
    severiteLabel: SEV[a.severite] ?? a.severite ?? '—',
    typeKey:       a.type ?? null,
    typeLabel:     TYPE[a.type] ?? a.type ?? '—',
    message:       a.message ?? '—',
    ferme:         a.ferme_nom ?? '—',
    parcelle:      a.parcelle_nom ?? '—',
    capteurType:   a.capteur_type ?? null,
    lu:            !!a.lu,
    dateFull:      new Date(a.created_at).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }),
  }));
}

export default function useDashboardData() {
  const [data,           setData]           = useState(DEFAULTS);
  const [loading,        setLoading]        = useState(true);
  const [selectedFarmId, setSelectedFarmId] = useState(null);
  const mountedRef = useRef(true);

  const load = useCallback(async (farmIdOverride) => {
    setLoading(true);
    try {
      // 1 — Profil user → company_id
      const me = await users.me();

      // 2 — Toutes les fermes de l'entreprise
      const farmsRes = await farms.list(me.company_id);
      const farmsList = farmsRes.farms ?? [];

      // 3 — Ferme sélectionnée (override, ou déjà mémorisée, ou première)
      const activeFarmId = farmIdOverride
        ?? (farmIdOverride === undefined ? selectedFarmId : null)
        ?? farmsList[0]?.id
        ?? null;
      const farm = farmsList.find((f) => f.id === activeFarmId) ?? farmsList[0];

      if (!mountedRef.current) return;
      setSelectedFarmId(farm?.id ?? null);

      // 4 — Toutes les parcelles de la ferme sélectionnée
      const parcellesRes = farm
        ? await parcelles.list(farm.id)
        : { parcelles: [] };
      const farmParcelles = parcellesRes.parcelles ?? [];
      const parcelleIdSet = new Set(farmParcelles.map((p) => p.id));

      // 5 — Tous les kits de la ferme (filtrés depuis les kits de l'entreprise)
      let farmKits = [];
      try {
        const allKitsRes = await kits.list();
        farmKits = (allKitsRes.kits ?? []).filter((k) => parcelleIdSet.has(k.parcelle_id));
      } catch { /* toast global */ }
      const nbCapteurs = farmKits.reduce((sum, k) => sum + (parseInt(k.nb_capteurs, 10) || 0), 0);

      // 6 — Fenêtres temporelles
      const now    = new Date();
      const nowISO = now.toISOString();
      const h3     = new Date(now - 3  * 60 * 60 * 1000).toISOString(); // dernières mesures
      const h24    = new Date(now - 24 * 60 * 60 * 1000).toISOString(); // graphe 24h

      // 7 — Mesures brutes + graphe pour CHAQUE kit de la ferme (en gardant la parcelle)
      const perKit = await Promise.all(farmKits.map(async (k) => {
        const [rawRes, graphRes] = await Promise.allSettled([
          mesures.list(k.id, { mode: 'raw',   from: h3,  to: nowISO }),
          mesures.list(k.id, { mode: 'graph', from: h24, to: nowISO, interval: '1 hour' }),
        ]);
        return {
          parcelleId: k.parcelle_id,
          raw:   rawRes.status   === 'fulfilled' ? (rawRes.value.data ?? [])   : [],
          graph: graphRes.status === 'fulfilled' ? (graphRes.value.data ?? []) : [],
        };
      }));

      const rawMesures = perKit.flatMap((x) => x.raw);
      const graphData  = perKit.flatMap((x) => x.graph);

      // Mesures brutes groupées par parcelle (pour le statut adapté à la culture)
      const rawByParcelle = {};
      for (const x of perKit) {
        if (!rawByParcelle[x.parcelleId]) rawByParcelle[x.parcelleId] = [];
        rawByParcelle[x.parcelleId].push(...x.raw);
      }

      // 8 — Alertes + caméras + capteurs + catalogue cultures
      const [alertesRes, camerasRes, capteursRes, culturesRes] = await Promise.allSettled([
        alertes.list({ limit: 100 }),
        farm ? cameras.list(farm.id)  : Promise.resolve({ cameras: [] }),
        farm ? capteurs.list(farm.id) : Promise.resolve({ capteurs: [] }),
        cultures.list(),
      ]);

      if (!mountedRef.current) return;

      const allAlertes  = alertesRes.status === 'fulfilled' ? (alertesRes.value.alertes ?? []) : [];
      const farmAlertes = allAlertes.filter((a) => parcelleIdSet.has(a.parcelle_id));

      // Caméras → forme attendue par l'UI
      const camerasDocs = camerasRes.status === 'fulfilled' ? (camerasRes.value.cameras ?? []) : [];
      const camerasList = camerasDocs.map((c) => ({
        id:       c.id,
        name:     c.nom,
        location: c.emplacement,
        src:      c.url,
        thumb:    c.thumbnail,
        icon:     c.icon ?? '🎥',
        status:   c.statut,
      }));

      // Capteurs géolocalisés → marqueurs carte
      const capteursDocs = capteursRes.status === 'fulfilled' ? (capteursRes.value.capteurs ?? []) : [];
      const sensors = capteursDocs
        .filter((c) => c.position_lat != null && c.position_lng != null)
        .map((c) => ({
          id:       c.id,
          type:     c.type,
          lat:      parseFloat(c.position_lat),
          lng:      parseFloat(c.position_lng),
          parcelle: c.parcelle_nom,
          actif:    c.actif,
        }));

      // Vent : moyenne des capteurs "vent" de la ferme (plus de météo externe)
      const windAvg = latestAvgByType(rawMesures, 'vent');

      // Cultures → statut par parcelle + santé adaptée à chaque culture
      const culturesList = culturesRes.status === 'fulfilled' ? (culturesRes.value.cultures ?? []) : [];
      const cultureByNom = {};
      for (const c of culturesList) cultureByNom[c.nom] = c;
      const { parcelleStatus, cropHealth } = evaluateCultures(farmParcelles, rawByParcelle, cultureByNom);

      const curves = buildCurves(graphData);
      const systemsCards = buildSystems(rawMesures);
      const alertesCards = buildAlertesCards(farmAlertes);

      setData({
        farmName:   farm?.nom ?? '—',
        farmsList,
        parcellesList: farmParcelles,
        systems:    systemsCards,
        alertes:    alertesCards,
        activities: alertesCards.slice(0, 3),
        nbCapteurs,
        cropHealth,
        cameras:    camerasList,
        sensors,
        parcelleStatus,
        ...curves,
        wind:       windAvg != null ? `${Math.round(windAvg)} km/h` : '—',
      });
    } catch {
      // Les erreurs API sont déjà gérées par le toast global
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [selectedFarmId]);

  useEffect(() => {
    mountedRef.current = true;
    load(undefined);
    return () => { mountedRef.current = false; };
  }, []);

  /** Changer de ferme depuis le dashboard */
  const selectFarm = useCallback((farmId) => {
    setSelectedFarmId(farmId);
    load(farmId);
  }, [load]);

  /** Marquer une alerte comme lue (MAJ optimiste + persistance) */
  const markAlertRead = useCallback((id) => {
    setData((d) => ({
      ...d,
      alertes:    d.alertes.map((a) => a.id === id ? { ...a, lu: true } : a),
      activities: d.activities.map((a) => a.id === id ? { ...a, lu: true } : a),
    }));
    alertes.markRead(id).catch(() => { /* toast global */ });
  }, []);

  return { data, loading, selectedFarmId, selectFarm, markAlertRead };
}
