import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { build } from "@elsy/builder";
import { nodePreset } from "./preset.js";

const here = dirname(fileURLToPath(import.meta.url));
// Sortie à l'intérieur du package (et non dans /tmp) pour que la
// résolution de modules Node retrouve node_modules/@elsy/* posés par
// pnpm à la racine de ce package.
const outDir = join(here, "..", ".preset-output");

test("le point d'entrée généré sert une vraie requête HTTP de bout en bout", async () => {
  await rm(outDir, { recursive: true, force: true });
  const result = await build({ preset: nodePreset, outDir });
  const [entryPath] = result.files;
  assert.ok(entryPath, "le Builder doit avoir écrit au moins un fichier");

  const child = spawn(process.execPath, [entryPath], {
    env: { ...process.env, PORT: "0" },
    stdio: ["ignore", "pipe", "inherit"],
  });

  const port = await new Promise<number>((resolve, reject) => {
    const rl = createInterface({ input: child.stdout });
    const timeout = setTimeout(() => {
      reject(new Error("timeout en attendant que le serveur démarre"));
    }, 5000);

    rl.on("line", (line) => {
      const match = /listening on (\d+)/.exec(line);
      if (match?.[1]) {
        clearTimeout(timeout);
        rl.close();
        resolve(Number(match[1]));
      }
    });

    child.on("error", reject);
  });

  try {
    const response = await fetch(`http://127.0.0.1:${port}/`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.equal(body, "Hello World");
  } finally {
    child.kill();
    await rm(outDir, { recursive: true, force: true });
  }
});
