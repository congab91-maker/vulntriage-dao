import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function renderedHome() {
  return readFile(new URL("../.next/server/app/index.html", import.meta.url), "utf8");
}

test("production build renders the real Studionet product shell", async () => {
  const html = await renderedHome();
  assert.match(html, /VulnTriage/);
  assert.match(html, /Security verdicts/);
  assert.match(html, /LIVE STUDIONET CONTRACT/);
  assert.match(html, /reads enabled/);
  assert.match(html, /Submit public evidence/);
  assert.match(html, /Programs/);
  assert.match(html, /native transfers are simulated/);
});

test("production UI contains no fixture success path or unsupported claim", async () => {
  const [html, page, adapter] = await Promise.all([
    renderedHome(),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/genlayer.ts", import.meta.url), "utf8"),
  ]);
  const content = `${html}\n${page}`;
  assert.doesNotMatch(content, /fixture/i);
  assert.doesNotMatch(content, /bias-free/i);
  assert.doesNotMatch(content, /Appeal submitted/i);
  assert.doesNotMatch(content, /Pool locked/i);
  assert.match(adapter, /readContractSnapshot/);
  assert.match(adapter, /writeContract/);
  assert.match(adapter, /monitorTransaction/);
  assert.match(adapter, /FINALIZED/);
  assert.match(adapter, /execution_result/);
});
