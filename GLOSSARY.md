# Glossaire

## Application
Objet exposant `fetch(Request, RuntimeContext?): Promise<Response>`.
C'est la forme "objet" du **Fetch Handler** (voir plus bas) : les deux désignent
le même contrat, sous deux formes équivalentes (objet vs fonction).

## Runtime
Assemble routes, middlewares et SSR afin de produire une `Application`.

## Adapter
Convertit les objets natifs d'une plateforme vers `Request`/`Response`.

## Preset
Description déclarative d'une plateforme cible (fichiers, entrées, configuration).

## Builder
Orchestrateur exécutant un preset afin de produire les artefacts finaux.

## Contrat
Interface stable entre deux composants.

## Invariant
Règle architecturale qui ne doit jamais être violée.

## Platform
Environnement cible : Node, Netlify, Cloudflare, AWS...

## Fetch Handler
Fonction `(request: Request, ctx?: RuntimeContext) => Promise<Response>`.
Forme "fonction" du contrat `Application` (voir plus haut) — les deux sont
interchangeables selon le contexte d'usage.

## RuntimeContext
Objet transportant ce que le `Request` standard ne peut pas porter nativement :
variables d'environnement, bindings spécifiques à une plateforme, tâches
différées (`waitUntil`). Construit par l'**Adapter**, lu par l'**Application**
sans jamais servir à distinguer une plateforme d'une autre dans la logique
métier. Voir `docs/decisions/001-runtime-context.md`.
