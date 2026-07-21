import type { Application } from "@elsy/core";
import type { ContractTestHarness, RunningInstance } from "@elsy/contract-tests";
import { serve } from "./adapter.js";

/**
 * Branche la suite commune de contract tests sur l'adapter Node réel
 * (via `serve()`, qui démarre un vrai `http.Server`).
 */
export const nodeHarness: ContractTestHarness = {
  name: "node",
  async start(app: Application): Promise<RunningInstance> {
    const server = serve(app);
    await new Promise<void>((resolve) => server.once("listening", resolve));

    const address = server.address();
    if (!address || typeof address !== "object") {
      throw new Error("adresse du serveur introuvable après démarrage");
    }

    return {
      baseUrl: `http://127.0.0.1:${address.port}`,
      stop() {
        return new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
      },
    };
  },
};
