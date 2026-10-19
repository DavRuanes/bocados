import { test } from "node:test";
import assert from "node:assert/strict";
import { resolvePlate, entryFromItem } from "../src/core/plate.js";

const plate = {
  legible: true, dish: "Pollo con patatas",
  items: [
    { name: "Pechuga a la plancha", query: "chicken breast grilled", grams: 150, estimate: { kcal: 165, prot: 31, hc: 0, grasa: 3.6 }, confidence: "alta" },
    { name: "Patatas fritas", query: "french fries", grams: 120, estimate: { kcal: 312, prot: 3.4, hc: 41, grasa: 15 }, confidence: "media" },
    { name: "Salsa rara", query: "weird sauce", grams: 20, estimate: { kcal: null, prot: null, hc: null, grasa: null }, confidence: "baja" },
  ],
};

test("resolvePlate uses USDA values when found and the AI estimate otherwise", async () => {
  const calls = [];
  const lookup = async (q) => {
    calls.push(q);
    if (q === "chicken breast grilled") return { fdcId: 7, description: "Chicken, breast, grilled", per100: { kcal: 151, prot: 30, hc: 0, grasa: 3.2 } };
    if (q === "french fries") throw new Error("429");
    return null;
  };
  const r = await resolvePlate(plate, lookup);
  assert.deepEqual(calls, ["chicken breast grilled", "french fries", "weird sauce"]);
  assert.equal(r[0].source, "usda");
  assert.equal(r[0].sourceName, "Chicken, breast, grilled");
  assert.deepEqual(r[0].per100, { kcal: 151, prot: 30, hc: 0, grasa: 3.2 });
  assert.equal(r[1].source, "estimado");
  assert.deepEqual(r[1].per100, plate.items[1].estimate);
  assert.equal(r[2].source, "sin-datos");
});

test("entryFromItem scales to the chosen grams and records where values came from", () => {
  const item = { name: "Pechuga a la plancha", grams: 150, per100: { kcal: 151, prot: 30, hc: 0, grasa: 3.2 }, source: "usda", sourceName: "Chicken, breast, grilled", fdcId: 7 };
  const e = entryFromItem(item, 200, { date: "2026-10-19", meal: "cena" });
  assert.deepEqual(e, {
    date: "2026-10-19", meal: "cena", name: "Pechuga a la plancha", grams: 200,
    kcal: 302, prot: 60, hc: 0, grasa: 6.4, source: "foto",
    detail: { per100: item.per100, origin: "usda", originName: "Chicken, breast, grilled", fdcId: 7 },
  });
});

test("entryFromItem with no data stores zero kcal and keeps the item visible", () => {
  const e = entryFromItem({ name: "Salsa rara", grams: 20, per100: { kcal: null, prot: null, hc: null, grasa: null }, source: "sin-datos" }, 20, { date: "d", meal: "comida" });
  assert.equal(e.kcal, 0);
  assert.equal(e.prot, null);
  assert.equal(e.detail.origin, "sin-datos");
});
