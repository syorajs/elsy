import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { build } from "@elsy/builder";
import { netlifyPreset } from "@elsy/preset-netlify";

/**
 * Génère l'artefact Netlify réel (`netlify/functions/server.mjs`) à la
 * racine du repo, à partir de `netlifyPreset` (voir
 * `packages/presets/netlify`) via le Builder générique (voir
 * `packages/builder`).
 *
 * Ce script est le seul endroit du repo qui choisit *où* déployer un
 * Preset donné (ici : la racine du repo, pour que Netlify retrouve
 * `netlify/functions/` à l'endroit attendu par défaut). Le Preset et le
 * Builder eux-mêmes restent génériques — voir
 * docs/decisions/004-generic-preset-and-builder.md.
 *
 * Usage : `pnpm run generate:netlify` (après `pnpm -r run build`, pour que
 * @elsy/builder et @elsy/preset-netlify existent en dist/).
 */

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");

const result = await build({ preset: netlifyPreset, outDir: repoRoot });

console.log(`[elsy] Preset "${netlifyPreset.name}" généré :`);
for (const file of result.files) {
  console.log(`  - ${file}`);
}
