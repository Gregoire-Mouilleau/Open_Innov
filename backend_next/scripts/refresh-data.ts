/**
 * refresh-data.ts — Rafraîchit les données de démonstration SANS rien détruire.
 *
 * Contrairement à `seed.ts` (qui TRUNCATE toutes les tables, users compris),
 * ce script est NON destructeur et ré-exécutable « à chaque fois » :
 *   1. garantit que chaque parcelle possède ≥ 1 kit + les capteurs cœur
 *      (température, humidité air, humidité sol) ;
 *   2. régénère une fenêtre glissante de mesures fraîches (2 jours, 1 pt / 15 min)
 *      ancrée sur « maintenant », pour que le dashboard (fenêtres 24h) ait toujours
 *      des données récentes.
 *
 * Usage : npm run db:refresh
 */
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pg = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── Config capteurs ──────────────────────────────────────────────────────────

type CapteurType =
  | 'temperature' | 'humidite_air' | 'humidite_sol' | 'vent'
  | 'luminosite' | 'ph' | 'qualite_air' | 'debit_eau';

const CAPTEUR_CONFIG: Record<CapteurType, { unite: string; min: number; max: number }> = {
  temperature:  { unite: '°C',     min: 0,   max: 45 },   // bornes physiques (la culture recentre)
  humidite_air: { unite: '%',      min: 15,  max: 98 },
  humidite_sol: { unite: '%',      min: 8,   max: 95 },
  vent:         { unite: 'km/h',   min: 0,   max: 40 },
  luminosite:   { unite: 'lux',    min: 0,   max: 100000 },
  ph:           { unite: 'pH',     min: 5.5, max: 8.5 },
  qualite_air:  { unite: 'indice', min: 1,   max: 10 },
  debit_eau:    { unite: 'L/min',  min: 0,   max: 50 },
};

// Capteurs garantis sur chaque kit (alimentent les indicateurs du dashboard).
const CORE_TYPES: CapteurType[] = ['temperature', 'humidite_air', 'humidite_sol', 'vent'];

const WINDOW_DAYS  = 2;
const INTERVAL_MS  = 15 * 60 * 1000;
const BATCH        = 500;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/**
 * Valeur réaliste avec cycle journalier (jour/nuit) + bruit, selon le type.
 * `offset` est un décalage propre à chaque capteur (stable) pour que des
 * capteurs/fermes différents affichent des valeurs distinctes.
 */
function valueAt(type: CapteurType, ts: number, offset = 0, phaseH = 0): number {
  const cfg = CAPTEUR_CONFIG[type];
  const d   = new Date(ts);
  const h   = d.getHours() + d.getMinutes() / 60;
  const mid = (cfg.min + cfg.max) / 2;
  const amp = (cfg.max - cfg.min) * 0.25;
  // sin((h-9-phase)·π/12) → pic ~15h décalé du déphasage propre à la ferme
  const wave  = Math.sin((h - 9 - phaseH) * Math.PI / 12);
  const noise = (Math.random() - 0.5) * (cfg.max - cfg.min) * 0.05;

  let base: number;
  if (type === 'temperature')        base = mid + amp * wave;           // chaud l'après-midi
  else if (type === 'humidite_air')  base = mid - amp * wave;           // humide la nuit
  else if (type === 'humidite_sol')  base = mid - amp * 0.4 * wave;     // varie peu
  else                                base = mid + amp * 0.3 * wave;     // autres : léger cycle

  return Math.round(clamp(base + offset + noise, cfg.min, cfg.max) * 100) / 100;
}

/** Décalage stable par capteur (±6 % de la plage) — variété intra-ferme. */
function capteurOffset(type: CapteurType, id: number): number {
  const cfg = CAPTEUR_CONFIG[type];
  return (((id % 9) - 4) / 4) * (cfg.max - cfg.min) * 0.06;
}

/**
 * Climat propre à chaque ferme : décalage marqué + déphasage du cycle jour/nuit,
 * pour que deux fermes affichent des courbes nettement différentes.
 */
function farmClimate(type: CapteurType, farmId: number): { offset: number; phaseH: number } {
  const cfg   = CAPTEUR_CONFIG[type];
  const range = cfg.max - cfg.min;
  // -0.5 → +0.5 selon la ferme (déterministe)
  const k = ((farmId % 5) - 2) / 2;          // -1, -0.5, 0, 0.5, 1
  const offset =
    type === 'temperature'  ? k * range * 0.22 :   // ferme chaude / fraîche
    type === 'humidite_air' ? k * range * 0.20 :   // ferme sèche / humide
    type === 'humidite_sol' ? k * range * 0.30 :   // reste clampé dans 72-90
                              k * range * 0.15;
  const phaseH = ((farmId % 3) - 1) * 2.5;         // -2.5h, 0, +2.5h
  return { offset, phaseH };
}

// ─── Génération centrée sur les besoins de la culture (démo « vendeuse ») ─────

// Plage optimale de la culture pour un type de capteur cœur (null sinon).
function cultureRange(type: CapteurType, row: { soil_min?: number | null; soil_max?: number | null; temp_min?: number | null; temp_max?: number | null; hum_air_min?: number | null; hum_air_max?: number | null }): [number, number] | null {
  if (row.soil_min == null) return null; // parcelle sans culture
  if (type === 'humidite_sol') return [row.soil_min!, row.soil_max!];
  if (type === 'temperature')  return [row.temp_min!, row.temp_max!];
  if (type === 'humidite_air') return [row.hum_air_min!, row.hum_air_max!];
  return null;
}

// Déviation volontaire pour la démo : 1 rouge + 2 orange par ferme.
// `idx` = position de la parcelle dans sa ferme.
function demoDeviation(idx: number, type: CapteurType): 'low' | 'high' | null {
  if (idx === 0 && type === 'temperature')  return 'low';   // 🔴 trop froid
  if (idx === 1 && type === 'humidite_sol')  return 'high';  // 🟠 excès d'eau
  if (idx === 2 && type === 'humidite_air')  return 'high';  // 🟠 air trop humide
  return null;
}

// Valeur d'un capteur cœur centrée dans la plage de sa culture (léger cycle jour/nuit).
function coreValueAt(type: CapteurType, ts: number, center: number, amp: number): number {
  const cfg = CAPTEUR_CONFIG[type];
  const d = new Date(ts);
  const h = d.getHours() + d.getMinutes() / 60;
  const wave  = Math.sin((h - 9) * Math.PI / 12);
  const noise = (Math.random() - 0.5) * amp * 0.4;
  return Math.round(clamp(center + amp * wave + noise, cfg.min, cfg.max) * 100) / 100;
}

// ─── Géométrie parcelle (pour placer les capteurs DANS la parcelle) ───────────

type Ring = [number, number][]; // anneau de [lng, lat]

// Polygone carré approximatif (réplique de la logique front) si pas de géométrie réelle.
function approxRing(lat: number, lng: number, superficieHa: number | null): Ring {
  const ha = superficieHa && superficieHa > 0 ? superficieHa : 5;
  const sideM = Math.sqrt(ha * 10000);
  const dlat = (sideM / 111000) / 2;
  const dlng = (sideM / (111000 * Math.cos((lat * Math.PI) / 180))) / 2;
  const skew = dlng * 0.18;
  return [
    [lng - dlng,        lat - dlat],
    [lng + dlng + skew, lat - dlat],
    [lng + dlng,        lat + dlat],
    [lng - dlng - skew, lat + dlat],
    [lng - dlng,        lat - dlat],
  ];
}

// Point dans polygone (ray casting), coords [lng, lat].
function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = (yi > lat) !== (yj > lat) &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Point aléatoire À L'INTÉRIEUR de l'anneau (rejet dans la bbox, fallback centroïde).
function randomPointInRing(ring: Ring): [number, number] {
  const lngs = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  for (let k = 0; k < 50; k++) {
    const lng = minLng + Math.random() * (maxLng - minLng);
    const lat = minLat + Math.random() * (maxLat - minLat);
    if (pointInRing(lng, lat, ring)) return [lng, lat];
  }
  const uniq = ring.slice(0, -1);
  const cx = uniq.reduce((s, p) => s + p[0], 0) / uniq.length;
  const cy = uniq.reduce((s, p) => s + p[1], 0) / uniq.length;
  return [cx, cy];
}

// ─── Refresh ──────────────────────────────────────────────────────────────────

async function refresh() {
  console.log('🔧 Vérification de la structure (kits + capteurs cœur)...');

  const parcelles = await pg.query<{ id: number }>('SELECT id FROM parcelle ORDER BY id');
  let kitsCrees = 0, capteursCrees = 0;

  for (const { id: parcelleId } of parcelles.rows) {
    // 1 kit minimum par parcelle
    const kitRes = await pg.query<{ id: number }>(
      'SELECT id FROM kit WHERE parcelle_id = $1 ORDER BY id LIMIT 1', [parcelleId]
    );
    let kitId: number;
    if (kitRes.rowCount === 0) {
      const ins = await pg.query<{ id: number }>(
        `INSERT INTO kit (parcelle_id, nom, modele, date_installation, actif, created_at)
         VALUES ($1, 'Kit principal', 'TechFarm v1', NOW(), true, NOW()) RETURNING id`,
        [parcelleId]
      );
      kitId = ins.rows[0].id;
      kitsCrees++;
    } else {
      kitId = kitRes.rows[0].id;
    }

    // Capteurs cœur garantis sur ce kit
    for (const type of CORE_TYPES) {
      const cap = await pg.query(
        'SELECT id FROM capteur WHERE kit_id = $1 AND type = $2 LIMIT 1', [kitId, type]
      );
      if (cap.rowCount === 0) {
        await pg.query(
          `INSERT INTO capteur (kit_id, type, unite, actif, created_at)
           VALUES ($1, $2, $3, true, NOW())`,
          [kitId, type, CAPTEUR_CONFIG[type].unite]
        );
        capteursCrees++;
      }
    }
  }
  console.log(`   → ${kitsCrees} kit(s) et ${capteursCrees} capteur(s) ajoutés (manquants uniquement)`);

  // Géolocalisation des capteurs : un point ALÉATOIRE À L'INTÉRIEUR de la parcelle
  // (géométrie réelle si dispo, sinon carré approx). Re-placé à chaque run.
  await pg.query('ALTER TABLE capteur ADD COLUMN IF NOT EXISTS position_lat decimal(10,7)');
  await pg.query('ALTER TABLE capteur ADD COLUMN IF NOT EXISTS position_lng decimal(10,7)');

  const parcGeo = await pg.query('SELECT id, position_lat, position_lng, superficie_ha, geometry FROM parcelle');
  const ringByParcelle = new Map<number, Ring>();
  for (const p of parcGeo.rows) {
    if (p.position_lat == null || p.position_lng == null) continue;
    let ring: Ring | null = null;
    if (p.geometry) {
      try {
        const g = typeof p.geometry === 'string' ? JSON.parse(p.geometry) : p.geometry;
        if (Array.isArray(g) && g.length >= 3 && g[0]?.lat != null) {
          // Format Leaflet [{lat,lng}] (comme le front) → anneau [lng,lat]
          ring = [...g, g[0]].map((pt: { lat: number; lng: number }) => [pt.lng, pt.lat]);
        } else if (g?.coordinates?.[0]?.length >= 4) {
          // GeoJSON Polygon
          ring = g.coordinates[0] as Ring;
        }
      } catch { /* géométrie invalide → fallback carré */ }
    }
    if (!ring) ring = approxRing(Number(p.position_lat), Number(p.position_lng), p.superficie_ha != null ? Number(p.superficie_ha) : null);
    ringByParcelle.set(p.id, ring);
  }

  const capParc = await pg.query<{ id: number; parcelle_id: number }>(
    'SELECT c.id, k.parcelle_id FROM capteur c JOIN kit k ON k.id = c.kit_id'
  );
  let nbGeo = 0;
  for (const c of capParc.rows) {
    const ring = ringByParcelle.get(c.parcelle_id);
    if (!ring) continue;
    const [lng, lat] = randomPointInRing(ring);
    await pg.query('UPDATE capteur SET position_lat = $1, position_lng = $2 WHERE id = $3', [lat, lng, c.id]);
    nbGeo++;
  }
  if (nbGeo) console.log(`   → ${nbGeo} capteurs géolocalisés (dans le polygone de leur parcelle)`);

  // ── Cultures (référentiel des besoins) + assignation aux parcelles ───────────
  console.log('🌱 Vérification des cultures...');
  await pg.query(`
    CREATE TABLE IF NOT EXISTS "culture" (
      "id" INT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      "nom" varchar(60) UNIQUE NOT NULL,
      "icon" varchar(10),
      "soil_min" smallint, "soil_max" smallint,
      "temp_min" smallint, "temp_max" smallint,
      "hum_air_min" smallint, "hum_air_max" smallint,
      "besoin_eau" varchar(20), "besoin_soleil" varchar(20)
    )
  `);
  const CULTURES = [
    { nom: 'Blé',            icon: '🌾', soil: [40, 60], temp: [12, 25], hum: [40, 70], eau: 'Modéré', soleil: 'Fort'  },
    { nom: 'Maïs',           icon: '🌽', soil: [50, 70], temp: [18, 30], hum: [50, 80], eau: 'Élevé',  soleil: 'Fort'  },
    { nom: 'Tomate',         icon: '🍅', soil: [60, 80], temp: [18, 27], hum: [50, 70], eau: 'Élevé',  soleil: 'Fort'  },
    { nom: 'Vigne',          icon: '🍇', soil: [30, 55], temp: [15, 30], hum: [40, 70], eau: 'Faible', soleil: 'Fort'  },
    { nom: 'Salade',         icon: '🥬', soil: [65, 85], temp: [10, 22], hum: [60, 85], eau: 'Élevé',  soleil: 'Moyen' },
    { nom: 'Pomme de terre', icon: '🥔', soil: [55, 75], temp: [12, 24], hum: [50, 75], eau: 'Modéré', soleil: 'Moyen' },
    { nom: 'Colza',          icon: '🌼', soil: [45, 65], temp: [10, 25], hum: [45, 75], eau: 'Modéré', soleil: 'Moyen' },
    { nom: 'Tournesol',      icon: '🌻', soil: [35, 60], temp: [18, 30], hum: [40, 70], eau: 'Faible', soleil: 'Fort'  },
  ];
  for (const c of CULTURES) {
    await pg.query(
      `INSERT INTO culture (nom, icon, soil_min, soil_max, temp_min, temp_max, hum_air_min, hum_air_max, besoin_eau, besoin_soleil)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (nom) DO NOTHING`,
      [c.nom, c.icon, c.soil[0], c.soil[1], c.temp[0], c.temp[1], c.hum[0], c.hum[1], c.eau, c.soleil]
    );
  }

  // Assigner une culture aux parcelles qui n'en ont pas (dispatch déterministe)
  const noCulture = await pg.query<{ id: number }>(
    `SELECT id FROM parcelle WHERE culture_type IS NULL OR culture_type = '' ORDER BY id`
  );
  let nbCult = 0;
  for (let i = 0; i < noCulture.rows.length; i++) {
    await pg.query('UPDATE parcelle SET culture_type = $1 WHERE id = $2', [CULTURES[i % CULTURES.length].nom, noCulture.rows[i].id]);
    nbCult++;
  }
  if (nbCult) console.log(`   → ${nbCult} parcelle(s) ont reçu une culture`);

  // 2 — Régénère la fenêtre récente de mesures
  console.log(`🧹 Suppression des mesures des ${WINDOW_DAYS} derniers jours...`);
  await pg.query(`DELETE FROM mesure WHERE time >= NOW() - INTERVAL '${WINDOW_DAYS} days'`);

  const capteurs = await pg.query<{
    id: number; type: CapteurType; parcelle_id: number; farm_id: number;
    soil_min: number | null; soil_max: number | null;
    temp_min: number | null; temp_max: number | null;
    hum_air_min: number | null; hum_air_max: number | null;
  }>(
    `SELECT c.id, c.type, p.id AS parcelle_id, f.id AS farm_id,
            cu.soil_min, cu.soil_max, cu.temp_min, cu.temp_max, cu.hum_air_min, cu.hum_air_max
     FROM capteur c
     JOIN kit k      ON k.id = c.kit_id
     JOIN parcelle p ON p.id = k.parcelle_id
     JOIN farm f     ON f.id = p.farm_id
     LEFT JOIN culture cu ON cu.nom = p.culture_type
     ORDER BY c.id`
  );

  // Index de chaque parcelle dans sa ferme (pour la déviation démo 1 rouge / 2 orange)
  const parcRows = await pg.query<{ id: number; farm_id: number }>('SELECT id, farm_id FROM parcelle ORDER BY farm_id, id');
  const idxInFarm = new Map<number, number>();
  const farmCounter = new Map<number, number>();
  for (const r of parcRows.rows) {
    const c = farmCounter.get(r.farm_id) ?? 0;
    idxInFarm.set(r.id, c);
    farmCounter.set(r.farm_id, c + 1);
  }
  console.log(`📊 Génération de mesures fraîches pour ${capteurs.rowCount} capteurs...`);

  const now    = Date.now();
  const points = Math.floor((WINDOW_DAYS * 24 * 60 * 60 * 1000) / INTERVAL_MS);

  let total = 0;
  let values: string[] = [];
  let params: (string | number)[] = [];
  let p = 1;

  const flush = async () => {
    if (values.length === 0) return;
    await pg.query(
      `INSERT INTO mesure (time, capteur_id, valeur, qualite) VALUES ${values.join(',')}`,
      params
    );
    total += values.length;
    values = []; params = []; p = 1;
  };

  for (const row of capteurs.rows) {
    const { id, type, parcelle_id, farm_id } = row;
    if (!CAPTEUR_CONFIG[type]) continue; // type inconnu → ignoré

    // Capteur cœur avec une culture → valeurs centrées sur la plage optimale
    // (sauf déviation démo). Sinon (vent, etc.) → modèle générique par ferme.
    const range = cultureRange(type, row);
    let core: { center: number; amp: number } | null = null;
    if (range) {
      const [mn, mx] = range;
      const w = mx - mn;
      const dev = demoDeviation(idxInFarm.get(parcelle_id) ?? 99, type);
      const center = dev === 'low'  ? mn - w * 0.45   // sous le seuil → rouge
                   : dev === 'high' ? mx + w * 0.35   // au-dessus → orange
                   : (mn + mx) / 2;                   // centre → vert
      core = { center, amp: Math.max(2, w * 0.16) };
    }

    const climate = farmClimate(type, farm_id);
    const offset  = climate.offset + capteurOffset(type, id);

    for (let i = points; i >= 0; i--) {
      const ts = now - i * INTERVAL_MS;
      const v = core
        ? coreValueAt(type, ts, core.center, core.amp)
        : valueAt(type, ts, offset, climate.phaseH);
      values.push(`($${p++}, $${p++}, $${p++}, 1)`);
      params.push(new Date(ts).toISOString(), id, v);
      if (values.length >= BATCH) await flush();
    }
  }
  await flush();

  console.log(`   → ${total.toLocaleString()} mesures insérées (jusqu'à maintenant)`);

  // ── Caméras (table + seed idempotents) ───────────────────────────────────────
  console.log('📷 Vérification des caméras...');
  await pg.query(`
    CREATE TABLE IF NOT EXISTS "camera" (
      "id" INT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      "farm_id" int REFERENCES "farm" ("id"),
      "nom" varchar(150) NOT NULL,
      "emplacement" varchar(150),
      "url" varchar(500) NOT NULL,
      "thumbnail" varchar(500),
      "icon" varchar(10),
      "statut" varchar(20) DEFAULT 'live',
      "created_at" timestamp
    )
  `);

  const camCount = await pg.query<{ n: string }>('SELECT COUNT(*) AS n FROM camera');
  if (parseInt(camCount.rows[0].n, 10) === 0) {
    const farms = await pg.query<{ id: number }>('SELECT id FROM farm ORDER BY id');
    const CAMERAS = [
      {
        nom: 'Champ Blé — Vue Aérienne', emplacement: 'Ferme Nord', icon: '🌾',
        url: 'https://www.youtube.com/embed/ydYDqZQpim8?autoplay=1&controls=0&rel=0&modestbranding=1&disablekb=1',
        thumbnail: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80',
      },
      {
        nom: 'Parcelle Maraichère', emplacement: 'Parcelle Centre', icon: '🥦',
        url: 'https://www.youtube.com/embed/1EiC9bvVGnk?autoplay=1&controls=0&rel=0&modestbranding=1&disablekb=1',
        thumbnail: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80',
      },
    ];
    let nbCam = 0;
    for (const farm of farms.rows) {
      for (const c of CAMERAS) {
        await pg.query(
          `INSERT INTO camera (farm_id, nom, emplacement, url, thumbnail, icon, statut, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'live', NOW())`,
          [farm.id, c.nom, c.emplacement, c.url, c.thumbnail, c.icon]
        );
        nbCam++;
      }
    }
    console.log(`   → ${nbCam} caméras insérées`);
  } else {
    console.log(`   → ${camCount.rows[0].n} caméras déjà présentes`);
  }

  console.log('\n✅ Refresh terminé — le dashboard a des données récentes.');

  await pg.end();
}

refresh().catch((err) => {
  console.error('❌ Refresh échoué :', err);
  process.exit(1);
});
