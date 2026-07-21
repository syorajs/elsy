/**
 * Ce fichier n'est pas un test au sens habituel : il n'y a rien à exécuter
 * ici. Son seul rôle est de type-checker (`tsc --noEmit`) pour prouver que
 * le contrat gelé dans contracts.ts est réellement utilisable tel quel,
 * avant même l'existence d'un Runtime ou d'un Adapter.
 *
 * Si ce fichier ne compile plus après une modification de contracts.ts,
 * c'est un signal fort que le contrat a changé de forme — et donc qu'une
 * ADR est probablement nécessaire.
 */
import type { Application, RuntimeContext } from "../contracts.js";

// 1. Un fetch() minimal, sans ctx, doit type-checker (ctx est optionnel).
const minimal: Application = {
  async fetch(_request: Request): Promise<Response> {
    return new Response("ok");
  },
};

// 2. Un fetch() qui lit ctx.env doit type-checker, sans jamais avoir besoin
//    de connaître le nom de la plateforme (INV-003 : pas de branchement
//    sur ctx.platform).
const readsEnv: Application = {
  async fetch(_request: Request, ctx?: RuntimeContext): Promise<Response> {
    const greeting = ctx?.env["GREETING"] ?? "hello";
    return new Response(String(greeting));
  },
};

// 3. Un adapter fictif doit pouvoir construire un RuntimeContext valide
//    sans que core ne connaisse la plateforme d'origine (Node ici, à
//    titre d'exemple uniquement — core ne dépend jamais de Node).
const fakeAdapterContext: RuntimeContext = {
  env: { GREETING: "bonjour" },
  platform: { name: "example-platform", version: "0.0.0" },
  waitUntil(promise) {
    void promise;
  },
};

// Empêche le linter "variable non utilisée" de râler ; l'existence même
// de ces objets bien typés est le test.
void minimal;
void readsEnv;
void fakeAdapterContext;
