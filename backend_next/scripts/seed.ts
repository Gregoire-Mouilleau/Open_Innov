import { faker } from '@faker-js/faker/locale/fr';
import { Pool } from 'pg';
import { MongoClient } from 'mongodb';
import { Client as MinioClient } from 'minio';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pg = new Pool({ connectionString: process.env.DATABASE_URL });
const mongo = new MongoClient(process.env.MONGODB_URI!);
const minio = new MinioClient({
  endPoint:  process.env.MINIO_ENDPOINT!,
  port:      parseInt(process.env.MINIO_PORT!),
  useSSL:    false,
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type CapteurType = 'temperature' | 'humidite_air' | 'humidite_sol' | 'luminosite' | 'ph' | 'qualite_air' | 'debit_eau';

const CAPTEUR_CONFIG: Record<CapteurType, { unite: string; min: number; max: number }> = {
  temperature:   { unite: '°C',    min: 5,   max: 40  },
  humidite_air:  { unite: '%',     min: 20,  max: 95  },
  humidite_sol:  { unite: '%',     min: 10,  max: 90  },
  luminosite:    { unite: 'lux',   min: 0,   max: 100000 },
  ph:            { unite: 'pH',    min: 5.5, max: 8.5 },
  qualite_air:   { unite: 'indice',min: 1,   max: 10  },
  debit_eau:     { unite: 'L/min', min: 0,   max: 50  },
};

const TYPES = Object.keys(CAPTEUR_CONFIG) as CapteurType[];
const CULTURES = ['blé', 'maïs', 'vigne', 'colza', 'tournesol', 'soja', 'orge'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function addNoise(value: number, amplitude: number): number {
  const noise = (Math.random() - 0.5) * amplitude;
  return Math.round((value + noise) * 100) / 100;
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  await mongo.connect();
  const db = mongo.db(process.env.MONGO_DB);
  const alertes = db.collection('alertes');
  const predictions = db.collection('predictions_ia');

  console.log('🌱 Nettoyage des données existantes...');
  await pg.query('TRUNCATE mesure, photo, recolte, capteur, kit, parcelle, farm, company, sessions, users RESTART IDENTITY CASCADE');
  await alertes.deleteMany({});
  await predictions.deleteMany({});

  // ── Companies ───────────────────────────────────────────────────────────────
  console.log('🏢 Insertion companies...');
  const companyIds: number[] = [];
  for (let i = 0; i < 2; i++) {
    const res = await pg.query<{ id: number }>(
      `INSERT INTO company (nom, telephone, code_postal, country, created_at)
       VALUES ($1,$2,$3,$4,NOW()) RETURNING id`,
      [faker.company.name(), faker.phone.number(), faker.location.zipCode(), 'France']
    );
    companyIds.push(res.rows[0].id);
  }

  // ── Farms ────────────────────────────────────────────────────────────────────
  console.log('🚜 Insertion farms...');
  const farmIds: number[] = [];
  for (let i = 0; i < 5; i++) {
    const res = await pg.query<{ id: number }>(
      `INSERT INTO farm (nom, company_id, adresse, code_postal, country, created_at)
       VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING id`,
      [
        `Ferme ${faker.location.city()}`,
        companyIds[i % companyIds.length],
        faker.location.streetAddress(),
        faker.location.zipCode(),
        'France',
      ]
    );
    farmIds.push(res.rows[0].id);
  }

  // ── Parcelles ────────────────────────────────────────────────────────────────
  console.log('🌾 Insertion parcelles...');
  const parcelleIds: number[] = [];
  for (let i = 0; i < 15; i++) {
    const res = await pg.query<{ id: number }>(
      `INSERT INTO parcelle (farm_id, nom, superficie_ha, culture_type, position_lat, position_lng, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING id`,
      [
        farmIds[i % farmIds.length],
        `Parcelle ${faker.location.cardinalDirection()} ${i + 1}`,
        randBetween(1, 50),
        faker.helpers.arrayElement(CULTURES),
        parseFloat(faker.location.latitude({ min: 43, max: 50 }).toString()),
        parseFloat(faker.location.longitude({ min: -2, max: 7 }).toString()),
      ]
    );
    parcelleIds.push(res.rows[0].id);
  }

  // ── Kits & Capteurs ──────────────────────────────────────────────────────────
  console.log('📡 Insertion kits et capteurs...');
  const capteurs: { id: number; type: CapteurType }[] = [];

  for (const parcelleId of parcelleIds) {
    const nbKits = faker.number.int({ min: 1, max: 3 });
    for (let k = 0; k < nbKits; k++) {
      const kitRes = await pg.query<{ id: number }>(
        `INSERT INTO kit (parcelle_id, nom, modele, date_installation, actif, created_at)
         VALUES ($1,$2,$3,NOW(),true,NOW()) RETURNING id`,
        [parcelleId, `Kit ${faker.location.cardinalDirection()}-${k + 1}`, 'TechFarm v1']
      );
      const kitId = kitRes.rows[0].id;

      const types = faker.helpers.arrayElements(TYPES, { min: 2, max: 4 });
      for (const type of types) {
        const capRes = await pg.query<{ id: number }>(
          `INSERT INTO capteur (kit_id, type, unite, actif, created_at)
           VALUES ($1,$2,$3,true,NOW()) RETURNING id`,
          [kitId, type, CAPTEUR_CONFIG[type].unite]
        );
        capteurs.push({ id: capRes.rows[0].id, type });
      }
    }
  }

  console.log(`   → ${capteurs.length} capteurs créés`);

  // ── Mesures (30 jours, 1 point / 15 min) ────────────────────────────────────
  console.log('📊 Insertion mesures timeseries (patience ~30s)...');
  const now = Date.now();
  const DAYS = 30;
  const INTERVAL_MS = 15 * 60 * 1000;
  const points = Math.floor((DAYS * 24 * 60 * 60 * 1000) / INTERVAL_MS);

  let totalMesures = 0;
  const BATCH = 500;
  const values: string[] = [];
  const params: (string | number)[] = [];
  let p = 1;

  for (const { id, type } of capteurs) {
    const { min, max } = CAPTEUR_CONFIG[type];
    let base = randBetween(min, max);

    for (let i = points; i >= 0; i--) {
      const ts = new Date(now - i * INTERVAL_MS).toISOString();
      base = Math.min(max, Math.max(min, addNoise(base, (max - min) * 0.05)));
      values.push(`($${p++}, $${p++}, $${p++}, 1)`);
      params.push(ts, id, base);

      if (values.length >= BATCH) {
        await pg.query(
          `INSERT INTO mesure (time, capteur_id, valeur, qualite) VALUES ${values.join(',')}`,
          params
        );
        totalMesures += values.length;
        values.length = 0;
        params.length = 0;
        p = 1;
      }
    }
  }

  if (values.length > 0) {
    await pg.query(
      `INSERT INTO mesure (time, capteur_id, valeur, qualite) VALUES ${values.join(',')}`,
      params
    );
    totalMesures += values.length;
  }

  console.log(`   → ${totalMesures.toLocaleString()} mesures insérées`);

  // ── Récoltes ─────────────────────────────────────────────────────────────────
  console.log('🌽 Insertion récoltes...');
  for (const parcelleId of parcelleIds) {
    const nbRecoltes = faker.number.int({ min: 1, max: 3 });
    for (let r = 0; r < nbRecoltes; r++) {
      await pg.query(
        `INSERT INTO recolte (parcelle_id, date_recolte, culture_type, quantite_kg, qualite_note, commentaire, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
        [
          parcelleId,
          faker.date.past({ years: 1 }),
          faker.helpers.arrayElement(CULTURES),
          randBetween(500, 15000),
          faker.number.int({ min: 1, max: 5 }),
          faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.4 }),
        ]
      );
    }
  }

  // ── MongoDB : Alertes ────────────────────────────────────────────────────────
  console.log('🚨 Insertion alertes MongoDB...');
  const alertesDocs = Array.from({ length: 50 }, () => {
    const capteur = faker.helpers.arrayElement(capteurs);
    const { min, max } = CAPTEUR_CONFIG[capteur.type];
    return {
      parcelle_id: faker.helpers.arrayElement(parcelleIds),
      capteur_id: capteur.id,
      type: faker.helpers.arrayElement(['seuil_depasse', 'anomalie', 'maladie']),
      severite: faker.helpers.arrayElement(['info', 'warning', 'critical']),
      valeur_declenchante: randBetween(min, max),
      message: `Valeur anormale détectée sur capteur ${capteur.type}`,
      lu: faker.datatype.boolean(),
      created_at: faker.date.recent({ days: 30 }),
    };
  });
  await alertes.insertMany(alertesDocs);

  // ── MongoDB : Prédictions IA ─────────────────────────────────────────────────
  console.log('🤖 Insertion prédictions IA MongoDB...');
  const predictionsDocs = Array.from({ length: 50 }, () => ({
    parcelle_id: faker.helpers.arrayElement(parcelleIds),
    modele: faker.helpers.arrayElement(['maladie_detection_v2', 'rendement_prediction_v1', 'irrigation_optimizer_v3']),
    prediction: faker.helpers.arrayElement(['risque_mildiou', 'stress_hydrique', 'rendement_eleve', 'carence_azote']),
    score: Math.round(Math.random() * 100) / 100,
    horizon_heures: faker.helpers.arrayElement([24, 48, 72, 168]),
    recommandation: faker.lorem.sentence(),
    created_at: faker.date.recent({ days: 30 }),
  }));
  await predictions.insertMany(predictionsDocs);

  // ── MinIO : bucket + photos de test ─────────────────────────────────────────
  console.log('🪣  Setup MinIO...');
  const bucket = process.env.MINIO_BUCKET_PHOTOS!;
  const bucketExists = await minio.bucketExists(bucket);
  if (!bucketExists) {
    await minio.makeBucket(bucket, 'us-east-1');
    console.log(`   → Bucket "${bucket}" créé`);
  } else {
    console.log(`   → Bucket "${bucket}" déjà existant`);
  }

  // Photos fake : contenu SVG minimaliste (1 par parcelle)
  console.log('📸 Upload photos de test...');
  let nbPhotos = 0;
  for (const parcelleId of parcelleIds.slice(0, 5)) {
    const objectName = `parcelle/${parcelleId}/photo_test_${Date.now()}.svg`;
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
      <rect width="400" height="300" fill="#4ade80"/>
      <text x="200" y="150" text-anchor="middle" font-size="24" fill="white">Parcelle ${parcelleId}</text>
    </svg>`;
    await minio.putObject(bucket, objectName, Buffer.from(svgContent), svgContent.length, { 'Content-Type': 'image/svg+xml' });
    const urlPath = `/${bucket}/${objectName}`;
    await pg.query(
      `INSERT INTO photo (url_path, entity_type, entity_id, uploaded_at) VALUES ($1, 'parcelle', $2, NOW())`,
      [urlPath, parcelleId]
    );
    nbPhotos++;
  }
  console.log(`   → ${nbPhotos} photos uploadées`);

  // ── Résumé ───────────────────────────────────────────────────────────────────
  console.log('\n✅ Seed terminé !');
  console.log(`   Companies  : 2`);
  console.log(`   Farms      : 5`);
  console.log(`   Parcelles  : 15`);
  console.log(`   Capteurs   : ${capteurs.length}`);
  console.log(`   Mesures    : ${totalMesures.toLocaleString()}`);
  console.log(`   Alertes    : 50`);
  console.log(`   Prédictions: 50`);
  console.log(`   Photos     : ${nbPhotos}`);

  await pg.end();
  await mongo.close();
}

seed().catch((err) => {
  console.error('❌ Seed échoué :', err);
  process.exit(1);
});
