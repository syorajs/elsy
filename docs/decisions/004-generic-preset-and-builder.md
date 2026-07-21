# 004 — Builder générique et Preset déclaratif

## Contexte

Depuis la Phase 2, `@elsy/preset-node` expose une fonction impérative
(`generateNodeEntrypoint`) qui écrit elle-même un fichier sur disque. La
Phase 4 a reproduit exactement le même schéma pour
`@elsy/preset-netlify` (`generateNetlifyEntrypoint`) : câblage en dur
volontaire, documenté et assumé dans les deux packages, conformément à
`CONTRIBUTING.md` ("préférer deux implémentations avant de généraliser").

Avec ces deux exemples concrets désormais disponibles, la Roadmap prévoit
en Phase 5 un builder générique et des presets déclaratifs. Cette ADR fixe
la forme de cette généralisation, avant l'implémentation.

`ARCHITECTURE.md` fixe déjà, depuis la Phase 0, la direction de dépendance
attendue : `builder ───────► presets`, avec la précision "le builder
exécute un preset donné, pas le package entier". Les options ci-dessous
sont évaluées à l'aune de cette contrainte préexistante, pas en la
redécouvrant.

## Options étudiées

**A. Le Builder définit lui-même la forme `Preset`, sans package dédié.**
`@elsy/builder` exporterait à la fois le type `Preset` et la fonction
`build()`. Chaque package de preset concret (`preset-node`,
`preset-netlify`) dépendrait alors de `@elsy/builder` pour obtenir ce
type. Rejeté : inverse la direction de dépendance déjà actée dans
`ARCHITECTURE.md` (`builder → presets`, pas l'inverse) et couple chaque
preset concret à l'implémentation du builder alors qu'il n'a besoin que
du contrat.

**B. Le type `Preset` rejoint `@elsy/core`.**
`core` porte déjà le contrat gelé `Application`/`RuntimeContext` (ADR
001). Rejeté : `core` est scopé au contrat d'exécution
(comment une requête devient une réponse), pas au contrat de build
(comment un ensemble de fichiers est produit). Mélanger les deux dans un
même package gelé rendrait toute évolution future de l'un ou l'autre plus
difficile à isoler, et n'est justifié par aucun besoin concret constaté —
contraire à la méthode (`CONTRIBUTING.md`).

**C. Package `@elsy/preset` séparé, purement déclaratif ; `@elsy/builder`
en dépend.**
`@elsy/preset` ne contient que le contrat (`Preset`, `PresetFile`) :
aucune fonction, aucun accès disque. `@elsy/builder` en dépend et
implémente `build()`, la seule fonction du projet qui écrit les fichiers
d'un preset sur disque. Chaque preset concret
(`@elsy/preset-node`, `@elsy/preset-netlify`) dépend de `@elsy/preset`
pour le type, et de `@elsy/builder` uniquement en devDependency (pour ses
propres tests, qui doivent vérifier que le Preset produit un artefact
réellement exécutable). Retenue : correspond littéralement à la flèche
`builder → presets` déjà actée, garde chaque preset concret
déclaratif au sens strict (INV-030), et garde `@elsy/builder`
générique (INV-040) — vérifiable indépendamment de toute plateforme
réelle par un Preset fictif dans ses propres tests.

## Décision

Option C.

```
core
runtime ───────► core
adapters ──────► core
preset  (contrat déclaratif : Preset, PresetFile — aucune fonction)
builder ───────► preset
presets/node, presets/netlify ──► runtime + adapters + preset
                                   (+ builder en devDependency, pour leurs tests)
```

- `Preset.files` porte le chemin relatif *et* le contenu de chaque fichier
  à produire. Un preset qui a besoin d'une arborescence particulière
  (ex. `netlify/functions/<nom>.mjs` pour Netlify) l'exprime directement
  dans ce chemin — ce n'est plus une convention que l'appelant du Builder
  doit connaître et respecter.
- `build()` refuse tout chemin de fichier qui sortirait du `outDir` fourni
  (absolu, ou contenant `..`) : un `Preset` reste une donnée, et
  `@elsy/builder` ne lui fait pas une confiance aveugle du seul fait
  qu'elle respecte le type `Preset`.
- `generateNodeEntrypoint` et `generateNetlifyEntrypoint` sont supprimées ;
  `@elsy/preset-node` et `@elsy/preset-netlify` exportent désormais
  respectivement `nodePreset` et `netlifyPreset`, deux valeurs `Preset`
  statiques.

## Conséquences

- Aucun changement à `@elsy/core`, `@elsy/runtime`, aux deux adapters, ni
  à `@elsy/contract-tests` : les contrats gelés en Phase 0 et l'ADR 001 ne
  sont pas affectés par cette ADR.
- Les tests E2E existants de `preset-node` et `preset-netlify` (Phase 2 et
  Phase 4 — spawn d'un vrai process / import dynamique d'un vrai module,
  requête HTTP réelle) sont conservés à l'identique dans leur assertion
  finale ; seule leur façon d'obtenir le fichier généré change (`build()`
  au lieu de `generateXEntrypoint()`). C'est la vérification du critère
  "Done" de la Phase 5 ("les presets existants migrent... sans
  régression").
- Tout futur preset (Cloudflare, AWS... Phase 6) dépend de `@elsy/preset`
  pour son type et peut être construit par le même `@elsy/builder`, sans
  aucune modification de ce dernier.
