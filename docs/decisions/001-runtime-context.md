# 001 — RuntimeContext

## Contexte

Le contrat `Application.fetch(request: Request): Promise<Response>` ne permet pas
de transporter des informations spécifiques à une plateforme que le standard
`Request` ne porte pas nativement : bindings Cloudflare (KV, R2...), `context`
d'invocation AWS Lambda (deadline, request ID), variables d'environnement
Netlify, mécanismes de tâches différées type `waitUntil`.

Sans solution à ce problème, deux issues sont possibles à la Phase 4
(Cloudflare) :

1. L'application n'a jamais accès à ces informations — inacceptable pour la
   plupart des cas d'usage réels (accès à une base KV, par exemple).
2. Le contrat `Application` est modifié après coup pour absorber ce besoin —
   ce qui viole le critère "Done : runtime inchangé" de la Phase 4 et oblige à
   revalider tous les adapters déjà écrits.

Cette décision doit donc être prise en Phase 0, avant l'écriture du premier
adapter au-delà de Node.

## Options étudiées

**A. Ne rien ajouter au contrat.**
L'application reste volontairement incapable d'accéder à quoi que ce soit de
spécifique à la plateforme. Rejeté : trop restrictif, empêche des cas d'usage
courants (accès à une base de données bindée, lecture de variables d'env).

**B. Passer les informations via des variables globales / `globalThis`.**
Chaque adapter poserait ses données sur un objet global avant d'appeler
`fetch()`. Rejeté : viole l'invariant de testabilité et de non-effet-de-bord de
`core` ; rend le code non réentrant (problématique pour des runtimes qui
traitent des requêtes concurrentes, comme Cloudflare Workers).

**C. Ajouter un second paramètre optionnel standardisé `RuntimeContext`.**
Chaque adapter construit un objet `RuntimeContext` à partir des primitives
natives de sa plateforme, et le passe en second argument à `fetch()`.
Retenue.

## Décision

Le contrat devient :

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

- `ctx` est optionnel : un `Application.fetch()` valide au sens du contrat
  minimal peut toujours être appelé avec un seul argument (utile pour les
  tests unitaires simples, ou un usage hors plateforme).
- `env` est une forme normalisée, quel que soit le format natif de la
  plateforme (Cloudflare bindings, `process.env`, variables Netlify...).
  C'est l'**adapter** qui fait cette normalisation, jamais l'application.
- `platform` transporte des métadonnées non structurantes (nom, version...).
  L'application peut les logger, mais ne doit jamais s'en servir pour
  brancher sa logique (`if (ctx.platform === 'cloudflare')` est interdit —
  voir invariant correspondant dans `ARCHITECTURE.md`).
- `waitUntil` est optionnel : seules certaines plateformes (edge / workers)
  ont ce concept de tâche différée après la réponse envoyée.

## Conséquences

- Tout futur adapter doit construire un `RuntimeContext` conforme, testé par
  les contract tests (Phase 3).
- L'invariant "l'application ne connaît aucune plateforme" est préservé :
  `ctx` donne accès à des *données*, jamais à une branche de décision liée à
  une plateforme identifiée.
- Ce contrat est gelé à partir de la Phase 0. Toute évolution ultérieure de
  `RuntimeContext` (ajout de champ) doit faire l'objet d'une nouvelle ADR et
  être justifiée par un adapter réel qui en a besoin — pas de façon
  spéculative.
