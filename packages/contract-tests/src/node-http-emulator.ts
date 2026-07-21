import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse, Server } from "node:http";

/**
 * Émulateur HTTP local — réservé aux tests.
 *
 * Certaines plateformes (Netlify Functions v2, par exemple) fournissent
 * déjà un `Request` standard construit par leur propre infrastructure :
 * il n'existe donc, en production, aucun serveur HTTP Node à faire
 * tourner pour ces adapters — cette traduction est faite par la
 * plateforme, pas par notre code.
 *
 * Pour pouvoir malgré tout faire traverser une vraie requête HTTP à ces
 * adapters dans les contract tests (sans dépendre d'un outil externe type
 * `netlify dev`, hors du réseau autorisé de ce projet), cet utilitaire
 * démarre un vrai `http.Server` Node et traduit lui-même Request/Response
 * — un rôle que l'infrastructure réelle de la plateforme assure
 * normalement à la place de notre code.
 *
 * Important : ceci ne remplace pas une validation sur l'infrastructure
 * réelle de la plateforme cible (voir la note correspondante dans
 * ROADMAP.md, Phase 4).
 */
export function startNodeHttpEmulator(
  handler: (request: Request) => Promise<Response>
): Server {
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    void (async () => {
      const request = await toWebRequest(req);
      const response = await handler(request);
      await writeWebResponse(response, res);
    })();
  });
  server.listen(0);
  return server;
}

async function toWebRequest(req: IncomingMessage): Promise<Request> {
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
    body: (hasBody ? req : undefined) as unknown as BodyInit | undefined,
    duplex: hasBody ? "half" : undefined,
  } as RequestInit);
}

async function writeWebResponse(
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
