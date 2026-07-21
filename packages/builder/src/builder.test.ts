import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Preset } from "@elsy/preset";
import { build } from "./builder.js";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", ".builder-test-output");

/**
 * Preset volontairement fictif — le Builder doit rester générique et
 * testable sans connaître Node, Netlify, ni aucune plateforme réelle
 * (INV-040). C'est la preuve que "builder → presets" dans
 * ARCHITECTURE.md désigne une dépendance au contrat générique
 * `@elsy/preset`, jamais à un package `@elsy/preset-*` concret.
 */
const fakePreset: Preset = {
  name: "fake-platform",
  files: [
    { path: "entry.mjs", contents: "export default 1;\n" },
    { path: "nested/dir/config.json", contents: '{"ok":true}\n' },
  ],
};

test("écrit chaque fichier du Preset à l'emplacement attendu, avec son contenu exact", async () => {
  await rm(outDir, { recursive: true, force: true });
  try {
    const result = await build({ preset: fakePreset, outDir });

    assert.equal(result.files.length, 2);

    const entryContents = await readFile(join(outDir, "entry.mjs"), "utf8");
    assert.equal(entryContents, "export default 1;\n");

    const nestedContents = await readFile(
      join(outDir, "nested", "dir", "config.json"),
      "utf8"
    );
    assert.equal(nestedContents, '{"ok":true}\n');
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test("crée les sous-dossiers manquants avant d'écrire", async () => {
  await rm(outDir, { recursive: true, force: true });
  try {
    await build({
      preset: {
        name: "fake-platform",
        files: [{ path: "a/b/c/deep.txt", contents: "deep\n" }],
      },
      outDir,
    });

    const contents = await readFile(join(outDir, "a", "b", "c", "deep.txt"), "utf8");
    assert.equal(contents, "deep\n");
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test("refuse un chemin de fichier qui sortirait de outDir", async () => {
  await rm(outDir, { recursive: true, force: true });
  try {
    await assert.rejects(
      () =>
        build({
          preset: {
            name: "fake-platform",
            files: [{ path: "../escape.txt", contents: "nope\n" }],
          },
          outDir,
        }),
      /hors de outDir/
    );
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});

test("refuse un chemin de fichier absolu", async () => {
  await rm(outDir, { recursive: true, force: true });
  try {
    await assert.rejects(
      () =>
        build({
          preset: {
            name: "fake-platform",
            files: [{ path: "/etc/passwd", contents: "nope\n" }],
          },
          outDir,
        }),
      /absolu non autorisé/
    );
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});
