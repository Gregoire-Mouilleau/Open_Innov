# TechFarm — Plateforme de monitoring agricole IoT

## Prérequis
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) >= 24
- [Node.js](https://nodejs.org/) >= 20
- Git

## Structure du projet
```
Open_Innov/
  backend_next/         ← Next.js 16 (API REST + Admin web)
    app/db/             ← Scripts SQL
    scripts/seed.ts     ← Seed BDD
  mobile/               ← Expo / React Native (terrain)
  ROADMAP.md            ← État d'avancement
```

## Installation

### 1. Cloner le repo
```bash
git clone <url> && cd Open_Innov
```

### 2. Variables d'environnement
```bash
cp backend_next/.env.example backend_next/.env
# Éditer backend_next/.env et remplacer les CHANGE_ME
```

### 3. Lancer la stack BDD
```bash
docker compose -f docker-compose.dev.yml up -d
```

### 4. Initialiser PostgreSQL

**Windows (PowerShell) :**
```powershell
# Activer TimescaleDB
docker exec techfarm_postgres_dev psql -U techfarm -d techfarm `
  -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"

# Créer les tables
Get-Content "backend_next/app/db/db_PostGres.sql" | `
  docker exec -i techfarm_postgres_dev psql -U techfarm -d techfarm

# Créer la hypertable
docker exec techfarm_postgres_dev psql -U techfarm -d techfarm `
  -c "SELECT create_hypertable('mesure', 'time');"
```

**Mac / Linux :**
```bash
docker exec techfarm_postgres_dev psql -U techfarm -d techfarm \
  -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"

docker exec -i techfarm_postgres_dev psql -U techfarm -d techfarm \
  < backend_next/app/db/db_PostGres.sql

docker exec techfarm_postgres_dev psql -U techfarm -d techfarm \
  -c "SELECT create_hypertable('mesure', 'time');"
```

### 5. Seed (données de test)
```bash
cd backend_next
npm install
npm run db:seed
```

## Services & ports

| Service | URL | Usage |
|---|---|---|
| Next.js | http://localhost:3000 | App + API + Admin |
| PostgreSQL | localhost:5432 | BDD relationnelle |
| MongoDB | localhost:27017 | Alertes + IA |
| MinIO API | http://localhost:9000 | Stockage fichiers S3 |
| MinIO Console | http://localhost:9001 | Interface web MinIO |

**Identifiants MinIO console** : `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` dans `backend_next/.env`

## Développement
```bash
# Backend
cd backend_next && npm run dev

# Mobile
cd mobile && npm start
```
