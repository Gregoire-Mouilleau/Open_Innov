# CLAUDE.md archivé — version TP GitLab (2026-05-10)

Ce fichier est l'ancienne version du CLAUDE.md, orientée TP GitLab CI.
Remplacé par la version TechFarm complète.

---

## Mode de Travail - INSTRUCTIONS IMPORTANTES

### Règle fondamentale : Toujours procéder par étapes validées

Avant tout développement :
1. **Présenter le plan** : Lister toutes les étapes prévues numérotées
2. **Attendre le GO** avant de commencer
3. **Implémenter UNE seule étape** à la fois
4. **Résumer ce qui a été fait** à la fin de chaque étape
5. **Demander explicitement** : "Étape X terminée — on valide et on passe à l'étape suivante ?"
6. **Ne jamais enchaîner** sur l'étape suivante sans confirmation explicite

## État Actuel du Projet (au moment de l'archivage)
- **Version de l'app** : Next.js 16 (App Router)
- **Base de données** : MongoDB Atlas connectée
- **Pipeline actuel** : 3 stages (Lint, Typecheck, Build) fonctionnels.

## Étapes Validées (TPs)
- [x] TP1 : Socle technique et connexion MongoDB.
- [x] TP2 (Partie 1 & 2) : Création du `.gitlab-ci.yml` de base.
- [x] TP2 (Partie 3) : Dashboard Admin avec monitoring API GitLab.

## Décisions Techniques
- Runner local pour économiser les minutes GitLab.
- Cache `node_modules` via `package-lock.json` comme clé.
