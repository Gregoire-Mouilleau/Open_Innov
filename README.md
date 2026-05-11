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

## API — Auth

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Inscription admin `{ email, password, first_name, last_name }` |
| POST | `/api/auth/register/employee` | Inscription employé — admin requis `{ email, password, first_name, last_name, company_id? }` |
| POST | `/api/auth/login` | Connexion `{ email, password }` |
| POST | `/api/auth/refresh` | Renouvellement access token (cookie refresh) |

## API — Farms

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/farms` | Liste des fermes avec company (auth requis) |
| POST | `/api/farms` | Créer une ferme `{ nom, company_id, adresse?, code_postal?, country? }` |
| GET | `/api/farms/[id]` | Détail d'une ferme |
| PUT | `/api/farms/[id]` | Modifier une ferme (admin requis) |
| DELETE | `/api/farms/[id]` | Supprimer une ferme (admin requis) |

## API — Companies

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/companies` | Liste des companies (auth requis) |
| POST | `/api/companies` | Créer une company `{ nom, telephone?, code_postal?, country? }` |
| PUT | `/api/companies/[id]` | Modifier une company (admin requis) |
| DELETE | `/api/companies/[id]` | Supprimer une company (admin requis) |

## API — Users

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/users` | Liste des utilisateurs (admin requis) |
| PUT | `/api/users/[id]` | Modifier un utilisateur (admin requis) |
| DELETE | `/api/users/[id]` | Supprimer un utilisateur (admin requis) |

## Développement
```bash
# Backend
cd backend_next && npm run dev

# Mobile
cd mobile && npm start
```
