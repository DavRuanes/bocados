import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { fetchJson, ApiError } from "../src/api/http.js";
import { getProduct } from "../src/api/off.js";

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });
const respond = (status, body) => { globalThis.fetch = async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status }); };

test("fetchJson maps HTTP statuses to error kinds with Spanish messages", async () => {
  for (const [status, kind] of [[401, "auth"], [403, "auth"], [429, "limit"], [404, "notfound"], [500, "server"]]) {
    respond(status, {});
    await assert.rejects(fetchJson("https://x", {}, "USDA"), (e) => e instanceof ApiError && e.kind === kind && /USDA/.test(e.message));
  }
});

test("fetchJson reports network failures and unreadable bodies", async () => {
  globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
  await assert.rejects(fetchJson("https://x", {}, "Groq"), (e) => e.kind === "network" && /internet/.test(e.message));
  respond(200, "<html>no json</html>");
  await assert.rejects(fetchJson("https://x", {}, "Groq"), (e) => e.kind === "bad");
});

test("fetchJson returns parsed JSON on success", async () => {
  respond(200, { ok: 1 });
  assert.deepEqual(await fetchJson("https://x"), { ok: 1 });
});

test("getProduct treats a 404 as not found and keeps the code", async () => {
  respond(404, { status: 0 });
  assert.deepEqual(await getProduct("8410000000017"), { found: false, code: "8410000000017" });
});

test("getProduct rejects an invalid code without calling the network", async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; return new Response("{}"); };
  await assert.rejects(getProduct("12"), (e) => e.kind === "bad");
  assert.equal(called, false);
});
