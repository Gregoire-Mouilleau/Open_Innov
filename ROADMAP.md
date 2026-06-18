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

- [x] 1.1 — PostgreSQL + TimescaleDB en Docker standalone, exécuter `bdd PostGres.sql`, vérifier hypertable `mesure`
- [x] 1.2 — Script de seed TypeScript : 2 companies, 5 farms, 15 parcelles, 104 capteurs, 299 624 mesures (`npm run db:seed`)
- [x] 1.3 — MongoDB local + MinIO Docker : collections `alertes`/`predictions_ia` avec 50 docs fake, 5 photos test, README.md créé

**Livrables :** BDD interrogeable, seed reproductible, connexions testées.

---

## Bloc 2 — Intégration Next.js ✅ (session 2026-05-11)
**Objectif :** API routes qui exposent les données.

- [x] 2.1 — Clients DB (`pg` + `mongoose` + `minio`), `.env`, route `GET /api/health`
- [x] 2.2 — Auth JWT stateless (`jose`) : register, login, refresh, middleware `requireAuth`/`isAdmin` (ADR-0004)
- [x] 2.3 — CRUD Users, Company, Farms, Parcelles, Kits
- [x] 2.4 — Mesures IoT (raw + graphiques TimescaleDB), Photos MinIO (URLs signées)
- [x] 2.5 — Proxy météo open-meteo : daily/hourly, cache 30 min

**Livrables :** API complète testable via Thunder Client / Postman.

---

## Bloc 3 — Docker Compose complet + Healthchecks ✅ (session 2026-05-11)
**Objectif :** `docker compose up` lance toute la stack.

- [x] 3.1 — `docker-compose.dev.yml` : postgres+timescale, mongo, minio — réseaux, volumes, healthchecks (3 services healthy)
- [x] 3.2 — Init SQL au démarrage Postgres, seed reproductible, README de lancement
- [~] Next.js non containerisé en dev (reporté au Bloc 8 prod — `npm run dev` en local)

**Livrables :** `docker compose -f docker-compose.dev.yml up -d` + `npm run dev` = stack complète.

---

## Bloc 4 — Coordination mobile/API ✅ (session 2026-05-11)
**Objectif :** Mobile Expo et API Next.js communiquent sans friction.

- [x] 4.1 — Contrat API défini et implémenté (auth, parcelles, kits, mesures, alertes, météo)
- [ ] 4.2 — `.env.example` commun pour Grégoire (mobile), validation CORS + URLs en local

**Livrables :** API consommable par l'app Expo. CORS à valider avec Grégoire.

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
