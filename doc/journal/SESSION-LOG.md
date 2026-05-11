# Journal de sessions — TechFarm

Ordre antichronologique : la session la plus récente est toujours en haut.
Remplir en 5 min max à la fin de chaque session.

---

## Template (copier-coller en haut du fichier)

```
## AAAA-MM-JJ — Session N (Bloc X.Y — titre)
**Objectif visé :** [1 phrase]
**Fait :**
- 
- 
**Bloqué / pas fait :** [si applicable]
**Décision prise :** [lien ADR si créée]
**Prochain démarrage :** [exactement la 1re commande ou action à faire]
```

---

## 2026-05-11 — Session 2 (Bloc 2 complet — Intégration Next.js API)

**Objectif visé :** Connecter Next.js aux 3 services DB et valider via une route health.

**Fait :**
- Installation des clients DB : `pg`, `mongoose`, `minio` + `@types/pg`
- Création des modules singleton `lib/db/postgres.ts`, `lib/db/mongo.ts`, `lib/db/minio.ts` (cache `globalThis` pour le hot-reload dev)
- Route `GET /api/health` créée dans `app/api/health/route.ts`
- Test validé : `status: ok` avec Docker up, `status: degraded` avec Docker off

**Bloqué / pas fait :** Rien de bloquant.

**Décision prise :** Pattern singleton `globalThis` pour les connexions DB (standard Next.js dev HMR).

**Prochain démarrage :** Bloc 3 — Docker Compose + healthchecks : s'assurer que Next.js ne démarre qu'une fois les DB prêtes.

---

## 2026-05-10 — Session 1 (Bloc 1 complet — Socle BDD)

**Objectif visé :** Mettre en place toute la stack BDD locale opérationnelle.

**Fait :**
- Migration Express → Next.js 16 (App Router + Tailwind + TypeScript) dans `backend_next/`
- `docker-compose.dev.yml` : Postgres+TimescaleDB + MongoDB + MinIO liés à `backend_next/.env`
- `.env` généré avec credentials cryptographiques (hex + base64)
- 10 tables PostgreSQL créées + hypertable `mesure` TimescaleDB activée
- Seed complet : 2 companies, 5 farms, 15 parcelles, ~100 capteurs, ~294k mesures, 50 alertes Mongo, 50 prédictions IA, 5 photos MinIO
- `README.md` créé à la racine (installation + services + ports)
- Règle README intégrée dans CLAUDE.md (mise à jour obligatoire à chaque étape env)
- Coéquipier identifié : Gregoire (mobile/)
- ADRs créés : ELK Option B, self-hosted runner, stratégie Git

**Bloqué / pas fait :** Rien de bloquant.

**Décision prise :** MongoDB local Docker (au lieu d'Atlas), Next.js (au lieu d'Express) pour le panneau admin web.

**Prochain démarrage :** Bloc 2 — installer les clients DB dans Next.js (`pg`, `mongoose`, `minio`) et créer la route `/api/health` pour valider les connexions depuis le code Next.js.

---

## 2026-05-10 — Session 0 (Organisation & Architecture)

**Objectif visé :** Poser l'architecture, les décisions techniques et la feuille de route complète.

**Fait :**
- Décision ELK Option B validée (ADR-0001)
- Décision self-hosted runner validée (ADR-0002)
- Décision stratégie Git validée (ADR-0003)
- ROADMAP.md créé avec les 8 blocs
- CLAUDE.md mis à jour pour refléter le vrai projet TechFarm
- Structure doc/adr/ et doc/journal/ initialisée

**Bloqué / pas fait :** Aucun blocage. ELK reste optionnel selon disponibilité.

**Décision prise :** ADR-0001, ADR-0002, ADR-0003

**Prochain démarrage :** Bloc 2 — installer les clients DB dans Next.js (`pg`, `mongoose`, `minio`) et créer la route `/api/health` pour valider les connexions.
