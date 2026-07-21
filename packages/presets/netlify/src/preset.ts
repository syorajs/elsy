import type { Preset } from "@elsy/preset";

/**
 * Preset Netlify — migré en Phase 5 vers le format déclaratif générique.
 *
 * Voir docs/decisions/004-generic-preset-and-builder.md pour le
 * raisonnement de la migration, et le preset Node (`@elsy/preset-node`)
 * pour le premier exemple équivalent.
 *
 * Différence notable avec la version impérative (Phase 4) : le chemin
 * attendu par Netlify pour ses functions v2
 * (`netlify/functions/<nom>.mjs`) est maintenant porté par le `path` du
 * `PresetFile` lui-même, plutôt que d'être une convention que l'appelant
 * devait connaître et respecter en construisant son `outDir`
 * (`join(outDir, "netlify", "functions")`, comme avant Phase 5). C'est le
 * Preset — qui connaît sa plateforme — qui porte cette spécificité, pas
 * l'appelant du Builder (INV-040 : le Builder reste générique).
 *
 * INV-030 : donnée déclarative uniquement. INV-031 : aucune logique
 * métier applicative.
 */

const ENTRYPOINT_TEMPLATE = `import { createRuntime } from "@elsy/runtime";
import { createNetlifyHandler } from "@elsy/adapter-netlify";

const app = createRuntime();

export default createNetlifyHandler(app);
`;

/** Preset déclaratif décrivant la fonction Netlify à générer. */
export const netlifyPreset: Preset = {
  name: "netlify",
  files: [
    { path: "netlify/functions/server.mjs", contents: ENTRYPOINT_TEMPLATE },
  ],
};
