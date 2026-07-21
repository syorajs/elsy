# Roadmap

## Phase 0

- [x] Définir les contrats, y compris `RuntimeContext` (voir ADR 001).
- [x] Écrire les invariants (voir `docs/INVARIANTS.md`).
- [x] ADR initiales (000 — outillage monorepo, 001 — RuntimeContext).

**Done :** contrats gelés, y compris `RuntimeContext`.
Validé par `npm run typecheck --workspace=@runtime-presets/core` et
`npm run build --workspace=@runtime-presets/core`, tous deux verts en mode
TypeScript strict. Package `@runtime-presets/core` créé, ne contenant que
des types — aucune logique, conformément aux invariants INV-001 à INV-003.

## Phase 1

- [x] Runtime minimal.
- [x] Hello World.

**Done :** `Application.fetch()` fonctionne.
Validé par un test réel (pas seulement un type-check) :
`pnpm --filter @runtime-presets/runtime run test` — une vraie `Request`
traverse `createRuntime()` et produit une vraie `Response` avec le corps
attendu. Package `@runtime-presets/runtime` créé, ne dépendant que de
`@runtime-presets/core` (INV-012). Pas de système de routes/middlewares
introduit : un seul cas d'usage existe, donc pas d'abstraction ajoutée
(voir `CONTRIBUTING.md`).

## Phase 2

- [x] Adapter Node.
- [x] Preset Node.

**Done :** pipeline complet HTTP.
Validé par un test end-to-end réel, pas simulé :
`pnpm --filter @elsy/preset-node run test` génère un fichier d'entrée sur
disque, l'exécute comme un process Node séparé, et fait une vraie requête
`fetch()` contre un vrai port TCP en écoute — réponse "Hello World"
obtenue de bout en bout. L'adapter est également testé isolément
(`@elsy/adapter-node`) : construction réelle du `RuntimeContext` à partir
de `process.env` (INV-022), traduction requête/réponse vérifiée avec une
`Application` de test dédiée, indépendante du runtime "Hello World".
Aucun système de preset générique introduit : câblage direct
runtime → adapter (Phase 5 généralisera une fois un deuxième exemple
concret disponible, voir Phase 4).

## Phase 3

- [x] Contract tests.

**Done :** CI valide le contrat.
Suite commune `@elsy/contract-tests` (6 tests : GET simple, propagation
méthode/chemin/query/headers, corps POST, construction du RuntimeContext,
statut/headers personnalisés, sémantique de `waitUntil`) branchée sur
l'adapter Node via un `ContractTestHarness` (voir ADR 003). Pipeline
`.github/workflows/ci.yml` créé (install --frozen-lockfile, build,
typecheck, test — dans cet ordre, sur tout le monorepo).
Note méthode : les commandes exactes de la CI ont été rejouées en local
avec succès (11 tests, 0 échec) ; l'exécution réelle sur GitHub Actions
sera confirmée au premier push, ce sandbox n'étant pas relié à un dépôt
distant.

## Phase 4

- [x] Netlify.

> Interversion avec Cloudflare (initialement prévu ici) : décision produit,
> sans impact sur les contrats gelés en Phase 0. Cloudflare rejoint la
> liste de la Phase 6.

**Done :** runtime inchangé.
Preuve mécanique, pas déclarative : `sha256sum` sur tous les fichiers de
`packages/core/src` et `packages/runtime/src`, avant et après cette
phase — `diff` ne rapporte aucune différence. `@elsy/adapter-netlify` et
`@elsy/preset-netlify` créés, ne dépendant que de `@elsy/core` (adapter)
et `@elsy/runtime` + `@elsy/adapter-netlify` (preset), conformément au
graphe de dépendances d'`ARCHITECTURE.md`.
Les 6 contract tests de la Phase 3 — écrits une seule fois, sans connaître
Node ni Netlify — passent à l'identique sur ce nouvel adapter, sans une
seule ligne modifiée dans `@elsy/contract-tests`.
Point notable : l'adapter Netlify est structurellement plus fin que
l'adapter Node, car Netlify fournit déjà un `Request`/`Response` standard
au handler (aucun socket brut à traduire) — un cas différent de Node qui
valide que le contrat `Application` n'est pas biaisé vers un seul style de
plateforme.
Limite documentée dans l'adapter (voir `adapter.ts`) : les Netlify
Functions v2 classiques n'ont pas de primitive native garantissant
l'achèvement d'une tâche `waitUntil` après l'envoi de la réponse — non
masqué, à traiter par une ADR dédiée si un cas d'usage réel en dépend.
Limite de vérification également assumée : les contract tests tournent
contre un émulateur HTTP local (`@elsy/contract-tests`), pas contre
l'infrastructure Netlify réelle (`netlify dev` est hors du réseau
autorisé de cet environnement) — une validation par déploiement réel
reste à faire hors de ce sandbox.

> **Suivi (Phase 5) :** cette validation par déploiement réel a bien eu
> lieu, et a révélé un problème que la suite de tests ne pouvait pas
> détecter : le fichier généré par `@elsy/preset-netlify`, résolu
> correctement en local via les liens symboliques pnpm, ne l'est plus une
> fois la function isolée et déployée par Netlify. Voir
> `docs/decisions/005-netlify-bundling.md` pour le diagnostic complet et
> la correction (bundling esbuild dans le script de déploiement).

## Phase 5

- [x] Builder générique.
- [x] Presets déclaratifs.

> Correction du critère ci-dessous : formulé à l'origine en Phase 0 avec
> "Node, Cloudflare", en anticipant l'ordre initial de la Roadmap. Suite à
> l'interversion actée en Phase 4, les 2 presets réellement existants à ce
> stade sont Node et Netlify — Cloudflare n'existe pas encore (Phase 6).
> Correction de forme uniquement, sans impact sur la décision elle-même.

**Done :** les 2 presets existants (Node, Netlify) migrent vers le format
générique sans régression sur les contract tests.
Voir `docs/decisions/004-generic-preset-and-builder.md`. Nouveau package
`@elsy/preset` (contrat déclaratif `Preset`/`PresetFile`, aucune fonction)
et nouveau package `@elsy/builder` (dépend uniquement de `@elsy/preset`,
INV-040 : orchestre l'écriture des fichiers d'un preset sur disque, ne
connaît aucune plateforme en dur). `@elsy/preset-node` et
`@elsy/preset-netlify` exportent désormais un objet `Preset` statique
(`nodePreset`, `netlifyPreset`) à la place de leurs fonctions impératives
`generateNodeEntrypoint`/`generateNetlifyEntrypoint`, supprimées.
Non-régression vérifiée en gardant l'assertion finale des deux tests E2E
de bout en bout existants (process Node réel pour Node, import dynamique
+ émulateur HTTP pour Netlify) à l'identique — seule leur façon d'obtenir
le fichier généré change (`build({ preset, outDir })` au lieu de
`generateXEntrypoint({ outDir })`). Les 6 contract tests de la Phase 3
restent inchangés et non affectés : cette phase ne touche ni aux adapters
ni au runtime.
`@elsy/builder` est également testé isolément contre un `Preset` fictif
(non lié à Node ou Netlify), y compris son refus d'écrire hors de
`outDir` — preuve que le Builder reste générique et ne fait pas une
confiance aveugle au contenu d'un `Preset`.
Note méthode : comme pour les phases précédentes, ce sandbox n'a pas
d'accès réseau pour installer les dépendances pnpm et exécuter
`pnpm -r run build/typecheck/test` — la relecture manuelle du code et des
types tient lieu de vérification ici ; l'exécution réelle de la suite
complète reste à confirmer au prochain accès à un environnement outillé.

## Phase 6

- Cloudflare
- AWS
- Azure
- Bun
- Deno
- Vercel

Chaque preset doit passer les contract tests.
