# Architecture

## Vision

Le cœur de l'application est totalement indépendant de la plateforme.

```
   Platform
      │
      ▼
   Adapter
      │
      ▼
   Runtime
      │
      ▼
 Fetch Handler
      │
      ▼
 Application.fetch()
```

Une requête entre toujours par la plateforme. L'adapter la convertit en `Request`
standard, le runtime a préalablement assemblé l'`Application` en `Fetch Handler`,
et c'est ce handler qui reçoit la requête et produit la réponse.

## Contrats

```ts
interface Application {
  fetch(request: Request, ctx?: RuntimeContext): Promise<Response>;
}

interface RuntimeContext {
  env: Record<string, unknown>;
  platform: PlatformInfo;
  waitUntil?(promise: Promise<unknown>): void;
}
```

`ctx` transporte tout ce que le `Request` standard ne peut pas porter nativement
(bindings, variables d'environnement, tâches différées). Voir
`docs/decisions/001-runtime-context.md` pour le raisonnement complet.
L'application peut lire `ctx.env`, mais ne doit jamais faire de branchement sur
`ctx.platform` — voir invariants ci-dessous.

## Dépendances

```
core
├── contrats
├── types

runtime ───────► core
adapters ──────► core
presets ───────► runtime + adapters
builder ───────► presets   (le builder exécute un preset donné, pas le package entier)
vite ──────────► runtime + adapters   (dev uniquement, absent du build de production)
```

Depuis la Phase 5 (voir `docs/decisions/004-generic-preset-and-builder.md`),
"presets" et "builder" ci-dessus se décomposent concrètement ainsi :

```
preset (contrat déclaratif : Preset, PresetFile — aucune fonction)
builder ────────────────────► preset
preset-node, preset-netlify ─► runtime + adapters + preset
```

`builder` ne dépend que du contrat générique `@elsy/preset`, jamais d'un
package `@elsy/preset-*` concret — c'est le sens de la précision "le
builder exécute un preset donné, pas le package entier" : le `Preset` lui
est passé en argument par l'appelant, il n'est jamais importé en dur.

## Invariants

### Application

- Ne connaît aucune plateforme.
- Expose uniquement `fetch()`.
- Peut lire `ctx.env`, mais ne fait jamais de logique conditionnelle sur
  `ctx.platform` (aucun `if (ctx.platform === 'cloudflare')`).

### Runtime

- Ne fait jamais `listen()`.
- Produit une `Application`.
- Ne dépend d'aucun adapter.

### Adapter

- Convertit uniquement les objets.
- Aucune logique métier.
- Responsable de construire le `RuntimeContext` à partir des objets natifs de sa
  plateforme (bindings, `context` d'invocation, variables d'environnement).

### Preset

- Déclaratif.
- Décrit une plateforme.
- Ne contient pas la logique métier.

### Builder

- Orchestre uniquement.
- Ne connaît aucune plateforme en dur.

## Flux

Développement

```
Vite
 ↓
Fastify Adapter
 ↓
Runtime
 ↓
Application
```

Production

```
Platform
 ↓
Adapter
 ↓
Application
```
