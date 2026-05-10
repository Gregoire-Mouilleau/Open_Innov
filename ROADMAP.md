# ROADMAP — TechFarm

Feuille de route de développement. Mise à jour à chaque bloc terminé.
Détail des sessions dans `doc/journal/SESSION-LOG.md`.
Décisions techniques dans `doc/adr/`.

---

## Légende
- [ ] À faire
- [~] En cours
- [x] Terminé

---

## Bloc 1 — Socle BDD local (3 sessions)
**Objectif :** Stack BDD opérationnelle en local, interrogeable depuis Next.js.

- [ ] 1.1 — PostgreSQL + TimescaleDB en Docker standalone, exécuter `bdd PostGres.sql`, vérifier hypertable `mesure`
- [ ] 1.2 — Script de seed TypeScript : 2 companies, 5 farms, 15 parcelles, 30 kits, ~100 capteurs, 30 jours de mesures (`pnpm db:seed`)
- [ ] 1.3 — MongoDB Atlas + MinIO Docker : collections `alertes`/`predictions_ia` avec 50 docs fake, 10 photos test

**Livrables :** BDD interrogeable, seed reproductible, connexions testées.

---

## Bloc 2 — Intégration Next.js (2 sessions)
**Objectif :** API routes qui exposent les données.

- [ ] 2.1 — Clients DB (Prisma/pg + mongoose + minio-js), `.env`, route `/backend_next/health`
- [ ] 2.2 — Endpoints : `GET /backend_next/parcelles`, `GET /backend_next/parcelles/:id/mesures?range=24h`, `GET /backend_next/alertes`

**Livrables :** API testable via Thunder Client / Postman.

---

## Bloc 3 — Docker Compose complet + Healthchecks (2 sessions)
**Objectif :** `docker compose up` lance toute la stack.

- [ ] 3.1 — `docker-compose.yml` : postgres+timescale, mongo, minio, next.js — réseaux, volumes, healthchecks
- [ ] 3.2 — Init SQL au démarrage Postgres, seed optionnel, README de lancement

**Livrables :** `git clone` + `docker compose up` = projet qui tourne.

---

## Bloc 4 — Coordination mobile/API (1 session)
**Objectif :** Mobile Expo et API Next.js communiquent sans friction.

- [ ] 4.1 — Définir contrat API (endpoints consommés par mobile), `.env.example` commun, test CORS + URLs en local

**Livrables :** Mobile peut appeler l'API locale sans erreur.

---

## Bloc 5 — CI/CD self-hosted runner + quality gates (2 sessions)
**Objectif :** Pipeline qualité automatisé sans consommer de quota.

- [ ] 5.1 — Setup runner auto-hébergé (ADR-0002), pipeline : lint + typecheck + tests unitaires, jobs conditionnels par dossier (`backend_next/**` / `mobile/**`)
- [ ] 5.2 — Cache `node_modules`, optimisation temps pipeline, badge statut dans README

**Livrables :** Chaque PR déclenche le CI sur la machine locale, 0 quota consommé.

---

## Bloc 6 — Tests E2E (2 sessions)
**Objectif :** Golden path couvert automatiquement.

- [ ] 6.1 — Tests E2E API (Playwright ou Supertest) : auth, CRUD parcelle, lecture mesures
- [ ] 6.2 — Intégration E2E dans le pipeline CI (trigger sur PR vers develop/main uniquement)

**Livrables :** Golden path testé, E2E dans le pipeline.

---

## Bloc 7 — ELK dashboards [OPTIONNEL] (2 sessions)
**Objectif :** Dashboards Kibana pour la soutenance.

- [ ] 7.1 — Ajouter elasticsearch + kibana au compose, worker Node Postgres→ES (sync toutes les 5 min)
- [ ] 7.2 — 2-3 dashboards Kibana : mesures par parcelle, heatmap alertes, top capteurs

**Livrables :** Kibana sur localhost:5601 avec dashboards préfaits.

---

## Bloc 8 — Déploiement serveur + CD automatisé (2 sessions)
**Objectif :** TechFarm accessible en ligne, déploiement automatisé.

- [ ] 8.1 — Docker Compose sur serveur cible, variables prod, Traefik routing + SSL
- [ ] 8.2 — CD : push `main` → deploy automatique via pipeline, runner migré sur le serveur

**Livrables :** TechFarm en ligne, démontrable depuis n'importe quel laptop.

---

## Hors périmètre (backend externe)
Ces éléments sont gérés par l'équipe backend externe — TechFarm les consomme via les BDD partagées :
- Ingestion temps réel des capteurs IoT (MQTT/HTTP)
- Génération automatique des alertes selon seuils
- Modèles IA qui peuplent `predictions_ia`
