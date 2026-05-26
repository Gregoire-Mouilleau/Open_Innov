# ADR-0003 — Stratégie Git et ownership dossiers (collaboration 2 devs)

**Date :** 2026-05-10
**Statut :** Accepté

## Contexte

Le projet est développé par deux personnes :
- Développeur 1 (Rudolph) : Next.js API routes, BDD, seed, Docker, déploiement
- Développeur 2 (Gregoire) : Application mobile Expo (`mobile/`)

## Décision

### Branches
- `main` → production, protégée, merge via PR + approbation des deux
- `develop` → intégration, protégée, merge via PR
- `feature/backend-*` → branches de Rudolph
- `feature/mobile-*` → branches du coéquipier
- `feature/infra-*` → branches partagées (docker, CI/CD, déploiement)

### Ownership des dossiers
| Dossier | Propriétaire | Règle |
|---|---|---|
| `mobile/` | Coéquipier | PR reviewée par Rudolph avant merge develop |
| `backend_next/` | Rudolph | PR reviewée par coéquipier avant merge develop |
| `docker-compose*.yml` | Partagé | PR avec approbation des deux |
| `.github/workflows/` | Partagé | PR avec approbation des deux |
| `doc/` | Partagé | Libre contribution |

### Convention de commits
Format : `type(scope): message`
- Scopes : `backend`, `mobile`, `infra`, `ci`, `db`
- Exemple : `feat(backend): add /parcelles endpoint`

### CI/CD conditionnel
Les jobs CI se déclenchent uniquement si les fichiers du scope ont changé :
- `lint:backend` → trigger sur `backend_next/**`
- `lint:mobile` → trigger sur `mobile/**`
- `test:e2e` → trigger uniquement sur PR vers `develop` et `main`

## Raisons

- Évite les conflits sur des zones que chacun ne touche pas
- La revue croisée garantit que l'API et le mobile restent compatibles
- Les jobs CI conditionnels évitent d'attendre un build inutile
