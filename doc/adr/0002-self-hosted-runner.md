# ADR-0002 — CI/CD via self-hosted runner (quota GitHub Actions)

**Date :** 2026-05-10
**Statut :** Accepté

## Contexte

GitHub Actions limite les pipelines à 2000 minutes/mois sur les repos privés (free tier).
Avec un pipeline web + mobile (lint, typecheck, build Expo), le quota serait atteint rapidement en phase de dev active.

## Décision

Utiliser un **runner auto-hébergé sur la machine locale** de développement.
Configuration : `runs-on: self-hosted` dans les workflows GitHub Actions.

## Raisons

- 0 minute consommée du quota GitHub : le runner tourne en local
- Setup en ~10 min via GitHub → Settings → Actions → Runners
- Pas de migration de plateforme (on reste sur GitHub)
- Pas de coût supplémentaire

## Contrainte acceptée

Le runner ne tourne que si la machine est allumée.
Convention d'équipe : les merges vers `develop` et `main` se font toujours depuis la machine du responsable infra (allumée).

## Évolution prévue

Quand le serveur de déploiement (Bloc 8) sera en place, le runner sera migré dessus pour une disponibilité H24.
