import assert from "node:assert/strict";
import test from "node:test";
import {
  STUDIONET,
  isWalletAddress,
  parseChainId,
} from "../app/lib/genlayer.ts";

test("accepts only nonzero 20-byte hexadecimal wallet addresses", () => {
  assert.equal(isWalletAddress(`0x${"1".repeat(40)}`), true);
  assert.equal(isWalletAddress(`0x${"0".repeat(40)}`), false);
  assert.equal(isWalletAddress("test"), false);
  assert.equal(isWalletAddress("0x1234"), false);
  assert.equal(isWalletAddress(null), false);
});

test("normalizes hexadecimal and decimal chain IDs", () => {
  assert.equal(parseChainId("0xf22f"), STUDIONET.chainId);
  assert.equal(parseChainId("61999"), STUDIONET.chainId);
  assert.equal(parseChainId(61999), STUDIONET.chainId);
  assert.equal(parseChainId("wrong"), null);
});
