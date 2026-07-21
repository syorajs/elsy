import type { Application, PlatformInfo, RuntimeContext } from "@elsy/core";

/**
 * Adapter Netlify — Phase 4.
 *
 * Contrairement à l'adapter Node, il n'y a ici aucune traduction de
 * socket brut à faire : les Netlify Functions v2 reçoivent déjà un
 * `Request` standard, construit par l'infrastructure Netlify elle-même,
 * et attendent en retour un `Response` standard. Le rôle de cet adapter
 * se réduit donc à construire le `RuntimeContext` (INV-022) et à câbler
 * l'Application sur la forme de handler attendue par Netlify — aucune
 * logique métier (INV-020), aucune écriture de fichier (INV-021).
 *
 * Type minimal du Context Netlify Functions v2 nécessaire ici. On ne
 * dépend pas du package `@netlify/functions` pour garder ce fichier
 * indépendant d'une version particulière de leur SDK ; seul ce fichier a
 * le droit de connaître la forme réelle de ce contexte.
 */
export interface NetlifyContext {
  readonly [key: string]: unknown;
}

export type NetlifyHandler = (
  request: Request,
  context: NetlifyContext
) => Promise<Response>;

const platform: PlatformInfo = { name: "netlify" };

/**
 * Construit le RuntimeContext à partir de l'environnement Netlify.
 *
 * Limite documentée, volontairement non masquée : contrairement à un
 * runtime edge/worker (Cloudflare Workers, par exemple), les Netlify
 * Functions v2 "classiques" n'exposent pas de primitive native garantissant
 * la poursuite de l'exécution après l'envoi de la réponse. L'implémentation
 * ci-dessous ne bloque jamais la réponse (comportement vérifié par les
 * contract tests), mais ne garantit PAS l'achèvement de la tâche différée
 * en production réelle — l'environnement d'exécution peut être gelé dès
 * que le handler retourne. Si un cas d'usage réel en dépend, ce point
 * devra faire l'objet d'une ADR dédiée avant d'être considéré résolu.
 */
export function toRuntimeContext(): RuntimeContext {
  return {
    env: { ...process.env },
    platform,
    waitUntil(promise: Promise<unknown>) {
      void promise.catch((error: unknown) => {
        console.error("[elsy][adapter-netlify] waitUntil task failed:", error);
      });
    },
  };
}

/**
 * Câble une Application sur la forme de handler attendue par Netlify
 * Functions v2 : `(request, context) => Promise<Response>`.
 */
export function createNetlifyHandler(app: Application): NetlifyHandler {
  return async (request: Request, _context: NetlifyContext) => {
    const ctx = toRuntimeContext();
    return app.fetch(request, ctx);
  };
}
