import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as esbuild from "esbuild";
import { build } from "@elsy/builder";
import { netlifyPreset } from "@elsy/preset-netlify";

/**
 * Génère l'artefact Netlify réel (`netlify/functions/server.mjs`) à la
 * racine du repo, à partir de `netlifyPreset` (voir
 * `packages/presets/netlify`) via le Builder générique (voir
 * `packages/builder`), puis le bundle avec esbuild pour un déploiement
 * autonome — voir docs/decisions/005-netlify-bundling.md.
 *
 * Sans ce bundling, le fichier généré importe `@elsy/runtime` et
 * `@elsy/adapter-netlify` par leur nom de package : cette résolution
 * fonctionne en local (node_modules du monorepo présent), mais pas une
 * fois la function isolée et déployée par Netlify, qui ne suit pas les
 * liens symboliques pnpm pointant hors de `netlify/functions/`.
 *
 * Usage : `pnpm run generate:netlify` (après `pnpm -r run build`, pour que
 * @elsy/builder et @elsy/preset-netlify existent en dist/).
 */

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");

const result = await build({ preset: netlifyPreset, outDir: repoRoot });

for (const file of result.files) {
  await esbuild.build({
    entryPoints: [file],
    outfile: file,
    allowOverwrite: true,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node18",
  });
}

console.log(`[elsy] Preset "${netlifyPreset.name}" généré et bundlé :`);
for (const file of result.files) {
  console.log(`  - ${file}`);
}
