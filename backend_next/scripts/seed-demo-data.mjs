/**
 * seed-demo-data.mjs
 * Insère des données de démo réalistes pour la ferme de l'utilisateur connecté.
 * Ne touche PAS aux users / companies existants.
 *
 * Usage : node scripts/seed-demo-data.mjs
 */

import pg from 'pg';
import { MongoClient } from 'mongodb';

const USER_EMAIL = 'gregoire.mouilleau@gmail.com';

const pgClient = new pg.Client({
  host: 'localhost', port: 5432,
  database: 'techfarm', user: 'techfarm', password: 'techfarm123',
});

const mongoClient = new MongoClient('mongodb://techfarm:techfarm123@localhost:27017/techfarm?authSource=admin');

// ─── Helpers ──────────────────────────────────────────────────

function rand(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function noise(val, amplitude) {
  return Math.round((val + (Math.random() - 0.5) * amplitude) * 100) / 100;
}

/** Génère une série temporelle réaliste sur N heures avec intervalles de 15 min */
function timeseries(hours, baseVal, min, max, noiseAmp) {
  const intervalMs = 15 * 60 * 1000;
  const points = Math.floor((hours * 60 * 60 * 1000) / intervalMs);
  const now = Date.now();
  let val = baseVal;
  const rows = [];
  for (let i = points; i >= 0; i--) {
    val = Math.min(max, Math.max(min, noise(val, noiseAmp)));
    rows.push({ ts: new Date(now - i * intervalMs).toISOString(), val });
  }
  return rows;
}

// ─── Config capteurs ──────────────────────────────────────────

const CAPTEUR_DEFS = [
  { type: 'temperature',  unite: '°C',    base: 19,   min: 10,  max: 35,  noise: 2,   hoursBack: 48 },
  { type: 'humidite_air', unite: '%',     base: 68,   min: 30,  max: 95,  noise: 5,   hoursBack: 48 },
  { type: 'humidite_sol', unite: '%',     base: 52,   min: 15,  max: 90,  noise: 3,   hoursBack: 48 },
  { type: 'luminosite',   unite: 'lux',   base: 42000,min: 0,   max: 100000, noise: 8000, hoursBack: 48 },
];

// ─── Main ─────────────────────────────────────────────────────

await pgClient.connect();
await mongoClient.connect();
const db = mongoClient.db('techfarm');
const alertesCol = db.collection('alertes');

// 1 — Récupérer l'utilisateur
const userRes = await pgClient.query(
  'SELECT id, company_id FROM users WHERE email = $1', [USER_EMAIL]
);
if (userRes.rowCount === 0) {
  console.error(`❌ Utilisateur "${USER_EMAIL}" introuvable.`);
  process.exit(1);
}
const { id: userId, company_id: companyId } = userRes.rows[0];
console.log(`👤 User ${userId}, company ${companyId}`);

// 2 — Vérifier/créer une ferme
let farmId;
const existingFarm = await pgClient.query(
  'SELECT id FROM farm WHERE company_id = $1 ORDER BY created_at LIMIT 1', [companyId]
);
if (existingFarm.rowCount > 0) {
  farmId = existingFarm.rows[0].id;
  console.log(`🚜 Ferme existante id=${farmId}`);
} else {
  const fRes = await pgClient.query(
    `INSERT INTO farm (nom, company_id, adresse, code_postal, country, created_at)
     VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING id`,
    ['Ferme des Hauts-Champs', companyId, '12 Route de la Vallée', '44000', 'France']
  );
  farmId = fRes.rows[0].id;
  console.log(`🚜 Ferme créée id=${farmId}`);
}

// 3 — Créer 2 parcelles
const parcellesDefs = [
  { nom: 'Parcelle Nord', culture: 'blé',  lat: 47.218, lng: -1.553 },
  { nom: 'Parcelle Sud',  culture: 'maïs', lat: 47.215, lng: -1.551 },
];

const parcelleIds = [];
for (const p of parcellesDefs) {
  const res = await pgClient.query(
    `INSERT INTO parcelle (farm_id, nom, superficie_ha, culture_type, position_lat, position_lng, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING id`,
    [farmId, p.nom, rand(5, 25), p.culture, p.lat, p.lng]
  );
  parcelleIds.push(res.rows[0].id);
  console.log(`🌾 Parcelle "${p.nom}" id=${res.rows[0].id}`);
}

// 4 — Créer 1 kit + capteurs par parcelle
const capteurs = []; // [{ id, type, parcelleId }]

for (const parcelleId of parcelleIds) {
  const kitRes = await pgClient.query(
    `INSERT INTO kit (parcelle_id, nom, modele, date_installation, actif, created_at)
     VALUES ($1,$2,$3,NOW(),true,NOW()) RETURNING id`,
    [parcelleId, 'Kit Démo TF-1', 'TechFarm v2']
  );
  const kitId = kitRes.rows[0].id;
  console.log(`📡 Kit id=${kitId} → parcelle ${parcelleId}`);

  for (const def of CAPTEUR_DEFS) {
    const cRes = await pgClient.query(
      `INSERT INTO capteur (kit_id, type, unite, actif, created_at)
       VALUES ($1,$2,$3,true,NOW()) RETURNING id`,
      [kitId, def.type, def.unite]
    );
    capteurs.push({ id: cRes.rows[0].id, type: def.type, parcelleId, def });
  }
}

// 5 — Insérer les mesures (48h, 15min interval)
console.log('📊 Insertion mesures (patient ~10s)...');
let totalMesures = 0;
const BATCH = 500;

for (const cap of capteurs) {
  const series = timeseries(
    cap.def.hoursBack,
    cap.def.base,
    cap.def.min,
    cap.def.max,
    cap.def.noise
  );

  const values = [];
  const params = [];
  let p = 1;

  for (const { ts, val } of series) {
    values.push(`($${p++}, $${p++}, $${p++}, 1)`);
    params.push(ts, cap.id, val);

    if (values.length >= BATCH) {
      await pgClient.query(
        `INSERT INTO mesure (time, capteur_id, valeur, qualite) VALUES ${values.join(',')}`,
        params
      );
      totalMesures += values.length;
      values.length = 0;
      params.length = 0;
      p = 1;
    }
  }
  if (values.length > 0) {
    await pgClient.query(
      `INSERT INTO mesure (time, capteur_id, valeur, qualite) VALUES ${values.join(',')}`,
      params
    );
    totalMesures += values.length;
  }
}
console.log(`   → ${totalMesures.toLocaleString()} mesures insérées`);

// 6 — Quelques alertes MongoDB
console.log('🚨 Insertion alertes MongoDB...');
const tempCap = capteurs.find(c => c.type === 'temperature');
const solCap  = capteurs.find(c => c.type === 'humidite_sol');

await alertesCol.insertMany([
  {
    parcelle_id: parcelleIds[0],
    capteur_id: solCap?.id ?? 1,
    type: 'seuil_depasse',
    severite: 'warning',
    valeur_declenchante: 28.5,
    message: 'Humidité sol basse — irrigation recommandée',
    lu: false,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    parcelle_id: parcelleIds[0],
    capteur_id: tempCap?.id ?? 1,
    type: 'anomalie',
    severite: 'critical',
    valeur_declenchante: 34.1,
    message: 'Température élevée détectée — risque stress hydrique',
    lu: false,
    created_at: new Date(Date.now() - 30 * 60 * 1000),
  },
  {
    parcelle_id: parcelleIds[1],
    capteur_id: solCap?.id ?? 1,
    type: 'maladie',
    severite: 'info',
    valeur_declenchante: 82,
    message: 'Humidité sol élevée — surveiller risque mildiou',
    lu: true,
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000),
  },
]);
console.log('   → 3 alertes insérées');

// ─── Résumé ───────────────────────────────────────────────────
console.log('\n✅ Seed démo terminé !');
console.log(`   Ferme      : id=${farmId}`);
console.log(`   Parcelles  : ${parcelleIds.join(', ')}`);
console.log(`   Capteurs   : ${capteurs.length}`);
console.log(`   Mesures    : ${totalMesures.toLocaleString()} (48h, 15min interval)`);
console.log(`   Alertes    : 3`);

await pgClient.end();
await mongoClient.close();
