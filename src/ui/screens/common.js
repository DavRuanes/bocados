import { h, toast } from "../dom.js";
import { MEALS, dateKey, sumEntries, dayStatus, formatInt, formatDec } from "../../core/day.js";

export const mealById = (id) => MEALS.find((m) => m.id === id);
export const mealName = (id) => mealById(id).label.toLowerCase();
const ART = { desayuno: "el", comida: "la", merienda: "la", cena: "la" };
export const toMeal = (id) => `${ART[id] === "el" ? "al" : "a la"} ${mealName(id)}`;

export function sourcePill(entry) {
  const origin = entry.detail?.origin;
  if (entry.source === "barcode") return h("span", { class: "pill" }, "Código de barras");
  if (entry.source === "etiqueta") return h("span", { class: "pill" }, "Etiqueta");
  if (entry.source === "manual") return h("span", { class: "pill" }, "A mano");
  if (origin === "usda") return h("span", { class: "pill positive" }, "Base de datos");
  if (origin === "estimado") return h("span", { class: "pill warning" }, "Estimado");
  if (origin === "sin-datos") return h("span", { class: "pill negative" }, "Sin datos");
  return null;
}

// Después de añadir: reprograma la notificación de medianoche y avisa si se pasa del límite.
export async function afterAdd(app, date, meal, count = 1) {
  if (date === dateKey()) await app.reschedule();
  const entries = await app.repo.entriesForDate(date);
  const st = dayStatus(sumEntries(entries).kcal, await app.targetFor(date));
  const what = count === 1 ? "Añadido" : `${count} alimentos añadidos`;
  toast(st.over
    ? `${what} ${toMeal(meal)}. ${date === dateKey() ? "Hoy te has pasado de tu límite diario" : "Ese día te pasaste del límite"}.`
    : `${what} ${toMeal(meal)}.`);
}

// Tabla nutricional por 100 g y por la cantidad elegida.
const ROWS = [
  ["kcal", "Valor energético", "kcal", false],
  ["grasa", "Grasas", "g", false],
  ["sat", "de las cuales saturadas", "g", true],
  ["hc", "Hidratos de carbono", "g", false],
  ["azuc", "de los cuales azúcares", "g", true],
  ["fibra", "Fibra alimentaria", "g", false],
  ["prot", "Proteínas", "g", false],
  ["sal", "Sal", "g", false],
];

export function nutritionTable(per100, grams) {
  const g = Math.max(0, Number(grams) || 0);
  // La sal se lee en centésimas (0,15 g); el resto, en décimas.
  const fmt = (v, u, f, k) => (v === null || v === undefined ? "—" : `${u === "kcal" ? formatInt(v * f) : formatDec(v * f, k === "sal" ? 2 : 1)} ${u}`);
  return h("table", { class: "ntable" },
    h("thead", {}, h("tr", {}, h("th", {}, "Nutriente"), h("th", {}, "100 g"), h("th", {}, `${formatInt(g)} g`))),
    h("tbody", {},
      ROWS.filter(([k]) => k in per100).map(([k, label, u, sub]) =>
        h("tr", { class: [k === "kcal" ? "energy" : "", sub ? "sub" : ""].join(" ").trim() || false },
          h("td", {}, label),
          h("td", { class: "v" }, fmt(per100[k], u, 1, k)),
          h("td", { class: "v" }, fmt(per100[k], u, g / 100, k))))));
}

// Campo de gramos con atajos.
export function gramsField(id, value, onChange, presets = [50, 100, 150, 200, 250]) {
  const input = h("input", { id, type: "number", inputmode: "decimal", min: "0", step: "5", value: String(value) });
  const chips = h("div", { class: "chips" });
  const sync = () => {
    for (const c of chips.children) c.setAttribute("aria-pressed", String(Number(c.dataset.g) === Number(input.value)));
  };
  input.addEventListener("input", () => { sync(); onChange(Math.max(0, Number(input.value) || 0)); });
  for (const p of presets) {
    chips.append(h("button", { class: "chip", type: "button", dataset: { g: p }, onclick: () => { input.value = String(p); sync(); onChange(p); } }, `${p} g`));
  }
  sync();
  return h("div", { class: "field" },
    h("label", { for: id }, "Cantidad que vas a comer"),
    h("div", { class: "input with-unit" }, input, h("span", {}, "g")),
    chips);
}

export function errorPanel(message, retryLabel, onRetry) {
  return h("section", { class: "panel", role: "alert" },
    h("p", { class: "error" }, message),
    onRetry ? h("button", { class: "btn", type: "button", onclick: onRetry }, retryLabel) : null);
}

export function loadingPanel(text) {
  const label = h("span", {}, text);
  const node = h("section", { class: "panel", "aria-live": "polite" }, h("div", { class: "loading" }, h("span", { class: "spinner", "aria-hidden": "true" }), label));
  node.setText = (t) => { label.textContent = t; };
  return node;
}

export { formatInt, formatDec };
