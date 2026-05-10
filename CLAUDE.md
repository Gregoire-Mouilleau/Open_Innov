# CLAUDE.md — TechFarm

Mémoire persistante. À lire au début de chaque session.

---

## Mode de travail — RÈGLE FONDAMENTALE

1. Présenter le plan numéroté avant tout développement
2. Attendre le GO explicite avant de commencer
3. Implémenter UNE seule étape à la fois
4. Résumer ce qui a été fait à la fin de chaque étape
5. Demander explicitement la validation avant la suivante
6. Ne jamais enchaîner sans confirmation

### Format plan
```
## Plan d'implémentation
Étape 1 : [description courte]
Étape 2 : [description courte]
On commence par l'étape 1 ?
```

### Format fin d'étape
```
## Étape X/N terminée
- Ce qui a été fait : [résumé]
- Fichiers modifiés : [liste]
- Point d'attention : [si besoin]
Prêt pour l'étape suivante ?
```

### Règles supplémentaires
- Si une étape est trop grosse → la découper
- Si un problème détecté → le signaler AVANT de coder
- Toujours expliquer le POURQUOI d'un choix technique
- En cas de doute sur le périmètre → poser la question

---

## Projet

**TechFarm** — Plateforme de monitoring agricole IoT.

- **Moi** : Next.js (UI + API routes), schémas BDD, seed, Docker, CI/CD, déploiement
- **Backend externe** : ingestion capteurs IoT, génération alertes, modèles IA (consommés via BDD partagées)
- **Coéquipier** : Application mobile Expo (`mobile/`)

---

## Stack technique

| Composant | Technologie |
|---|---|
| Backend API + Admin web | Next.js 16 App Router (dans `backend_next/`) + TypeScript |
| Frontend mobile + desktop terrain | Expo / React Native (dans `mobile/`) |
| BDD relationnelle + timeseries | PostgreSQL 16 + TimescaleDB |
| BDD NoSQL | MongoDB local Docker (alertes, predictions_ia) |
| Stockage fichiers | MinIO (S3-compatible) |
| Recherche + dashboards | Elasticsearch + Kibana [optionnel] |
| API externe | open-meteo (météo) |
| CI/CD | GitHub Actions + self-hosted runner local |
| Déploiement cible | Serveur via Docker Compose + Traefik |

**Hiérarchie :** Company → Farm → Parcelle → Kit → Capteur → Mesure (TimescaleDB hypertable)

---

## Décisions actives

| ADR | Décision |
|---|---|
| ADR-0001 | ELK complète MongoDB (Option B) — ES en lecture seule sur les mesures |
| ADR-0002 | CI/CD via self-hosted runner — 0 quota consommé, runner sur machine locale |
| ADR-0003 | GitFlow main/develop/feature — ownership mobile/ = coéquipier, backend_next/ = moi |

Détail dans `doc/adr/`.

---

## Roadmap (état macro)

```
[ ] Bloc 1 — Socle BDD local
[ ] Bloc 2 — Intégration Next.js API
[ ] Bloc 3 — Docker Compose + healthchecks
[ ] Bloc 4 — Coordination mobile/API
[ ] Bloc 5 — CI/CD self-hosted runner
[ ] Bloc 6 — Tests E2E
[ ] Bloc 7 — ELK dashboards [optionnel]
[ ] Bloc 8 — Déploiement serveur + CD automatisé
```

Détail complet dans `ROADMAP.md`.

---

## Reprendre une session (30 secondes)

1. Lire `doc/journal/SESSION-LOG.md` — dernière entrée
2. Champ **"Prochain démarrage"** = première action à faire
3. Coder
