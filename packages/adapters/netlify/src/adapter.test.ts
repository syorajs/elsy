import { test } from "node:test";
import assert from "node:assert/strict";
import { toRuntimeContext, createNetlifyHandler } from "./adapter.js";
import type { Application } from "@elsy/core";

test("toRuntimeContext() construit un contexte conforme, platform.name = 'netlify'", () => {
  process.env["ELSY_NETLIFY_TEST_VAR"] = "test-value";
  const ctx = toRuntimeContext();

  assert.equal(ctx.env["ELSY_NETLIFY_TEST_VAR"], "test-value");
  assert.equal(ctx.platform.name, "netlify");
  assert.equal(typeof ctx.waitUntil, "function");

  delete process.env["ELSY_NETLIFY_TEST_VAR"];
});

test("createNetlifyHandler() ne traduit rien : le Request/Response passe tel quel", async () => {
  // Vérifie qu'aucune transformation n'est appliquée en chemin, contrairement
  // à l'adapter Node — c'est la différence structurelle entre les deux.
  const app: Application = {
    async fetch(request) {
      return new Response(`echo:${request.method}`);
    },
  };

  const handler = createNetlifyHandler(app);
  const request = new Request("https://example.netlify.app/hello", {
    method: "POST",
  });

  const response = await handler(request, {});
  assert.equal(await response.text(), "echo:POST");
});
