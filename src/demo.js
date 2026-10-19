// Datos de ejemplo SOLO para la vista previa en el navegador (#demo...).
// Nunca se cargan en Android: main.js lo condiciona a repo.preview.
import { dailyTarget } from "./core/calc.js";
import { dateKey } from "./core/day.js";
import { mealScreen } from "./ui/screens/meal.js";
import { productScreen } from "./ui/screens/scan.js";
import { startOnboarding } from "./ui/screens/onboarding.js";

const PROFILE = { goal: "perder", sex: "mujer", age: 34, heightCm: 166, weightKg: 74.5, activity: "ligero", pace: "medio" };

export async function seedDemo(repo) {
  const calc = dailyTarget(PROFILE);
  await repo.saveProfile({ ...PROFILE, target: calc.target, calc, since: dateKey() });
  const today = dateKey();
  const day = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return dateKey(d); };
  const add = (date, meal, name, grams, per100, source, origin) => {
    const f = grams / 100;
    return repo.addEntry({
      date, meal, name, grams, kcal: Math.round(per100.kcal * f * 100) / 100,
      prot: per100.prot * f, hc: per100.hc * f, grasa: per100.grasa * f, source, detail: { per100, origin },
    });
  };
  await add(today, "desayuno", "Tostada de pan integral con tomate", 80, { kcal: 230, prot: 9, hc: 38, grasa: 4 }, "foto", "usda");
  await add(today, "desayuno", "Café con leche semidesnatada", 200, { kcal: 46, prot: 3.2, hc: 4.8, grasa: 1.5 }, "manual", "manual");
  await add(today, "comida", "Lentejas estofadas", 300, { kcal: 116, prot: 9, hc: 20, grasa: 0.4 }, "foto", "usda");
  await add(today, "comida", "Pechuga de pollo fileteada", 150, { kcal: 110, prot: 23, hc: 0, grasa: 1.5 }, "barcode", "barcode");
  await add(today, "comida", "Manzana", 180, { kcal: 52, prot: 0.3, hc: 14, grasa: 0.2 }, "foto", "usda");
  await add(today, "merienda", "Yogur natural", 125, { kcal: 61, prot: 3.4, hc: 4.7, grasa: 3.3 }, "etiqueta", "etiqueta");
  await add(day(1), "comida", "Macarrones con tomate", 320, { kcal: 150, prot: 5, hc: 26, grasa: 3 }, "foto", "estimado");
  await add(day(1), "cena", "Tortilla de patatas", 250, { kcal: 190, prot: 6.5, hc: 15, grasa: 11 }, "foto", "usda");
  await add(day(1), "merienda", "Galletas", 60, { kcal: 480, prot: 6, hc: 70, grasa: 20 }, "barcode", "barcode");
  await add(day(2), "comida", "Ensalada de garbanzos", 350, { kcal: 140, prot: 6, hc: 18, grasa: 5 }, "foto", "usda");
  await add(day(2), "cena", "Merluza a la plancha", 200, { kcal: 90, prot: 18, hc: 0, grasa: 1.5 }, "foto", "usda");
  for (const n of [1, 2]) await repo.setDayTarget(day(n), calc.target);
}

export async function openDemo(app, hash, root) {
  const today = dateKey();
  if (hash === "demo-historial") return app.setTab("historial");
  if (hash === "demo-perfil") return app.setTab("perfil");
  if (hash === "demo-comida") { await app.setTab("hoy"); return app.push(mealScreen(app, today, "comida")); }
  if (hash === "demo-producto") {
    await app.setTab("hoy");
    return app.push(productScreen(app, today, "cena", {
      name: "Pechuga de pollo fileteada", brand: "Ejemplo", code: "8410000000017", source: "barcode",
      per100: { kcal: 110, grasa: 1.5, sat: 0.4, hc: 0, azuc: 0, fibra: null, prot: 23, sal: 0.15 },
    }));
  }
  if (hash === "demo-pasado") {
    const p = app.profile;
    await app.repo.addEntry({ date: today, meal: "cena", name: "Pizza", grams: 400, kcal: 1100, prot: 40, hc: 120, grasa: 45, source: "manual", detail: { origin: "manual" } });
    app.profile = p;
    return app.setTab("hoy");
  }
  if (hash === "demo-bienvenida") return startOnboarding(app, root, { onDone: () => app.setTab("hoy") });
  return app.setTab("hoy");
}
