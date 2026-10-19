export const MEALS = [
  { id: "desayuno", label: "Desayuno" },
  { id: "comida", label: "Comida" },
  { id: "merienda", label: "Merienda" },
  { id: "cena", label: "Cena" },
];

const pad = (n) => String(n).padStart(2, "0");

export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function keyToDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const round2 = (n) => Math.round(n * 100) / 100;

export function scaleNutrients(per100, grams) {
  const g = Number(grams);
  const f = Number.isFinite(g) && g > 0 ? g / 100 : 0;
  const out = {};
  for (const [k, v] of Object.entries(per100 || {})) {
    out[k] = v === null || v === undefined || !Number.isFinite(Number(v)) ? null : round2(Number(v) * f);
  }
  return out;
}

const MACROS = ["kcal", "prot", "hc", "grasa"];

export function sumEntries(entries) {
  const s = { kcal: 0, prot: 0, hc: 0, grasa: 0 };
  for (const e of entries) for (const k of MACROS) s[k] += Number(e[k]) || 0;
  for (const k of MACROS) s[k] = round2(s[k]);
  return s;
}

export function mealTotals(entries) {
  const out = {};
  for (const m of MEALS) {
    const list = entries.filter((e) => e.meal === m.id);
    out[m.id] = { ...sumEntries(list), count: list.length };
  }
  return out;
}

export function dayStatus(eaten, target) {
  const e = Math.round(eaten);
  const over = e > target;
  return {
    eaten: e,
    target,
    remaining: Math.max(0, target - e),
    over,
    overBy: over ? e - target : 0,
    ratio: target > 0 ? e / target : 0,
  };
}

export function nextMidnights(from, n) {
  const out = [];
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1, 0, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    out.push(new Date(d.getFullYear(), d.getMonth(), d.getDate() + i, 0, 0, 0, 0));
  }
  return out;
}

// Agrupa miles con punto, también en números de cuatro cifras (1.850),
// que Intl es-ES deja sin separar.
export function formatInt(n) {
  const s = String(Math.round(Math.abs(n)));
  const grouped = s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return n < 0 ? `−${grouped}` : grouped;
}

export function formatDec(n, digits = 1) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return "—";
  const fixed = Number(n).toFixed(digits);
  const [int, dec] = fixed.split(".");
  return dec ? `${formatInt(Number(int))},${dec}` : formatInt(Number(int));
}

export function notificationText(target, eaten) {
  return {
    title: "Ya puedes ver tu día de calorías",
    body: `Límite: ${formatInt(target)} kcal. Comidas: ${formatInt(eaten)} kcal.`,
  };
}
