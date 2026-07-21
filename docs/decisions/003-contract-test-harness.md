# 003 — Harness de contract tests

## Contexte

Chaque adapter (Node aujourd'hui, Cloudflare/AWS/etc. plus tard) doit
garantir le même comportement observable pour une `Application` donnée :
mêmes headers propagés, même corps de requête transmis, même
`RuntimeContext` correctement construit. Sans suite de tests partagée,
cette équivalence ne peut être vérifiée qu'à l'œil, adapter par adapter,
ce qui ne tient pas dans la durée (Phase 6 prévoit 6 presets
supplémentaires).

## Décision

Un nouveau package `@elsy/contract-tests` expose :

- des **fixtures** : des `Application` de test génériques, écrites
  uniquement contre `@elsy/core`, sans connaissance de plateforme ;
- un contrat **`ContractTestHarness`** que chaque adapter doit implémenter
  pour brancher ses propres fixtures sur la suite commune ;
- une fonction **`registerContractTests(harness)`** qui enregistre la
  suite de tests (`node:test`) contre ce harness.

```ts
interface ContractTestHarness {
  start(app: Application): Promise<{ baseUrl: string; stop(): Promise<void> | void }>;
}
```

Chaque adapter écrit un fichier `contract.test.ts` de quelques lignes qui
fournit son propre harness (ex. `serve()` pour Node) et appelle
`registerContractTests(harness)`. La suite elle-même n'est jamais dupliquée.

## Conséquences

- `@elsy/contract-tests` dépend uniquement de `@elsy/core` — jamais d'un
  adapter, pour rester réutilisable par tous.
- Toute évolution du contrat `Application`/`RuntimeContext` (nouvelle ADR)
  doit se traduire par une mise à jour de cette suite, qui devient alors le
  point de vérification central du contrat.
- Un adapter qui ne fait pas passer cette suite n'est pas considéré comme
  terminé, quelle que soit la Phase de la roadmap concernée.
