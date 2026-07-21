import { test } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { startNodeHttpEmulator } from "@elsy/contract-tests";
import { build } from "@elsy/builder";
import { netlifyPreset } from "./preset.js";

const here = dirname(fileURLToPath(import.meta.url));
// Contrairement à la version impérative (Phase 4), le sous-dossier
// "netlify/functions" n'est plus une convention imposée à l'appelant :
// il fait partie du `path` déclaré par `netlifyPreset` lui-même.
const baseOutDir = join(here, "..", ".preset-output");

test("le fichier de fonction Netlify généré sert une vraie requête HTTP de bout en bout", async () => {
  await rm(baseOutDir, { recursive: true, force: true });
  const result = await build({ preset: netlifyPreset, outDir: baseOutDir });
  const [entryPath] = result.files;
  assert.ok(entryPath, "le Builder doit avoir écrit au moins un fichier");

  // Import dynamique du fichier fraîchement écrit sur disque — preuve que
  // ce que le preset génère est un module réellement exécutable, pas
  // seulement une chaîne de caractères qui ressemble à du code.
  const mod = (await import(entryPath)) as {
    default: (request: Request, context: Record<string, unknown>) => Promise<Response>;
  };

  const server = startNodeHttpEmulator((request) => mod.default(request, {}));
  await new Promise<void>((resolve) => server.once("listening", resolve));

  const address = server.address();
  if (!address || typeof address !== "object") {
    throw new Error("adresse du serveur d'émulation introuvable");
  }

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/`);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "Hello World");
  } finally {
    server.close();
    await rm(baseOutDir, { recursive: true, force: true });
  }
});
