import { test } from "node:test";
import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import type { Application } from "@elsy/core";
import { serve, toRuntimeContext } from "./adapter.js";

test("toRuntimeContext() construit un contexte conforme à partir de process.env", () => {
  process.env["ELSY_TEST_VAR"] = "test-value";
  const ctx = toRuntimeContext();

  assert.equal(ctx.env["ELSY_TEST_VAR"], "test-value");
  assert.equal(ctx.platform.name, "node");
  assert.equal(typeof ctx.waitUntil, "function");

  delete process.env["ELSY_TEST_VAR"];
});

test("l'adapter Node fait traverser une vraie requête HTTP jusqu'à l'Application, avec ctx", async () => {
  // Application de test dédiée : vérifie que l'adapter transmet bien
  // méthode, URL et RuntimeContext, sans jamais connaître "node" lui-même.
  const app: Application = {
    async fetch(request, ctx) {
      const platformName = ctx?.platform.name ?? "unknown";
      return new Response(
        JSON.stringify({
          method: request.method,
          pathname: new URL(request.url).pathname,
          platform: platformName,
        }),
        { headers: { "content-type": "application/json" } }
      );
    },
  };

  const server = serve(app);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address !== "object") {
    throw new Error("adresse du serveur de test introuvable");
  }
  const port = address.port;

  const body = await new Promise<string>((resolve, reject) => {
    const req = httpRequest(
      { host: "127.0.0.1", port, path: "/hello?x=1", method: "GET" },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => (data += chunk.toString()));
        res.on("end", () => resolve(data));
      }
    );
    req.on("error", reject);
    req.end();
  });

  server.close();

  const parsed = JSON.parse(body) as {
    method: string;
    pathname: string;
    platform: string;
  };
  assert.equal(parsed.method, "GET");
  assert.equal(parsed.pathname, "/hello");
  assert.equal(parsed.platform, "node");
});
