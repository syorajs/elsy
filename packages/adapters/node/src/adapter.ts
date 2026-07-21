import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse, Server } from "node:http";
import type { Application, PlatformInfo, RuntimeContext } from "@elsy/core";

/**
 * Adapter Node — Phase 2.
 *
 * Traduit uniquement des objets. Aucune logique métier (INV-020), n'écrit
 * aucun fichier (INV-021), construit le RuntimeContext à partir des
 * primitives natives Node : ici `process.env` (INV-022).
 */

const platform: PlatformInfo = {
  name: "node",
  version: process.version,
};

/** Convertit une requête Node native en `Request` standard. */
export async function toWebRequest(req: IncomingMessage): Promise<Request> {
  const host = req.headers.host ?? "localhost";
  const url = new URL(req.url ?? "/", `http://${host}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else {
      headers.append(key, value);
    }
  }

  const method = req.method ?? "GET";
  const hasBody = method !== "GET" && method !== "HEAD";

  return new Request(url, {
    method,
    headers,
    // Node accepte un flux Node natif comme corps au runtime ; le typage
    // DOM standard de RequestInit ne le sait pas, d'où le passage par
    // `unknown` plutôt qu'un `@ts-expect-error` qui deviendrait faux dès
    // que le body est `undefined` (cas GET/HEAD).
    body: (hasBody ? req : undefined) as unknown as BodyInit | undefined,
    duplex: hasBody ? "half" : undefined,
  } as RequestInit);
}

/**
 * Construit le RuntimeContext à partir des primitives natives Node.
 * C'est la seule fonction du fichier qui a le droit de connaître `process`.
 */
export function toRuntimeContext(): RuntimeContext {
  return {
    env: { ...process.env },
    platform,
    waitUntil(promise: Promise<unknown>) {
      // Node n'a pas de concept natif de tâche différée après réponse
      // (contrairement à un runtime edge/worker) : on se contente de ne
      // pas laisser un rejet non géré planter le process.
      void promise.catch((error: unknown) => {
        console.error("[elsy][adapter-node] waitUntil task failed:", error);
      });
    },
  };
}

/** Écrit une `Response` standard vers un `ServerResponse` Node natif. */
export async function writeWebResponse(
  response: Response,
  res: ServerResponse
): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  if (!response.body) {
    res.end();
    return;
  }

  const reader = response.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  } finally {
    res.end();
  }
}

/**
 * Câble une `Application` sur un handler de requête Node natif.
 * Aucune logique métier : uniquement l'assemblage des trois fonctions
 * de traduction ci-dessus.
 */
export function createNodeHandler(
  app: Application
): (req: IncomingMessage, res: ServerResponse) => void {
  return (req, res) => {
    void (async () => {
      const request = await toWebRequest(req);
      const ctx = toRuntimeContext();
      const response = await app.fetch(request, ctx);
      await writeWebResponse(response, res);
    })();
  };
}

/**
 * Démarre un vrai serveur HTTP Node branché sur une `Application`.
 * C'est la seule fonction du projet qui appelle `listen()` — et c'est
 * volontaire : cette responsabilité appartient à l'Adapter, jamais au
 * Runtime (INV-010 concerne le Runtime, pas l'Adapter).
 */
export function serve(app: Application, options?: { port?: number }): Server {
  const handler = createNodeHandler(app);
  const server = createServer(handler);
  server.listen(options?.port ?? 0);
  return server;
}
