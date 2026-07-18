import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the VulnTriage product and demo disclosure", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /VulnTriage DAO/);
  assert.match(html, /Security verdicts/);
  assert.match(html, /DEMO DATA/);
  assert.match(html, /No contract is connected/);
  assert.match(html, /NOT CONNECTED/);
  assert.match(html, /temporary persistence/);
  assert.match(html, /simulated transfers/);
  assert.doesNotMatch(html, /NOT DEPLOYED/);
  assert.doesNotMatch(html, /Live queue · synced/i);
  assert.doesNotMatch(html, /Pool locked ·/i);
  assert.doesNotMatch(html, /Appeal submitted/i);
});

test("source keeps contract actions fail-safe and fixture-labelled", async () => {
  const [page, adapter] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/genlayer.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Demo fixture/);
  assert.match(page, /Contract required/);
  assert.match(page, /disabled/);
  assert.match(page, /Consensus undetermined/);
  assert.match(page, /PROTOCOL APPEAL/);
  assert.match(page, /BUSINESS APPEAL/);
  assert.doesNotMatch(page, /0x[0-9a-fA-F]{40}/);

  assert.match(adapter, /\^0x\[0-9a-fA-F\]\{40\}\$/);
  assert.match(adapter, /accountsChanged/);
  assert.match(adapter, /chainChanged/);
});
