import { test } from "node:test";
import assert from "node:assert/strict";
import { isStoreCode, productKey } from "../src/core/products.js";

test("store codes are EAN-13 with prefix 02 or 20-29, and UPC-A starting with 2", () => {
  assert.equal(isStoreCode("2215310002820"), true);
  assert.equal(isStoreCode("2000000000017"), true);
  assert.equal(isStoreCode("0212345678905"), true);
  assert.equal(isStoreCode("212345678905"), true); // UPC-A number system 2
  assert.equal(isStoreCode("8410000000017"), false);
  assert.equal(isStoreCode("0123456789012"), false);
  assert.equal(isStoreCode("12345678"), false);
});

test("productKey uses the whole code, or the first 7 digits for store codes", () => {
  assert.deepEqual(productKey("8410000000017"), { key: "8410000000017", store: false });
  assert.deepEqual(productKey("2215310002820"), { key: "S:2215310", store: true });
  assert.deepEqual(productKey("2215310009999"), { key: "S:2215310", store: true });
});

test("12-digit store codes use the first 6 digits (the 7th is often a price check digit)", () => {
  assert.deepEqual(productKey("212345678905"), { key: "S:212345", store: true });
  assert.deepEqual(productKey("212345978906"), { key: "S:212345", store: true });
});
