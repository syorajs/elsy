# 000 — Outillage monorepo

> **Statut : remplacée par ADR 002 (migration vers pnpm workspaces).**
> Conservée telle quelle pour l'historique de la décision initiale.

## Contexte

Le projet est organisé en plusieurs packages interdépendants
(`core`, `runtime`, `adapters`, `presets`, `builder`, `vite`) avec des règles
de dépendance strictes (voir `ARCHITECTURE.md`). Un outil de gestion de
monorepo est nécessaire avant d'écrire la première ligne de code.

## Options étudiées

**A. pnpm workspaces.**
Rapide, gestion stricte des dépendances (évite les fuites de dépendances
transitives, ce qui est utile pour faire respecter les règles de dépendance
du graphe). Non disponible par défaut dans l'environnement de développement
actuel sans installation supplémentaire.

**B. npm workspaces.**
Disponible nativement (Node 22 / npm 10 déjà installés). Moins strict que
pnpm sur les dépendances fantômes, mais suffisant pour la taille actuelle du
projet (Phase 0–2 : un seul package `core`).

**C. Nx / Turborepo.**
Apportent du cache de build et de l'orchestration de tâches. Rejeté pour
l'instant : la règle de méthode ("préférer deux implémentations avant de
généraliser", `CONTRIBUTING.md`) s'applique aussi à l'outillage — pas de
justification concrète tant qu'il n'y a qu'un seul package.

## Décision

**npm workspaces.** Choix par défaut, pragmatique, sans dépendance externe.

## Conséquences

- Rien n'empêche de migrer vers pnpm plus tard si le nombre de packages ou
  les problèmes de dépendances fantômes le justifient concrètement — ce
  changement fera l'objet d'une nouvelle ADR le moment venu, pas d'une
  décision anticipée.
- Chaque nouveau package du monorepo doit être déclaré dans
  `package.json` → `workspaces`.
