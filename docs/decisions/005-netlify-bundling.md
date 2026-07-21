# 005 — Bundling de l'artefact Netlify pour le déploiement réel

## Contexte

La Phase 4 avait explicitement documenté une limite de vérification :
les contract tests ne tournent que contre un émulateur HTTP local
(`@elsy/contract-tests`), jamais contre l'infrastructure Netlify réelle,
et qu'"une validation par déploiement réel reste à faire hors de ce
sandbox" (voir `ROADMAP.md`, Phase 4).

Cette validation réelle (Phase 5, déploiement effectif sur Netlify) a
révélé une erreur absente de toute la suite de tests existante :

```
Cannot find package '@elsy/runtime' imported from /var/task/server.mjs
```

`netlifyPreset` (`@elsy/preset-netlify`) génère un fichier qui importe
`@elsy/runtime` et `@elsy/adapter-netlify` par leur nom de package,
résolu par Node via `node_modules` — ce que pnpm fournit sous forme de
liens symboliques pointant vers `packages/runtime` et
`packages/adapters/netlify`, *hors* de `node_modules`. Le bundler de
Netlify (zip-it-and-ship-it) empaquette la function pour son exécution
isolée dans l'environnement Lambda sous-jacent (`/var/task`), et ne suit
pas ces liens symboliques vers des dossiers extérieurs au périmètre
qu'il embarque — les deux packages restent donc introuvables une fois
déployés, alors qu'ils existaient bien en local.

Aucun test existant ne pouvait détecter ce problème : les tests E2E de
`@elsy/preset-netlify` (Phase 4/5) importent dynamiquement le fichier
généré *depuis l'intérieur du monorepo*, où la résolution Node standard
fonctionne — la même raison, exactement, pour laquelle ce problème avait
échappé à la Phase 4.

## Options étudiées

**A. Ne rien changer, documenter la limite comme non résolue.**
Rejeté : rend le hello world Netlify inutilisable en pratique, alors que
c'est le but concret recherché.

**B. Committer `node_modules` (avec les symlinks pnpm) dans le dépôt
déployé.**
Rejeté : fragile (dépend de la structure interne du store pnpm, qui peut
changer de version en version), alourdit considérablement le dépôt, et
ne règle rien pour un futur adapter avec les mêmes contraintes (AWS
Lambda a une limite de taille de paquet stricte).

**C. Générer directement un fichier autonome (bundlé) depuis le Preset
lui-même.**
`netlifyPreset` produirait déjà du code inliné, sans import de
`@elsy/runtime`/`@elsy/adapter-netlify`. Rejeté à ce stade : viole
INV-030 (un Preset décrit *quoi* générer, il ne devrait pas dupliquer le
code source d'autres packages à la main) et casserait la seule source de
vérité du contenu de ces packages.

**D. Bundler l'artefact généré avec esbuild, en aval du Builder, dans le
script de déploiement (`scripts/generate-netlify-function.mjs`).**
Le `Preset` et le `Builder` restent inchangés et génériques. Après
`build()`, le script de déploiement passe le fichier obtenu à travers
esbuild (`bundle: true`, `platform: "node"`) et réécrit le même fichier
avec un contenu autonome — sans plus aucun import vers un package du
workspace. Retenue.

## Décision

Option D. Un déploiement destiné à une plateforme qui isole
l'exécution de la function (Netlify aujourd'hui ; probablement AWS
Lambda en Phase 6) a besoin d'un artefact autonome ; un déploiement Node
classique (`@elsy/preset-node`) n'en a pas besoin, puisqu'il s'exécute
dans le contexte du monorepo où `node_modules` est disponible tel quel.
Cette différence est donc traitée comme une responsabilité du
**script de déploiement**, pas du `Preset` ni du `Builder`
(`CONTRIBUTING.md` : "préférer deux implémentations avant de
généraliser" — le Preset Node n'a pas ce besoin, donc pas d'abstraction
de bundling ajoutée à `@elsy/builder` pour l'instant).

`esbuild` devient une devDependency de la racine du monorepo (outillage
de déploiement, pas une dépendance des packages publiés).

## Conséquences

- Aucun changement à `@elsy/core`, `@elsy/runtime`, aux adapters, à
  `@elsy/preset`, `@elsy/builder`, ni aux Presets eux-mêmes : les
  contrats gelés ne sont pas affectés.
- `scripts/generate-netlify-function.mjs` bundle désormais chaque fichier
  produit par `build()` avec esbuild, en place.
- Si un futur preset serverless (AWS Lambda, Cloudflare Workers en
  Phase 6) rencontre le même besoin, ce sera le deuxième cas concret
  justifiant, cette fois, de généraliser le bundling dans
  `@elsy/builder` lui-même plutôt que de le dupliquer dans chaque script
  de déploiement — pas avant.
- Limite encore ouverte, assumée : ce bundling n'a lui-même été vérifié
  que par ce déploiement réel ponctuel, pas par un test automatisé dans
  la suite du monorepo (un test qui inspecterait le fichier bundlé et
  vérifierait l'absence de tout import `@elsy/*` serait la suite logique,
  non implémentée à ce stade).
