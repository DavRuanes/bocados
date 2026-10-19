import { test } from "node:test";
import assert from "node:assert/strict";
import { groqRequest, PLATE_PROMPT, LABEL_PROMPT, GROQ_MODEL } from "../src/api/groq.js";
import { usdaSearchUrl } from "../src/api/usda.js";
import { offProductUrl, cleanBarcode } from "../src/api/off.js";

test("groqRequest builds an OpenAI-style vision request with JSON output", () => {
  const r = groqRequest("KEY", PLATE_PROMPT, ["data:image/jpeg;base64,AAA"]);
  assert.equal(r.url, "https://api.groq.com/openai/v1/chat/completions");
  assert.equal(r.headers.Authorization, "Bearer KEY");
  assert.equal(r.body.model, GROQ_MODEL);
  assert.equal(GROQ_MODEL, "qwen/qwen3.8-27b");
  assert.deepEqual(r.body.response_format, { type: "json_object" });
  const content = r.body.messages[0].content;
  assert.equal(content[0].type, "text");
  assert.deepEqual(content[1], { type: "image_url", image_url: { url: "data:image/jpeg;base64,AAA" } });
});

test("groqRequest refuses more than 3 images and an empty key", () => {
  assert.throws(() => groqRequest("K", LABEL_PROMPT, ["a", "b", "c", "d"]), /3 fotos/);
  assert.throws(() => groqRequest("", PLATE_PROMPT, ["a"]), /clave/);
});

test("prompts ask for the fields the parsers read", () => {
  for (const f of ["legible", "motivo", "plato", "items", "nombre", "usda", "gramos", "kcal100", "confianza"]) assert.match(PLATE_PROMPT, new RegExp(f));
  for (const f of ["legible", "nombre", "kcal", "grasa", "sat", "hc", "azuc", "fibra", "prot", "sal"]) assert.match(LABEL_PROMPT, new RegExp(`"${f}"`));
});

test("usdaSearchUrl encodes the query and uses DEMO_KEY when no key is set", () => {
  const u = new URL(usdaSearchUrl("apple raw & skin", ""));
  assert.equal(u.origin + u.pathname, "https://api.nal.usda.gov/fdc/v1/foods/search");
  assert.equal(u.searchParams.get("query"), "apple raw & skin");
  assert.equal(u.searchParams.get("api_key"), "DEMO_KEY");
  assert.equal(u.searchParams.get("pageSize"), "5");
  assert.deepEqual(u.searchParams.getAll("dataType"), ["Foundation", "SR Legacy", "Survey (FNDDS)"]);
  assert.equal(new URL(usdaSearchUrl("x", " MYKEY ")).searchParams.get("api_key"), "MYKEY");
});

test("cleanBarcode keeps 8 to 14 digits only", () => {
  assert.equal(cleanBarcode(" 8410 0000-00017 "), "8410000000017");
  assert.equal(cleanBarcode("123"), null);
  assert.equal(cleanBarcode("../../etc"), null);
  assert.equal(cleanBarcode("123456789012345"), null);
});

test("offProductUrl asks only for the fields Bocado uses", () => {
  const u = new URL(offProductUrl("8410000000017"));
  assert.equal(u.origin + u.pathname, "https://world.openfoodfacts.org/api/v2/product/8410000000017");
  assert.equal(u.searchParams.get("fields"), "code,product_name,product_name_es,brands,nutriments");
});
