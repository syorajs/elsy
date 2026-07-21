# elsy

> Build once. Deploy anywhere.

Elsy (anciennement "Runtime Presets") est un moteur de génération de presets permettant d'exécuter une même application sur plusieurs plateformes (Node.js, Netlify, Cloudflare, AWS, Azure, Bun, Deno...) à partir d'un contrat unique basé sur le Fetch API.

## Contrat principal

```ts
interface Application {
  fetch(request: Request, ctx?: RuntimeContext): Promise<Response>;
}
```

Voir `docs/ARCHITECTURE.md` pour le détail de `RuntimeContext`.

## Objectifs

- Runtime indépendant des plateformes.
- Presets déclaratifs.
- Adapters dédiés à la conversion des objets natifs.
- Builder générique.
- Basé sur les standards WinterCG.

## Documentation

- docs/GLOSSARY.md
- docs/ARCHITECTURE.md
- docs/ROADMAP.md
- CONTRIBUTING.md

## Tester le Hello World sur Netlify (conditions réelles)

Prérequis : Node.js ≥ 18, un compte Netlify, [Netlify CLI](https://docs.netlify.com/cli/get-started/).

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm -r run build
pnpm run generate:netlify   # écrit netlify/functions/server.mjs à partir de @elsy/preset-netlify
```

`generate:netlify` exécute `@elsy/builder` sur `netlifyPreset`
(`packages/presets/netlify`) — voir `scripts/generate-netlify-function.mjs`.
Le fichier généré n'est pas versionné (`.gitignore`) : `netlify.toml`
régénère cet artefact à chaque build, sur Netlify comme en local.

**En local, avec l'émulateur Netlify réel (pas le nôtre) :**

```sh
netlify dev
curl http://localhost:8888/.netlify/functions/server
# → Hello World
```

**Déploiement réel :**

```sh
netlify login
netlify link      # ou `netlify init` pour créer un nouveau site
netlify deploy --prod
curl https://<votre-site>.netlify.app/.netlify/functions/server
# → Hello World
```

Ceci referme le point resté ouvert en Phase 4 (`ROADMAP.md`) : jusqu'ici,
seuls les contract tests contre un émulateur HTTP local avaient validé
l'adapter Netlify — pas l'infrastructure Netlify réelle.
