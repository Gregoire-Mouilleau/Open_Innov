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
