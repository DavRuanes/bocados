import { test } from "node:test";
import assert from "node:assert/strict";
import { parseOffProduct, parseUsdaSearch, parseGroqJson, normalizePlate, normalizeLabel } from "../src/core/parse.js";

test("parseOffProduct reads name, brand and per-100 g nutriments", () => {
  const r = parseOffProduct({
    status: 1,
    code: "8410000000017",
    product: {
      product_name: "Pechuga de pollo fileteada",
      brands: "Marca, Otra",
      nutriments: {
        "energy-kcal_100g": 110, fat_100g: "1.5", "saturated-fat_100g": 0.4, carbohydrates_100g: 0,
        sugars_100g: 0, fiber_100g: null, proteins_100g: 23, salt_100g: 0.15,
      },
    },
  });
  assert.equal(r.found, true);
  assert.equal(r.name, "Pechuga de pollo fileteada");
  assert.equal(r.brand, "Marca");
  assert.equal(r.code, "8410000000017");
  assert.deepEqual(r.per100, { kcal: 110, grasa: 1.5, sat: 0.4, hc: 0, azuc: 0, fibra: null, prot: 23, sal: 0.15 });
});

test("parseOffProduct converts kJ when kcal is missing", () => {
  const r = parseOffProduct({ status: 1, product: { product_name: "X", nutriments: { energy_100g: 418.4 } } });
  assert.equal(r.per100.kcal, 100);
});

test("parseOffProduct reports a missing product", () => {
  assert.equal(parseOffProduct({ status: 0, status_verbose: "product not found" }).found, false);
  assert.equal(parseOffProduct(null).found, false);
});

test("parseOffProduct keeps hostile names as plain text", () => {
  const r = parseOffProduct({ status: 1, product: { product_name: "<img src=x onerror=alert(1)>", nutriments: {} } });
  assert.equal(r.name, "<img src=x onerror=alert(1)>"); // escaped at render time, never parsed as HTML
  assert.equal(r.per100.kcal, null);
});

test("parseUsdaSearch reads kcal and macros from the first food", () => {
  const r = parseUsdaSearch({
    foods: [{
      fdcId: 171688, description: "Apples, raw, with skin", dataType: "SR Legacy",
      foodNutrients: [
        { nutrientNumber: "208", nutrientName: "Energy", unitName: "KCAL", value: 52 },
        { nutrientNumber: "203", nutrientName: "Protein", unitName: "G", value: 0.26 },
        { nutrientNumber: "205", unitName: "G", value: 13.81 },
        { nutrientNumber: "204", unitName: "G", value: 0.17 },
      ],
    }],
  });
  assert.deepEqual(r, { fdcId: 171688, description: "Apples, raw, with skin", per100: { kcal: 52, prot: 0.26, hc: 13.81, grasa: 0.17 } });
});

test("parseUsdaSearch accepts the documented abridged shape and kJ energy", () => {
  const r = parseUsdaSearch({
    foods: [{
      fdcId: 1, description: "Rice, cooked",
      foodNutrients: [
        { number: 268, unitName: "kJ", amount: 543.9 },
        { number: 203, unitName: "g", amount: 2.7 },
      ],
    }],
  });
  assert.equal(r.per100.kcal, 130);
  assert.equal(r.per100.prot, 2.7);
  assert.equal(r.per100.hc, null);
});

test("parseUsdaSearch prefers Atwater kcal when 208 is missing", () => {
  const r = parseUsdaSearch({ foods: [{ fdcId: 2, description: "Egg", foodNutrients: [{ nutrientNumber: "958", unitName: "KCAL", value: 148 }] }] });
  assert.equal(r.per100.kcal, 148);
});

test("parseUsdaSearch skips foods without energy and returns null when nothing fits", () => {
  assert.equal(parseUsdaSearch({ foods: [] }), null);
  assert.equal(parseUsdaSearch({}), null);
  const r = parseUsdaSearch({ foods: [
    { fdcId: 1, description: "no energy", foodNutrients: [{ nutrientNumber: "203", unitName: "G", value: 1 }] },
    { fdcId: 2, description: "ok", foodNutrients: [{ nutrientNumber: "208", unitName: "KCAL", value: 77 }] },
  ] });
  assert.equal(r.fdcId, 2);
});

test("parseGroqJson reads a JSON object even with prose or fences around it", () => {
  assert.deepEqual(parseGroqJson('{"a":1}'), { a: 1 });
  assert.deepEqual(parseGroqJson('Aquí tienes:\n```json\n{"a":2}\n```'), { a: 2 });
  assert.deepEqual(parseGroqJson('Resultado: {"a":3} fin'), { a: 3 });
  assert.equal(parseGroqJson("no hay json"), null);
  assert.equal(parseGroqJson(""), null);
});

test("normalizePlate cleans items and keeps an unreadable verdict", () => {
  assert.deepEqual(normalizePlate({ legible: false, motivo: "Foto borrosa" }), { legible: false, reason: "Foto borrosa", items: [] });
  const r = normalizePlate({
    legible: true, plato: "Macarrones con tomate",
    items: [
      { nombre: "Macarrones con tomate", usda: "pasta with tomato sauce", gramos: "250", kcal100: 150, prot100: 5, hc100: 26, grasa100: 3, confianza: "media" },
      { nombre: "", gramos: 50 },
      { nombre: "Manzana", usda: "apple raw", gramos: -3, kcal100: "52" },
    ],
  });
  assert.equal(r.legible, true);
  assert.equal(r.dish, "Macarrones con tomate");
  assert.equal(r.items.length, 2);
  assert.deepEqual(r.items[0], { name: "Macarrones con tomate", query: "pasta with tomato sauce", grams: 250, estimate: { kcal: 150, prot: 5, hc: 26, grasa: 3 }, confidence: "media" });
  assert.equal(r.items[1].grams, 0);
  assert.equal(r.items[1].estimate.kcal, 52);
  assert.equal(r.items[1].estimate.prot, null);
});

test("normalizePlate treats an empty item list as unreadable", () => {
  assert.equal(normalizePlate({ legible: true, items: [] }).legible, false);
  assert.equal(normalizePlate(null).legible, false);
});

test("normalizeLabel keeps only numbers it can read", () => {
  const r = normalizeLabel({ legible: true, nombre: "Yogur", kcal: "61", grasa: null, prot: 3.4, sal: "n/a" });
  assert.equal(r.legible, true);
  assert.equal(r.name, "Yogur");
  assert.deepEqual(r.per100, { kcal: 61, grasa: null, sat: null, hc: null, azuc: null, fibra: null, prot: 3.4, sal: null });
  assert.equal(normalizeLabel({ legible: false, motivo: "Reflejos" }).reason, "Reflejos");
});

test("parseGroqJson finds the JSON object even when the prose before it has braces", () => {
  assert.deepEqual(parseGroqJson('Uso {formato} libre. Resultado: {"legible": true, "items": [{"nombre": "Pan"}]} gracias'), { legible: true, items: [{ nombre: "Pan" }] });
  assert.deepEqual(parseGroqJson('{"texto": "llaves } dentro"}'), { texto: "llaves } dentro" });
});
