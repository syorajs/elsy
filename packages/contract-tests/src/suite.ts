import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { ContractTestHarness, RunningInstance } from "./harness.js";
import {
  helloWorldApp,
  echoApp,
  customStatusApp,
  createWaitUntilApp,
} from "./fixtures.js";

/**
 * Enregistre la suite commune de contract tests contre un harness donné.
 * Un adapter appelle cette fonction depuis son propre fichier de test
 * (`contract.test.ts`) en lui passant son implémentation de
 * `ContractTestHarness`. La suite elle-même n'est jamais dupliquée.
 *
 * Voir docs/decisions/003-contract-test-harness.md.
 */
export function registerContractTests(harness: ContractTestHarness): void {
  describe(`contract tests — ${harness.name}`, () => {
    let instance: RunningInstance | undefined;

    async function withApp<T>(
      app: Parameters<ContractTestHarness["start"]>[0],
      run: (baseUrl: string) => Promise<T>
    ): Promise<T> {
      instance = await harness.start(app);
      try {
        return await run(instance.baseUrl);
      } finally {
        await instance.stop();
        instance = undefined;
      }
    }

    test("répond correctement à une requête GET simple", async () => {
      await withApp(helloWorldApp, async (baseUrl) => {
        const response = await fetch(baseUrl);
        assert.equal(response.status, 200);
        assert.equal(await response.text(), "Hello World");
      });
    });

    test("transmet fidèlement méthode, chemin, query et headers", async () => {
      await withApp(echoApp, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/items?sort=asc`, {
          headers: { "x-elsy-test": "present" },
        });
        const parsed = (await response.json()) as {
          method: string;
          pathname: string;
          search: string;
          headerXTest: string | null;
        };
        assert.equal(parsed.method, "GET");
        assert.equal(parsed.pathname, "/items");
        assert.equal(parsed.search, "?sort=asc");
        assert.equal(parsed.headerXTest, "present");
      });
    });

    test("transmet le corps d'une requête POST", async () => {
      await withApp(echoApp, async (baseUrl) => {
        const response = await fetch(baseUrl, {
          method: "POST",
          body: "hello from contract test",
        });
        const parsed = (await response.json()) as { method: string; body: string };
        assert.equal(parsed.method, "POST");
        assert.equal(parsed.body, "hello from contract test");
      });
    });

    test("construit un RuntimeContext conforme (env, platform, waitUntil)", async () => {
      process.env["ELSY_CONTRACT_TEST_VAR"] = "contract-value";
      try {
        await withApp(echoApp, async (baseUrl) => {
          const response = await fetch(baseUrl);
          const parsed = (await response.json()) as {
            hasCtx: boolean;
            envKnownVar: string | null;
            platformNamePresent: boolean;
            hasWaitUntil: boolean;
          };
          assert.equal(parsed.hasCtx, true);
          assert.equal(parsed.envKnownVar, "contract-value");
          assert.equal(
            parsed.platformNamePresent,
            true,
            "ctx.platform.name doit être une chaîne non vide (INV manque sinon)"
          );
          assert.equal(parsed.hasWaitUntil, true);
        });
      } finally {
        delete process.env["ELSY_CONTRACT_TEST_VAR"];
      }
    });

    test("propage un statut et des headers personnalisés", async () => {
      await withApp(customStatusApp, async (baseUrl) => {
        const response = await fetch(baseUrl);
        assert.equal(response.status, 418);
        assert.equal(response.headers.get("x-elsy-custom-header"), "present");
        assert.equal(await response.text(), "teapot");
      });
    });

    test("la réponse part avant que waitUntil n'ait terminé sa tâche différée", async () => {
      let deferredTaskDone = false;
      const app = createWaitUntilApp(() => {
        deferredTaskDone = true;
      });

      await withApp(app, async (baseUrl) => {
        const response = await fetch(baseUrl);
        const body = await response.text();

        assert.equal(body, "responded before deferred task");
        assert.equal(
          deferredTaskDone,
          false,
          "la tâche différée ne doit pas encore être terminée à ce stade"
        );

        // Laisse le temps à la tâche différée de se terminer avant de
        // fermer le harness, pour ne pas la couper en plein vol.
        await new Promise((resolve) => setTimeout(resolve, 100));
        assert.equal(deferredTaskDone, true);
      });
    });
  });
}
