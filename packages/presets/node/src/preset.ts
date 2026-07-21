import type { Preset } from "@elsy/preset";

/**
 * Preset Node — migré en Phase 5 vers le format déclaratif générique.
 *
 * Jusqu'en Phase 4, ce package exposait une fonction impérative
 * (`generateNodeEntrypoint`) qui écrivait elle-même le fichier sur disque
 * — un câblage en dur assumé tant qu'un seul exemple concret (Node)
 * existait (voir CONTRIBUTING.md : "préférer deux implémentations avant
 * de généraliser"). Avec Netlify (Phase 4) comme second exemple, la
 * généralisation en Preset déclaratif + Builder générique devient
 * justifiée par du concret, pas de la spéculation — voir
 * docs/decisions/004-generic-preset-and-builder.md.
 *
 * `nodePreset` ne fait plus qu'exposer une donnée : *quoi* générer
 * (INV-030). C'est `@elsy/builder` qui décide *comment* l'écrire sur
 * disque — ce fichier n'importe plus `node:fs`.
 * Aucune logique métier applicative ici (INV-031).
 */

const ENTRYPOINT_TEMPLATE = `import { createRuntime } from "@elsy/runtime";
import { serve } from "@elsy/adapter-node";

const app = createRuntime();
const port = Number(process.env.PORT ?? 0);
const server = serve(app, { port });

server.on("listening", () => {
  const address = server.address();
  if (address && typeof address === "object") {
    console.log(\`listening on \${address.port}\`);
  }
});
`;

/** Preset déclaratif décrivant le point d'entrée Node exécutable. */
export const nodePreset: Preset = {
  name: "node",
  files: [{ path: "server.mjs", contents: ENTRYPOINT_TEMPLATE }],
};
