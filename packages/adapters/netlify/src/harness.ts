import type { Application } from "@elsy/core";
import type { ContractTestHarness, RunningInstance } from "@elsy/contract-tests";
import { startNodeHttpEmulator } from "@elsy/contract-tests";
import { createNetlifyHandler } from "./adapter.js";

/**
 * Branche la suite commune de contract tests sur l'adapter Netlify, via
 * l'émulateur HTTP local de `@elsy/contract-tests`.
 *
 * Précision honnête : ceci teste que `createNetlifyHandler` respecte le
 * contrat `Application` face à une vraie requête HTTP. Ce n'est PAS un
 * test contre l'infrastructure Netlify réelle (routing, geo context,
 * limites de timeout...) — voir ROADMAP.md, Phase 4.
 */
export const netlifyHarness: ContractTestHarness = {
  name: "netlify (via émulateur HTTP local)",
  async start(app: Application): Promise<RunningInstance> {
    const handler = createNetlifyHandler(app);
    const server = startNodeHttpEmulator((request) => handler(request, {}));
    await new Promise<void>((resolve) => server.once("listening", resolve));

    const address = server.address();
    if (!address || typeof address !== "object") {
      throw new Error("adresse du serveur d'émulation introuvable");
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
