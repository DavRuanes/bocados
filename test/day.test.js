import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MEALS, dateKey, scaleNutrients, sumEntries, mealTotals, dayStatus, nextMidnights, notificationText,
} from "../src/core/day.js";

test("meals are in the agreed order", () => {
  assert.deepEqual(MEALS.map((m) => m.id), ["desayuno", "comida", "merienda", "cena"]);
  assert.deepEqual(MEALS.map((m) => m.label), ["Desayuno", "Comida", "Merienda", "Cena"]);
});

test("dateKey uses local time, not UTC", () => {
  const d = new Date(2026, 9, 19, 23, 59, 30); // local 19 Oct 23:59
  assert.equal(dateKey(d), "2026-10-19");
  assert.equal(dateKey(new Date(2026, 0, 5, 0, 0, 1)), "2026-01-05");
});

test("scaleNutrients scales per-100 g values and keeps missing values null", () => {
  const r = scaleNutrients({ kcal: 110, prot: 23, hc: 0, grasa: 1.5, sal: null }, 150);
  assert.equal(r.kcal, 165);
  assert.equal(r.prot, 34.5);
  assert.equal(r.hc, 0);
  assert.equal(r.grasa, 2.25);
  assert.equal(r.sal, null);
});

test("scaleNutrients treats negative or non-numeric grams as zero", () => {
  assert.equal(scaleNutrients({ kcal: 100 }, -50).kcal, 0);
  assert.equal(scaleNutrients({ kcal: 100 }, "abc").kcal, 0);
});

const entries = [
  { meal: "desayuno", kcal: 310, prot: 12, hc: 40, grasa: 9 },
  { meal: "comida", kcal: 640, prot: 35, hc: 70, grasa: 20 },
  { meal: "comida", kcal: 95, prot: 0.5, hc: 25, grasa: 0.3 },
  { meal: "cena", kcal: 420, prot: 30, hc: 20, grasa: null },
];

test("sumEntries adds kcal and macros, treating null as zero", () => {
  const s = sumEntries(entries);
  assert.equal(s.kcal, 1465);
  assert.equal(s.prot, 77.5);
  assert.equal(s.hc, 155);
  assert.equal(s.grasa, 29.3);
});

test("mealTotals gives every meal a total, including empty ones", () => {
  const t = mealTotals(entries);
  assert.deepEqual(Object.keys(t), ["desayuno", "comida", "merienda", "cena"]);
  assert.equal(t.comida.kcal, 735);
  assert.equal(t.comida.count, 2);
  assert.equal(t.merienda.kcal, 0);
  assert.equal(t.merienda.count, 0);
});

test("dayStatus reports what is left and whether the limit is passed", () => {
  assert.deepEqual(dayStatus(1465, 2000), { eaten: 1465, target: 2000, remaining: 535, over: false, overBy: 0, ratio: 0.7325 });
  const o = dayStatus(2120, 2000);
  assert.equal(o.over, true);
  assert.equal(o.overBy, 120);
  assert.equal(o.remaining, 0);
});

test("eating exactly the limit is not over", () => {
  assert.equal(dayStatus(2000, 2000).over, false);
});

test("nextMidnights returns the coming local midnights in order", () => {
  const from = new Date(2026, 9, 19, 15, 0, 0);
  const m = nextMidnights(from, 3);
  assert.equal(m.length, 3);
  assert.deepEqual(m.map((d) => [d.getDate(), d.getHours(), d.getMinutes()]), [[20, 0, 0], [21, 0, 0], [22, 0, 0]]);
});

test("nextMidnights right at midnight starts with the following one", () => {
  const from = new Date(2026, 9, 20, 0, 0, 0);
  assert.equal(nextMidnights(from, 1)[0].getDate(), 21);
});

test("notificationText matches the agreed wording", () => {
  assert.deepEqual(notificationText(1850, 1720.4), {
    title: "Ya puedes ver tu día de calorías",
    body: "Límite: 1.850 kcal. Comidas: 1.720 kcal.",
  });
});
