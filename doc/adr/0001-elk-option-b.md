# ADR-0001 — Elasticsearch complète MongoDB (Option B)

**Date :** 2026-05-10
**Statut :** Accepté

## Contexte

TechFarm utilise PostgreSQL+TimescaleDB pour les mesures IoT et MongoDB pour les alertes/prédictions IA.
La question était de savoir si ELK (Elasticsearch + Kibana) devait remplacer une des BDD existantes ou s'y ajouter.

Trois options évaluées :
- **Option A** : ELK remplace MongoDB
- **Option B** : ELK complète MongoDB (lecture/dashboards uniquement)
- **Option C** : ELK remplace TimescaleDB

## Décision

**Option B retenue.** Elasticsearch est ajouté en couche de lecture passive, sans remplacer aucune BDD existante.

## Raisons

1. **TimescaleDB est imbattable sur le timeseries IoT** : compression native, agrégats continus, FK relationnelles vers Company→Farm→Parcelle. Remplacer par ES (Option C) casse la cohérence relationnelle.
2. **MongoDB reste le bon outil pour l'IA** : les `predictions_ia` ont un schéma qui mute à chaque nouveau modèle. ES impose un mapping rigide, contre-productif en R&D.
3. **Kibana = livrable visuel pour la soutenance** sans coder de dashboard.
4. **ELK est optionnel** : si manque de temps, on coupe ELK sans impact sur le reste.

## Conséquences

- 4 services dans `docker-compose.yml` : postgres+timescale, mongo, minio, elasticsearch+kibana
- Un script d'indexation périodique Postgres→ES (cron ou worker Next.js)
- Les API routes Next.js continuent de taper Postgres+Mongo directement
- ELK ne reçoit que des copies en lecture, jamais en écriture depuis l'app
