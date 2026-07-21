import type { Application, RuntimeContext } from "@elsy/core";

/**
 * Runtime minimal — Phase 1.
 *
 * Portée volontairement réduite : produire une `Application` valide qui
 * répond "Hello World", rien de plus. Pas de système de routes, pas de
 * middlewares, pas de SSR : ces besoins n'existent pas encore concrètement
 * (un seul cas d'usage à ce stade), donc pas d'abstraction pour eux —
 * conformément à CONTRIBUTING.md ("ne jamais ajouter une abstraction sans
 * besoin concret").
 *
 * Respecte :
 * - INV-010 : ne fait jamais de `listen()`.
 * - INV-011 : produit une `Application` (donc un `FetchHandler`), jamais
 *   une réponse HTTP directement au moment de la construction.
 * - INV-012 : ne dépend d'aucun `Adapter`. Seul `@elsy/core`
 *   est importé.
 */
export function createRuntime(): Application {
  return {
    async fetch(_request: Request, _ctx?: RuntimeContext): Promise<Response> {
      return new Response("Hello World");
    },
  };
}
