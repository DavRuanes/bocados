import { test } from "node:test";
import assert from "node:assert/strict";
import { bmr, tdee, dailyTarget, ACTIVITY, PACES, FLOORS } from "../src/core/calc.js";

test("bmr uses Mifflin-St Jeor for a man", () => {
  // 10*80 + 6.25*180 - 5*30 + 5 = 1780
  assert.equal(bmr({ sex: "hombre", weightKg: 80, heightCm: 180, age: 30 }), 1780);
});

test("bmr uses Mifflin-St Jeor for a woman", () => {
  // 10*65 + 6.25*165 - 5*30 - 161 = 1370.25
  assert.equal(bmr({ sex: "mujer", weightKg: 65, heightCm: 165, age: 30 }), 1370.25);
});

test("bmr rejects an unknown sex", () => {
  assert.throws(() => bmr({ sex: "x", weightKg: 65, heightCm: 165, age: 30 }), /sexo/);
});

test("activity factors match the published table", () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(ACTIVITY).map(([k, v]) => [k, v.factor])),
    { sedentario: 1.2, ligero: 1.375, moderado: 1.55, activo: 1.725, muy_activo: 1.9 }
  );
});

test("tdee multiplies bmr by the activity factor", () => {
  assert.equal(tdee(1780, "moderado"), 1780 * 1.55);
  assert.throws(() => tdee(1780, "sofa"), /actividad/);
});

test("paces and floors match the spec", () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(PACES).map(([k, v]) => [k, v.deficit])),
    { suave: 500, medio: 750, rapido: 1000 }
  );
  assert.deepEqual(FLOORS, { mujer: 1200, hombre: 1500 });
});

test("losing weight subtracts the pace deficit", () => {
  const r = dailyTarget({ sex: "hombre", weightKg: 80, heightCm: 180, age: 30, activity: "moderado", goal: "perder", pace: "medio" });
  assert.equal(r.bmr, 1780);
  assert.equal(r.tdee, 2759);
  assert.equal(r.deficit, 750);
  assert.equal(r.target, 2009);
  assert.equal(r.clampedToFloor, false);
});

test("losing weight never goes below the floor", () => {
  const r = dailyTarget({ sex: "mujer", weightKg: 65, heightCm: 165, age: 30, activity: "sedentario", goal: "perder", pace: "medio" });
  assert.equal(r.tdee, 1644);
  assert.equal(r.target, 1200);
  assert.equal(r.floor, 1200);
  assert.equal(r.clampedToFloor, true);
  assert.equal(r.deficit, 444);
});

test("when expenditure is already below the floor the target is the floor and the deficit is zero", () => {
  const r = dailyTarget({ sex: "mujer", weightKg: 40, heightCm: 145, age: 70, activity: "sedentario", goal: "perder", pace: "suave" });
  assert.ok(r.tdee < 1200);
  assert.equal(r.target, 1200);
  assert.equal(r.deficit, 0);
  assert.equal(r.clampedToFloor, true);
});

test("maintaining ignores pace and floor", () => {
  const r = dailyTarget({ sex: "mujer", weightKg: 40, heightCm: 145, age: 70, activity: "sedentario", goal: "mantener", pace: "rapido" });
  assert.equal(r.target, r.tdee);
  assert.equal(r.deficit, 0);
  assert.equal(r.clampedToFloor, false);
});

test("unknown goal or pace throws", () => {
  const base = { sex: "hombre", weightKg: 80, heightCm: 180, age: 30, activity: "moderado" };
  assert.throws(() => dailyTarget({ ...base, goal: "ganar", pace: "medio" }), /objetivo/);
  assert.throws(() => dailyTarget({ ...base, goal: "perder", pace: "turbo" }), /ritmo/);
});
