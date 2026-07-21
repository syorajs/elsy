import type { Application } from "@elsy/core";

/**
 * Fixtures partagées par la suite de contract tests. Écrites uniquement
 * contre `@elsy/core` — aucune ne doit jamais importer un adapter ou
 * connaître le nom d'une plateforme (INV-003).
 */

/** Renvoie toujours "Hello World" — sanity check minimal. */
export const helloWorldApp: Application = {
  async fetch() {
    return new Response("Hello World");
  },
};

/**
 * Renvoie en JSON tout ce que l'Application peut observer d'une requête
 * et de son RuntimeContext, pour vérifier que l'adapter transmet
 * fidèlement chaque information — sans jamais brancher de logique sur
 * `ctx.platform.name` (on se contente de vérifier qu'il est renseigné).
 */
export const echoApp: Application = {
  async fetch(request, ctx) {
    const url = new URL(request.url);
    const body = await request.text();
    return new Response(
      JSON.stringify({
        method: request.method,
        pathname: url.pathname,
        search: url.search,
        headerXTest: request.headers.get("x-elsy-test"),
        body,
        hasCtx: ctx !== undefined,
        envKnownVar: ctx?.env["ELSY_CONTRACT_TEST_VAR"] ?? null,
        platformNamePresent:
          typeof ctx?.platform.name === "string" && ctx.platform.name.length > 0,
        hasWaitUntil: typeof ctx?.waitUntil === "function",
      }),
      { headers: { "content-type": "application/json" } }
    );
  },
};

/** Renvoie un statut et des headers personnalisés. */
export const customStatusApp: Application = {
  async fetch() {
    return new Response("teapot", {
      status: 418,
      headers: { "x-elsy-custom-header": "present" },
    });
  },
};

/**
 * Utilise `ctx.waitUntil` pour une tâche différée, et vérifie (via une
 * variable partagée injectée par le test) que la réponse part avant que
 * la tâche différée ne soit terminée.
 */
export function createWaitUntilApp(onDeferredTaskDone: () => void): Application {
  return {
    async fetch(_request, ctx) {
      ctx?.waitUntil?.(
        new Promise<void>((resolve) => {
          setTimeout(() => {
            onDeferredTaskDone();
            resolve();
          }, 50);
        })
      );
      return new Response("responded before deferred task");
    },
  };
}
