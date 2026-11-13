import { test } from "node:test";
import assert from "node:assert/strict";
import { metFor, burnedKcal } from "../src/core/exercise.js";
import { buildExport } from "../src/core/export.js";

test("MET values follow the Compendium for strength, soccer and walking", () => {
  assert.equal(metFor("Espalda", "baja"), 3.5);
  assert.equal(metFor("Pierna", "alta"), 6.0);
  assert.equal(metFor("Fútbol", "media"), 7.0);
  assert.equal(metFor("Fútbol", "alta"), 9.5);
  assert.equal(metFor("Caminar", "alta"), 5.0);
  assert.equal(metFor("Desconocido", "media"), 4.5);
});

test("burnedKcal is MET x kg x hours, rounded, and zero without data", () => {
  assert.equal(burnedKcal({ type: "Fútbol", intensity: "alta", minutes: 90 }, 92), 1311);
  assert.equal(burnedKcal({ type: "Espalda", intensity: "media", minutes: 60 }, 92), 460);
  assert.equal(burnedKcal({ type: "HIIT", intensity: "alta", minutes: 0 }, 92), 0);
  assert.equal(burnedKcal({ type: "HIIT", intensity: "alta", minutes: 20 }, null), 0);
});

test("buildExport writes meals, exercise, weight and sleep per day", () => {
  const txt = buildExport(
    { sex: "hombre", age: 21, heightCm: 182, weightKg: 92, target: 2400 },
    [{
      date: "2026-11-13", target: 2400,
      entries: [{ meal: "comida", name: "Lentejas", grams: 300, kcal: 351, prot: 27 }],
      workouts: [{ type: "Espalda", minutes: 60, intensity: "alta", notes: "Jalón 12x40" }],
      body: { weight: 91.6, sleep: 7 },
    }]);
  assert.match(txt, /hombre, 21 años, 182 cm, 92,0 kg\. Límite: 2\.400 kcal/);
  assert.match(txt, /Comido: 351 de 2\.400 kcal · Proteína 27 g/);
  assert.match(txt, /Comida: Lentejas \(300 g, 351 kcal, P 27 g\)/);
  assert.match(txt, /Ejercicio: Espalda, 60 min, intensidad alta, ~550 kcal estimadas · Jalón 12x40/);
  assert.match(txt, /Peso: 91,6 kg/);
  assert.match(txt, /Sueño: 7,0 h/);
});
