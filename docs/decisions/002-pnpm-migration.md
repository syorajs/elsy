# 002 — Migration vers pnpm workspaces

## Contexte

L'ADR 000 avait retenu npm workspaces par défaut, pnpm n'étant pas
disponible sans étape d'installation supplémentaire dans l'environnement de
développement au moment de la Phase 0. Ce choix était explicitement
qualifié de pragmatique et réversible.

Décision prise (hors implémentation) : utiliser pnpm comme outil définitif
de gestion du monorepo.

## Options réévaluées

pnpm est en réalité disponible nativement via `corepack` (fourni avec
Node.js ≥ 16.13), sans installation externe — l'indisponibilité constatée
en Phase 0 était donc une fausse contrainte, pas une limite réelle de
l'environnement.

pnpm apporte, par rapport à npm workspaces :

- une résolution stricte des dépendances (pas de dépendances "fantômes"
  accessibles par accident), ce qui aide à faire respecter mécaniquement
  le graphe de dépendances défini dans `ARCHITECTURE.md` ;
- un store de paquets partagé, plus rapide sur un monorepo qui va grossir
  au fil des Phases 4 à 6 (plusieurs presets/adapters).

## Décision

pnpm workspaces remplace npm workspaces comme outil de gestion du
monorepo, à partir de la Phase 1.

## Conséquences

- `package.json` (racine) : suppression du champ `workspaces`.
- Ajout de `pnpm-workspace.yaml` à la racine.
- `package-lock.json` supprimé, remplacé par `pnpm-lock.yaml`.
- Les scripts d'orchestration (`npm run build --workspaces`) sont réécrits
  avec la syntaxe `pnpm -r` / `pnpm --filter`.
- Aucun impact sur les contrats gelés en Phase 0 (`packages/core`) : ce
  changement est purement outillage, il ne touche ni `core`, ni les
  invariants, ni l'ADR 001.
