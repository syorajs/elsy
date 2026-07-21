import { test } from "node:test";
import assert from "node:assert/strict";
import { createRuntime } from "./runtime.js";

test("Application.fetch() répond Hello World à une requête réelle", async () => {
  const app = createRuntime();
  const request = new Request("http://localhost/");

  const response = await app.fetch(request);
  const body = await response.text();

  assert.equal(body, "Hello World");
});

test("Application.fetch() fonctionne sans RuntimeContext (ctx optionnel)", async () => {
  const app = createRuntime();
  const request = new Request("http://localhost/");

  // Appel volontairement sans second argument : le contrat de core.ts
  // garantit que ctx est optionnel (voir contracts.ts).
  const response = await app.fetch(request);

  assert.equal(response.status, 200);
});
