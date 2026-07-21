import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import { mkdir, copyFile, rm } from "node:fs/promises";
import * as esbuild from "esbuild";
import { build } from "@elsy/builder";
import { netlifyPreset } from "@elsy/preset-netlify";

/**
 * Génère l'artefact Netlify réel (`netlify/functions/server.mjs`), à
 * partir de `netlifyPreset` (voir `packages/presets/netlify`) via le
 * Builder générique (voir `packages/builder`), puis le bundle avec
 * esbuild pour un déploiement autonome — voir
 * docs/decisions/005-netlify-bundling.md.
 *
 * Sans ce bundling, le fichier généré importe `@elsy/runtime` et
 * `@elsy/adapter-netlify` par leur nom de package : cette résolution
 * fonctionne en local (node_modules du monorepo présent), mais pas une
 * fois la function isolée et déployée par Netlify, qui ne suit pas les
 * liens symboliques pnpm pointant hors de `netlify/functions/`.
 *
 * Où générer + bundler (important) : pnpm résout les dépendances de
 * façon stricte (ADR 002 — pas de dépendances "fantômes"). `@elsy/runtime`
 * et `@elsy/adapter-netlify` sont des `dependencies` de
 * `@elsy/preset-netlify`, donc pnpm ne les rend visibles que dans
 * `packages/presets/netlify/node_modules` — jamais à la racine du
 * monorepo, qui ne les déclare pas. Il faut donc générer et bundler le
 * fichier là où cette résolution existe (`packages/presets/netlify/`),
 * puis déplacer le résultat — devenu autonome, sans plus aucun import
 * `@elsy/*` — vers l'emplacement attendu par Netlify (`netlify.toml` :
 * `functions.directory = "netlify/functions"`, à la racine du repo).
 *
 * Usage : `pnpm run generate:netlify` (après `pnpm -r run build`, pour que
 * @elsy/builder et @elsy/preset-netlify existent en dist/).
 */

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");

const presetNetlifyDir = join(repoRoot, "packages", "presets", "netlify");
const scratchDir = join(presetNetlifyDir, ".netlify-build");

const result = await build({ preset: netlifyPreset, outDir: scratchDir });

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

// Le fichier est maintenant autonome : on le déplace de l'emplacement de
// travail (où la résolution pnpm fonctionnait) vers l'emplacement final
// attendu par Netlify.
const finalFiles = [];
for (const file of result.files) {
  const relativePath = relative(scratchDir, file);
  const destination = join(repoRoot, relativePath);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(file, destination);
  finalFiles.push(destination);
}

await rm(scratchDir, { recursive: true, force: true });

console.log(`[elsy] Preset "${netlifyPreset.name}" généré et bundlé :`);
for (const file of finalFiles) {
  console.log(`  - ${file}`);
}
